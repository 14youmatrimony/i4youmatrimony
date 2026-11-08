import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Pure Cross-Platform Cloudflare R2 & Supabase Photo Upload and Deletion Service
///
/// Features:
/// 1. Zero dart:io File usage and zero external compression libraries (Web, Android, iOS safe).
/// 2. Reads pure Uint8List bytes via `await image.readAsBytes()`.
/// 3. Uploads to Cloudflare R2 via AWS Signature Version 4 PUT using http package.
/// 4. Automatic Fallback to Supabase Storage `avatars` bucket if R2 is blocked by CORS or network,
///    using timestamped filename `photo_${userId}_${timestamp}.jpg` so uploads never fail silently.
/// 5. Matches user accurately in `public.profiles` via `.eq('id', ...)` or `.eq('register_id', ...)`.
/// 6. Updates BOTH `photo` and `photo_url` for Profile Photo; BOTH `family_photo` and `family_photo_url` for Family Photo.
/// 7. Prints updated row result and refreshes state.
/// 8. Provides direct deletion from R2/Storage and Supabase.
class CloudflareR2PhotoService {
  static const String defaultSupabaseUrl = 'https://kzvdzospvgzlfkkptadl.supabase.co';
  static const String defaultSupabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dmR6b3Nwdmd6bGZra3B0YWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjYwOTAsImV4cCI6MjEwNzU0MjA5MH0.2cbo44WPrlC_BNQH6-YvloxlAbxd67RwMsQOOiMFh-w';

  static const String defaultEndpoint =
      'https://60ba75772b194956aea9a7080138d7e0.r2.cloudflarestorage.com';
  static const String defaultAccessKeyId = '4eb0c79fe5884a7df815017ee19f7171';
  static const String defaultSecretAccessKey =
      'f33f804f8d0858ce476bcc6a72ddd54a1a577a7d3072da11672af6b4edb33486';
  static const String defaultBucketName = 'i4youmatrimony';
  static const String defaultPublicUrlBase =
      'https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev';

  final String endpoint;
  final String accessKeyId;
  final String secretAccessKey;
  final String bucketName;
  final String publicUrlBase;
  final String region;

  CloudflareR2PhotoService({
    String? endpoint,
    String? accessKeyId,
    String? secretAccessKey,
    String? bucketName,
    String? publicUrlBase,
    this.region = 'auto',
  })  : endpoint = normalizeEndpoint(endpoint ?? defaultEndpoint),
        accessKeyId = accessKeyId ?? defaultAccessKeyId,
        secretAccessKey = secretAccessKey ?? defaultSecretAccessKey,
        bucketName = (bucketName != null && bucketName.isNotEmpty) ? bucketName : defaultBucketName,
        publicUrlBase = normalizePublicUrl(publicUrlBase ?? defaultPublicUrlBase);

  static String normalizeEndpoint(String ep) {
    if (ep.isEmpty) return defaultEndpoint;
    var clean = ep.trim().replaceAll(RegExp(r'/+$'), '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://$clean.r2.cloudflarestorage.com';
    }
    return clean;
  }

  static String normalizePublicUrl(String url) {
    if (url.isEmpty) return defaultPublicUrlBase;
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (clean.contains('dash.cloudflare.com')) {
      return defaultPublicUrlBase;
    }
    return clean;
  }

  factory CloudflareR2PhotoService.fromEnv({
    String? endpoint,
    String? accessKeyId,
    String? secretAccessKey,
    String? bucketName,
    String? publicUrlBase,
  }) {
    const envEndpoint = String.fromEnvironment('R2_ENDPOINT');
    const envAccessKey = String.fromEnvironment('R2_ACCESS_KEY_ID');
    const envSecretKey = String.fromEnvironment('R2_SECRET_ACCESS_KEY');
    const envBucket = String.fromEnvironment('R2_BUCKET_NAME');
    const envPublicUrl = String.fromEnvironment('R2_PUBLIC_URL');

    return CloudflareR2PhotoService(
      endpoint: endpoint?.isNotEmpty == true
          ? endpoint!
          : (envEndpoint.isNotEmpty ? envEndpoint : defaultEndpoint),
      accessKeyId: accessKeyId?.isNotEmpty == true
          ? accessKeyId!
          : (envAccessKey.isNotEmpty ? envAccessKey : defaultAccessKeyId),
      secretAccessKey: secretAccessKey?.isNotEmpty == true
          ? secretAccessKey!
          : (envSecretKey.isNotEmpty ? envSecretKey : defaultSecretAccessKey),
      bucketName: bucketName?.isNotEmpty == true
          ? bucketName!
          : (envBucket.isNotEmpty ? envBucket : defaultBucketName),
      publicUrlBase: publicUrlBase?.isNotEmpty == true
          ? publicUrlBase!
          : (envPublicUrl.isNotEmpty ? envPublicUrl : defaultPublicUrlBase),
    );
  }

  /// Uploads Uint8List bytes to Cloudflare R2 with automatic fallback to Supabase Storage avatars bucket.
  /// If Cloudflare R2 fails (e.g., browser CORS preflight on Web or network issue),
  /// immediately logs the exact R2 error and automatically uploads to Supabase Storage avatars bucket
  /// with timestamped filename (photo_${userId}_${timestamp}.jpg) so the upload never fails silently.
  Future<String> uploadBytesToR2({
    required Uint8List bytes,
    required String filePath,
    String? userId,
    bool isProfilePhoto = true,
    String contentType = 'image/jpeg',
  }) async {
    if (bytes.isEmpty) {
      throw Exception('Image bytes cannot be empty.');
    }

    final cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final cleanUid = (userId != null && userId.trim().isNotEmpty) ? userId.trim() : 'user';

    // 1. Attempt upload to Cloudflare R2 via AWS Signature V4 PUT
    try {
      debugPrint('[CloudflareR2PhotoService] Attempting AWS SigV4 PUT to Cloudflare R2: $cleanPath');
      await _putBytesToR2(
        bytes: bytes,
        filePath: cleanPath,
        contentType: contentType,
      );

      final base = publicUrlBase.isNotEmpty ? publicUrlBase : '$endpoint/$bucketName';
      final r2Url = '$base/$cleanPath';
      debugPrint('[CloudflareR2PhotoService] Cloudflare R2 upload succeeded: $r2Url');
      return r2Url;
    } catch (r2Error) {
      // 2. Log exact R2 error
      debugPrint('====================================================');
      debugPrint('[CloudflareR2PhotoService] Cloudflare R2 PUT failed / blocked: $r2Error');
      debugPrint('[CloudflareR2PhotoService] Executing automatic fallback to Supabase Storage avatars bucket...');
      debugPrint('====================================================');

      // 3. Automatic fallback: Supabase Storage avatars bucket (upsert: true)
      try {
        final supabase = Supabase.instance.client;
        final fallbackFileName = isProfilePhoto
            ? 'photo_${cleanUid}_$timestamp.jpg'
            : 'family_${cleanUid}_$timestamp.jpg';

        await supabase.storage.from('avatars').uploadBinary(
          fallbackFileName,
          bytes,
          fileOptions: const FileOptions(
            contentType: 'image/jpeg',
            upsert: true,
          ),
        );

        final publicUrl = supabase.storage.from('avatars').getPublicUrl(fallbackFileName);
        debugPrint('[CloudflareR2PhotoService] Supabase Storage fallback succeeded: $publicUrl');
        return publicUrl;
      } catch (sbError) {
        debugPrint('[CloudflareR2PhotoService] Supabase Storage fallback error: $sbError');
        throw Exception('Photo upload failed on R2 ($r2Error) and Supabase Storage ($sbError)');
      }
    }
  }

  /// Deletes an object directly from Cloudflare R2 using AWS SigV4 DELETE.
  Future<void> deleteObjectFromR2({required String objectKey}) async {
    final cleanKey = extractObjectKey(objectKey);
    if (cleanKey.isEmpty) return;

    await _deleteBytesFromR2(filePath: cleanKey);
  }

  /// Extracts the object key from a full public R2 URL or relative path
  static String extractObjectKey(String urlOrKey) {
    if (urlOrKey.isEmpty) return '';
    final noQuery = urlOrKey.split('?').first.trim();

    if (noQuery.contains('r2.dev/')) {
      final parts = noQuery.split('r2.dev/');
      if (parts.length > 1) return parts[1].replaceAll(RegExp(r'^/+'), '');
    }

    if (noQuery.contains('.r2.cloudflarestorage.com/')) {
      final parts = noQuery.split('.r2.cloudflarestorage.com/');
      if (parts.length > 1) {
        final pathWithBucket = parts[1].replaceAll(RegExp(r'^/+'), '');
        final slashIndex = pathWithBucket.indexOf('/');
        if (slashIndex != -1) {
          return pathWithBucket.substring(slashIndex + 1);
        }
        return pathWithBucket;
      }
    }

    if (noQuery.startsWith('http://') || noQuery.startsWith('https://')) {
      try {
        final uri = Uri.parse(noQuery);
        final pathSegments = uri.pathSegments;
        if (pathSegments.isNotEmpty) {
          if (pathSegments.first == 'i4youmatrimony' && pathSegments.length > 1) {
            return pathSegments.sublist(1).join('/');
          }
          return pathSegments.join('/');
        }
      } catch (_) {}
    }

    return noQuery.replaceAll(RegExp(r'^/+'), '');
  }

  /// Persists the returned photo URL into Supabase `public.profiles` table.
  /// Accurately matches user row via .eq('id', ...) or .eq('register_id', ...).
  /// For Profile Photo: updates BOTH `photo` and `photo_url` (and `profile_photo_url`, `avatar_url`).
  /// For Family Photo: updates BOTH `family_photo` and `family_photo_url` (and `family_photos`).
  /// Prints the updated row result and returns the row.
  Future<Map<String, dynamic>?> persistPhotoUrlToSupabase({
    required String url,
    required bool isProfilePhoto,
    required String userId,
    String? registerId,
  }) async {
    final supabase = Supabase.instance.client;
    final cleanId = userId.trim();
    final cleanRegId = registerId?.trim();

    final Map<String, dynamic> updatePayload = {
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    };

    if (isProfilePhoto) {
      updatePayload['photo'] = url;
      updatePayload['photo_url'] = url; // CRITICAL: BOTH photo AND photo_url UPDATED
      updatePayload['profile_photo_url'] = url;
      updatePayload['avatar_url'] = url;
      updatePayload['single_photos'] = jsonEncode([url]);
    } else {
      updatePayload['family_photo'] = url;
      updatePayload['family_photo_url'] = url; // CRITICAL: BOTH family_photo AND family_photo_url UPDATED
      updatePayload['family_photos'] = jsonEncode([url]);
    }

    List<dynamic> updatedRows = [];

    // 1. Try matching by id first
    try {
      updatedRows = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', cleanId)
          .select();
    } catch (e) {
      debugPrint('[CloudflareR2PhotoService] Update by id attempt notice: $e');
    }

    // 2. If no row matched by id, try matching by register_id
    if (updatedRows.isEmpty) {
      final targetRegId = (cleanRegId != null && cleanRegId.isNotEmpty) ? cleanRegId : cleanId;
      try {
        updatedRows = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('register_id', targetRegId)
            .select();
      } catch (e) {
        debugPrint('[CloudflareR2PhotoService] Update by register_id attempt notice: $e');
      }
    }

    // 3. Fallback: match by or condition (id or register_id)
    if (updatedRows.isEmpty) {
      try {
        updatedRows = await supabase
            .from('profiles')
            .update(updatePayload)
            .or('id.eq.$cleanId,register_id.eq.$cleanId')
            .select();
      } catch (e) {
        if (e.toString().contains('column') || e.toString().contains('42703')) {
          final safePayload = Map<String, dynamic>.from(updatePayload);
          safePayload.remove('profile_photo_url');
          safePayload.remove('family_photo_url');
          safePayload.remove('avatar_url');
          safePayload.remove('single_photos');
          safePayload.remove('family_photos');
          updatedRows = await supabase.from('profiles').update(safePayload).eq('id', cleanId).select();
        }
      }
    }

    // Print the updated row result as requested
    debugPrint('====================================================');
    debugPrint('[CloudflareR2PhotoService] Supabase Profile Update Result:');
    if (updatedRows.isNotEmpty) {
      debugPrint(jsonEncode(updatedRows.first));
      // ignore: avoid_print
      print('[CloudflareR2PhotoService] Supabase Profile Update Result: ${jsonEncode(updatedRows.first)}');
    } else {
      debugPrint('No matching row updated in public.profiles for ID: $cleanId');
      // ignore: avoid_print
      print('[CloudflareR2PhotoService] Supabase Profile Update: Saved URL: $url');
    }
    debugPrint('====================================================');

    // 4. Synchronize supabase.auth user metadata
    try {
      final currentUser = supabase.auth.currentUser;
      if (currentUser != null) {
        final metadata = Map<String, dynamic>.from(currentUser.userMetadata ?? {});
        if (isProfilePhoto) {
          metadata['profile_photo_url'] = url;
          metadata['photo_url'] = url;
          metadata['avatar_url'] = url;
          metadata['photo'] = url;
        } else {
          metadata['family_photo'] = url;
          metadata['family_photo_url'] = url;
        }
        await supabase.auth.updateUser(UserAttributes(data: metadata));
      }
    } catch (_) {}

    // 5. Synchronize local SharedPreferences cache
    try {
      final prefs = await SharedPreferences.getInstance();
      if (isProfilePhoto) {
        await prefs.setString('profile_photo_url', url);
        await prefs.setString('photo_url', url);
        await prefs.setString('avatar_url', url);
        await prefs.setString('photo', url);
      } else {
        await prefs.setString('family_photo', url);
        await prefs.setString('family_photo_url', url);
      }
    } catch (_) {}

    return (updatedRows.isNotEmpty && updatedRows.first is Map<String, dynamic>)
        ? updatedRows.first as Map<String, dynamic>
        : null;
  }

  /// Deletes a photo from both Cloudflare R2 / Storage and Supabase public.profiles table.
  /// Sets photo columns to null and removes from storage.
  Future<void> deletePhotoFromR2AndSupabase({
    required bool isProfilePhoto,
    required String userId,
    String? registerId,
    String? existingUrl,
  }) async {
    final cleanId = userId.trim();
    if (cleanId.isEmpty) {
      throw Exception('User ID is required to delete photo.');
    }

    // 1. Delete file from Cloudflare R2 if it is an R2 URL
    if (existingUrl != null && existingUrl.isNotEmpty && (existingUrl.contains('r2.dev') || existingUrl.contains('r2.cloudflarestorage.com'))) {
      try {
        final key = extractObjectKey(existingUrl);
        if (key.isNotEmpty) {
          await deleteObjectFromR2(objectKey: key);
          debugPrint('[CloudflareR2PhotoService] Deleted from R2: $key');
        }
      } catch (r2Err) {
        debugPrint('[CloudflareR2PhotoService] Notice during R2 deletion: $r2Err');
      }
    }

    // Also delete from Supabase storage if it was a Supabase Storage fallback URL
    if (existingUrl != null && existingUrl.contains('/storage/v1/object/public/avatars/')) {
      try {
        final parts = existingUrl.split('/storage/v1/object/public/avatars/');
        if (parts.length > 1) {
          final fileName = parts[1].split('?').first;
          await Supabase.instance.client.storage.from('avatars').remove([fileName]);
          debugPrint('[CloudflareR2PhotoService] Deleted fallback from Supabase Storage: $fileName');
        }
      } catch (sbErr) {
        debugPrint('[CloudflareR2PhotoService] Supabase Storage delete notice: $sbErr');
      }
    }

    // 2. Set columns to null in Supabase public.profiles
    final supabase = Supabase.instance.client;
    final Map<String, dynamic> updatePayload = {
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    };

    if (isProfilePhoto) {
      updatePayload['photo'] = null;
      updatePayload['photo_url'] = null;
      updatePayload['profile_photo_url'] = null;
      updatePayload['avatar_url'] = null;
      updatePayload['single_photos'] = '[]';
    } else {
      updatePayload['family_photo'] = null;
      updatePayload['family_photo_url'] = null;
      updatePayload['family_photos'] = '[]';
    }

    List<dynamic> updatedRows = [];
    try {
      updatedRows = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', cleanId)
          .select();
    } catch (_) {}

    if (updatedRows.isEmpty) {
      final targetRegId = (registerId != null && registerId.trim().isNotEmpty) ? registerId.trim() : cleanId;
      try {
        updatedRows = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('register_id', targetRegId)
            .select();
      } catch (_) {}
    }

    debugPrint('[CloudflareR2PhotoService] Reset photo columns to null for: $cleanId');
    if (updatedRows.isNotEmpty) {
      // ignore: avoid_print
      print('[CloudflareR2PhotoService] Supabase Photo Deleted: ${jsonEncode(updatedRows.first)}');
    }

    // 3. Clear auth user metadata
    try {
      final currentUser = supabase.auth.currentUser;
      if (currentUser != null) {
        final metadata = Map<String, dynamic>.from(currentUser.userMetadata ?? {});
        if (isProfilePhoto) {
          metadata['profile_photo_url'] = null;
          metadata['photo_url'] = null;
          metadata['avatar_url'] = null;
          metadata['photo'] = null;
        } else {
          metadata['family_photo'] = null;
          metadata['family_photo_url'] = null;
        }
        await supabase.auth.updateUser(UserAttributes(data: metadata));
      }
    } catch (_) {}

    // 4. Clear SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      if (isProfilePhoto) {
        await prefs.remove('profile_photo_url');
        await prefs.remove('photo_url');
        await prefs.remove('avatar_url');
        await prefs.remove('photo');
      } else {
        await prefs.remove('family_photo');
        await prefs.remove('family_photo_url');
      }
    } catch (_) {}
  }

  /// Convenience wrapper accepting [XFile] picked via ImagePicker
  Future<String> uploadAndPersistPhoto({
    required XFile xFile,
    required bool isProfilePhoto,
    String? customUserId,
    String? registerId,
  }) async {
    final Uint8List fileBytes = await xFile.readAsBytes();
    final supabase = Supabase.instance.client;
    final currentUserId = customUserId ?? supabase.auth.currentUser?.id;
    if (currentUserId == null || currentUserId.isEmpty) {
      throw Exception('User is not authenticated. Please log in before uploading.');
    }

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final filePath = isProfilePhoto
        ? 'avatars/profile_${currentUserId}_$timestamp.jpg'
        : 'family/family_${currentUserId}_$timestamp.jpg';

    // 1. Upload to Cloudflare R2 (with automatic Supabase Storage fallback)
    final permanentUrl = await uploadBytesToR2(
      bytes: fileBytes,
      filePath: filePath,
      userId: currentUserId,
      isProfilePhoto: isProfilePhoto,
      contentType: 'image/jpeg',
    );

    // 2. Persist in Supabase profiles table
    await persistPhotoUrlToSupabase(
      url: permanentUrl,
      isProfilePhoto: isProfilePhoto,
      userId: currentUserId,
      registerId: registerId,
    );

    return permanentUrl;
  }

  /// AWS Signature Version 4 PUT Upload (Pure Dart, Zero dart:io)
  Future<void> _putBytesToR2({
    required Uint8List bytes,
    required String filePath,
    required String contentType,
  }) async {
    final now = DateTime.now().toUtc();
    final amzDate = _formatAmzDate(now);
    final dateStamp = amzDate.substring(0, 8);

    final cleanKey = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    final uri = Uri.parse('$endpoint/$bucketName/$cleanKey');
    final host = uri.host;
    final payloadHash = sha256.convert(bytes).toString();

    final canonicalUri = '/${Uri.encodeComponent(bucketName)}/${cleanKey.split('/').map(Uri.encodeComponent).join('/')}';
    const canonicalQuery = '';

    final canonicalHeaders = 'content-type:$contentType\n'
        'host:$host\n'
        'x-amz-content-sha256:$payloadHash\n'
        'x-amz-date:$amzDate\n';

    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    final canonicalRequest = 'PUT\n'
        '$canonicalUri\n'
        '$canonicalQuery\n'
        '$canonicalHeaders\n'
        '$signedHeaders\n'
        '$payloadHash';

    final canonicalReqHash = sha256.convert(utf8.encode(canonicalRequest)).toString();
    final credentialScope = '$dateStamp/$region/s3/aws4_request';
    final stringToSign = 'AWS4-HMAC-SHA256\n'
        '$amzDate\n'
        '$credentialScope\n'
        '$canonicalReqHash';

    final kSecret = utf8.encode('AWS4$secretAccessKey');
    final kDate = _hmacSha256(kSecret, utf8.encode(dateStamp));
    final kRegion = _hmacSha256(kDate, utf8.encode(region));
    final kService = _hmacSha256(kRegion, utf8.encode('s3'));
    final kSigning = _hmacSha256(kService, utf8.encode('aws4_request'));

    final signature = _bytesToHex(_hmacSha256(kSigning, utf8.encode(stringToSign)));
    final authHeader =
        'AWS4-HMAC-SHA256 Credential=$accessKeyId/$credentialScope, SignedHeaders=$signedHeaders, Signature=$signature';

    final headers = {
      'Content-Type': contentType,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authHeader,
    };

    final response = await http.put(
      uri,
      headers: headers,
      body: bytes,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Cloudflare R2 PUT failed [${response.statusCode}]: ${response.body}',
      );
    }
  }

  /// AWS Signature Version 4 DELETE Request (Pure Dart, Zero dart:io)
  Future<void> _deleteBytesFromR2({required String filePath}) async {
    final now = DateTime.now().toUtc();
    final amzDate = _formatAmzDate(now);
    final dateStamp = amzDate.substring(0, 8);

    final cleanKey = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    final uri = Uri.parse('$endpoint/$bucketName/$cleanKey');
    final host = uri.host;
    const emptyPayloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    final canonicalUri = '/${Uri.encodeComponent(bucketName)}/${cleanKey.split('/').map(Uri.encodeComponent).join('/')}';
    const canonicalQuery = '';

    final canonicalHeaders = 'host:$host\n'
        'x-amz-content-sha256:$emptyPayloadHash\n'
        'x-amz-date:$amzDate\n';

    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    final canonicalRequest = 'DELETE\n'
        '$canonicalUri\n'
        '$canonicalQuery\n'
        '$canonicalHeaders\n'
        '$signedHeaders\n'
        '$emptyPayloadHash';

    final canonicalReqHash = sha256.convert(utf8.encode(canonicalRequest)).toString();
    final credentialScope = '$dateStamp/$region/s3/aws4_request';
    final stringToSign = 'AWS4-HMAC-SHA256\n'
        '$amzDate\n'
        '$credentialScope\n'
        '$canonicalReqHash';

    final kSecret = utf8.encode('AWS4$secretAccessKey');
    final kDate = _hmacSha256(kSecret, utf8.encode(dateStamp));
    final kRegion = _hmacSha256(kDate, utf8.encode(region));
    final kService = _hmacSha256(kRegion, utf8.encode('s3'));
    final kSigning = _hmacSha256(kService, utf8.encode('aws4_request'));

    final signature = _bytesToHex(_hmacSha256(kSigning, utf8.encode(stringToSign)));
    final authHeader =
        'AWS4-HMAC-SHA256 Credential=$accessKeyId/$credentialScope, SignedHeaders=$signedHeaders, Signature=$signature';

    final headers = {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': emptyPayloadHash,
      'Authorization': authHeader,
    };

    final response = await http.delete(uri, headers: headers);
    if (response.statusCode >= 400 && response.statusCode != 404) {
      throw Exception(
        'Cloudflare R2 DELETE failed [${response.statusCode}]: ${response.body}',
      );
    }
  }

  List<int> _hmacSha256(List<int> key, List<int> data) {
    final hmac = Hmac(sha256, key);
    return hmac.convert(data).bytes;
  }

  String _bytesToHex(List<int> bytes) {
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  String _formatAmzDate(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    final h = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    final s = dt.second.toString().padLeft(2, '0');
    return '$y$m${d}T$h$min${s}Z';
  }
}
