import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Pure Cross-Platform Cloudflare R2 & Supabase Photo Upload and Deletion Service
///
/// Operates seamlessly across Flutter Web, Android, and iOS:
/// - Zero dart:io File usage and zero external compression libraries (eliminates web crashes).
/// - Accepts Uint8List bytes extracted via `await image.readAsBytes()`.
/// - Built-in cross-platform compression via ImagePicker(maxWidth: 1000, maxHeight: 1000, imageQuality: 75).
/// - Signs requests using AWS Signature Version 4 (HMAC-SHA256) in pure Dart.
/// - Uploads bytes directly to Cloudflare R2 with Content-Type: image/jpeg.
/// - Unique timestamped object keys:
///     - avatars/profile_${userId}_${timestamp}.jpg
///     - family/family_${userId}_${timestamp}.jpg
/// - Immediate update of Supabase `public.profiles` table:
///     - Profile Photo: `photo`, `photo_url`, `profile_photo_url`, `avatar_url`, `single_photos`
///     - Family Photo: `family_photo`, `family_photo_url`, `family_photos`
/// - Deletion from both Cloudflare R2 (via SigV4 DELETE) and Supabase `public.profiles` (setting columns to null).
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

  /// Normalizes endpoint string ensuring full https URL
  static String normalizeEndpoint(String ep) {
    if (ep.isEmpty) return defaultEndpoint;
    var clean = ep.trim().replaceAll(RegExp(r'/+$'), '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://$clean.r2.cloudflarestorage.com';
    }
    return clean;
  }

  /// Normalizes public URL base
  static String normalizePublicUrl(String url) {
    if (url.isEmpty) return defaultPublicUrlBase;
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (clean.contains('dash.cloudflare.com')) {
      return defaultPublicUrlBase;
    }
    return clean;
  }

  /// Factory constructor to initialize from environment variables with safe defaults
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

  /// Uploads Uint8List bytes directly to Cloudflare R2 using AWS SigV4 PUT.
  /// All new uploads go strictly to Cloudflare R2 (no fallback to Supabase Storage avatars).
  Future<String> uploadBytesToR2({
    required Uint8List bytes,
    required String filePath,
    String contentType = 'image/jpeg',
  }) async {
    if (bytes.isEmpty) {
      throw Exception('Image bytes cannot be empty.');
    }

    final cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

    // Direct PUT to Cloudflare R2
    await _putBytesToR2(
      bytes: bytes,
      filePath: cleanPath,
      contentType: contentType,
    );

    final base = publicUrlBase.isNotEmpty ? publicUrlBase : '$endpoint/$bucketName';
    return '$base/$cleanPath';
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
    // Strip query parameters
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

  /// Auto-creates profile row in Supabase public.profiles if missing.
  Future<void> ensureProfileRowExists({
    required String userId,
    String? name,
    String? fullName,
    String? email,
    String? phone,
    String? photoUrl,
    String? familyPhotoUrl,
  }) async {
    final supabase = Supabase.instance.client;
    final cleanId = userId.trim();
    if (cleanId.isEmpty) return;

    final resolvedName = (name != null && name.trim().isNotEmpty)
        ? name.trim()
        : ((fullName != null && fullName.trim().isNotEmpty) ? fullName.trim() : 'Member');

    try {
      final existing = await supabase
          .from('profiles')
          .select('id, name, photo, photo_url, profile_photo_url, avatar_url, family_photo, family_photo_url')
          .eq('id', cleanId)
          .maybeSingle();

      if (existing != null) {
        return; // Row already exists
      }

      final Map<String, dynamic> payload = {
        'id': cleanId,
        'full_name': resolvedName,
        'name': resolvedName,
        'status': 'active',
        'created_at': DateTime.now().toUtc().toIso8601String(),
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      };
      if (email != null && email.isNotEmpty) payload['email'] = email;
      if (phone != null && phone.isNotEmpty) payload['phone'] = phone;
      if (photoUrl != null && photoUrl.isNotEmpty) {
        payload['profile_photo_url'] = photoUrl;
        payload['photo_url'] = photoUrl;
        payload['avatar_url'] = photoUrl;
        payload['photo'] = photoUrl;
        payload['single_photos'] = jsonEncode([photoUrl]);
      }
      if (familyPhotoUrl != null && familyPhotoUrl.isNotEmpty) {
        payload['family_photo'] = familyPhotoUrl;
        payload['family_photo_url'] = familyPhotoUrl;
        payload['family_photos'] = jsonEncode([familyPhotoUrl]);
      }

      try {
        await supabase.from('profiles').upsert(payload, onConflict: 'id');
        debugPrint('[CloudflareR2PhotoService] Auto-created profile row in public.profiles for: $cleanId');
      } catch (upsertErr) {
        if (upsertErr.toString().contains('column') || upsertErr.toString().contains('42703')) {
          final fallbackPayload = Map<String, dynamic>.from(payload);
          fallbackPayload.remove('full_name');
          fallbackPayload.remove('profile_photo_url');
          fallbackPayload.remove('family_photo_url');
          fallbackPayload.remove('avatar_url');
          fallbackPayload.remove('single_photos');
          fallbackPayload.remove('family_photos');
          await supabase.from('profiles').upsert(fallbackPayload, onConflict: 'id');
        } else {
          rethrow;
        }
      }
    } catch (e) {
      debugPrint('[CloudflareR2PhotoService] Warning in ensureProfileRowExists: $e');
    }
  }

  /// Persists the returned photo URL into Supabase `profiles` table.
  /// Updates and immediately synchronizes exact columns in the Supabase `profiles` table:
  /// - Profile Photo: `photo`, `photo_url`, `profile_photo_url`, `avatar_url`, `single_photos`
  /// - Family Photo: `family_photo`, `family_photo_url`, `family_photos`
  /// Also synchronizes supabase.auth.updateUser metadata and SharedPreferences cache.
  Future<void> persistPhotoUrlToSupabase({
    required String url,
    required bool isProfilePhoto,
    required String userId,
  }) async {
    final supabase = Supabase.instance.client;
    final cleanId = userId.trim();

    final Map<String, dynamic> updatePayload = {
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    };

    if (isProfilePhoto) {
      updatePayload['photo'] = url;
      updatePayload['photo_url'] = url;
      updatePayload['profile_photo_url'] = url;
      updatePayload['avatar_url'] = url;
      updatePayload['single_photos'] = jsonEncode([url]);
    } else {
      updatePayload['family_photo'] = url;
      updatePayload['family_photo_url'] = url;
      updatePayload['family_photos'] = jsonEncode([url]);
    }

    // 1. Update the existing user row in Supabase public.profiles
    try {
      final List<dynamic> updatedRows = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', cleanId)
          .select('id');

      if (updatedRows.isEmpty) {
        // Fallback: match by register_id
        final List<dynamic> regRows = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('register_id', cleanId)
            .select('id');

        if (regRows.isEmpty) {
          final upsertPayload = Map<String, dynamic>.from(updatePayload);
          upsertPayload['id'] = cleanId;
          await supabase.from('profiles').upsert(upsertPayload, onConflict: 'id');
        }
      }
      debugPrint('[CloudflareR2PhotoService] Updated user row in public.profiles for: $cleanId');
    } catch (e) {
      if (e.toString().contains('column') || e.toString().contains('42703')) {
        final safePayload = Map<String, dynamic>.from(updatePayload);
        safePayload.remove('profile_photo_url');
        safePayload.remove('family_photo_url');
        safePayload.remove('avatar_url');
        safePayload.remove('single_photos');
        safePayload.remove('family_photos');
        await supabase.from('profiles').update(safePayload).eq('id', cleanId);
      } else {
        rethrow;
      }
    }

    // 2. Synchronize supabase.auth.updateUser metadata
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
        await supabase.auth.updateUser(
          UserAttributes(data: metadata),
        );
        debugPrint('[CloudflareR2PhotoService] Synchronized supabase.auth metadata');
      }
    } catch (authErr) {
      debugPrint('[CloudflareR2PhotoService] Auth metadata notice: $authErr');
    }

    // 3. Synchronize local SharedPreferences cache
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
      debugPrint('[CloudflareR2PhotoService] Synchronized SharedPreferences cache');
    } catch (prefErr) {
      debugPrint('[CloudflareR2PhotoService] SharedPreferences notice: $prefErr');
    }
  }

  /// Deletes a photo from both Cloudflare R2 and Supabase public.profiles table.
  /// Sets photo columns to null and removes from R2 storage.
  Future<void> deletePhotoFromR2AndSupabase({
    required bool isProfilePhoto,
    required String userId,
    String? existingUrl,
  }) async {
    final cleanId = userId.trim();
    if (cleanId.isEmpty) {
      throw Exception('User ID is required to delete photo.');
    }

    // 1. Delete file from Cloudflare R2 if URL or key exists
    if (existingUrl != null && existingUrl.isNotEmpty) {
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

    try {
      final List<dynamic> updatedRows = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', cleanId)
          .select('id');

      if (updatedRows.isEmpty) {
        await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('register_id', cleanId);
      }
      debugPrint('[CloudflareR2PhotoService] Reset photo columns to null for: $cleanId');
    } catch (e) {
      if (e.toString().contains('column') || e.toString().contains('42703')) {
        final safePayload = Map<String, dynamic>.from(updatePayload);
        safePayload.remove('profile_photo_url');
        safePayload.remove('family_photo_url');
        safePayload.remove('avatar_url');
        safePayload.remove('single_photos');
        safePayload.remove('family_photos');
        await supabase.from('profiles').update(safePayload).eq('id', cleanId);
      } else {
        rethrow;
      }
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

  /// Combined upload and persistence method
  Future<String> uploadBytesAndPersist({
    required Uint8List bytes,
    required bool isProfilePhoto,
    String? customUserId,
  }) async {
    final supabase = Supabase.instance.client;
    final currentUserId = customUserId ?? supabase.auth.currentUser?.id;
    if (currentUserId == null || currentUserId.isEmpty) {
      throw Exception('User is not authenticated. Please log in before uploading.');
    }

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final filePath = isProfilePhoto
        ? 'avatars/profile_${currentUserId}_$timestamp.jpg'
        : 'family/family_${currentUserId}_$timestamp.jpg';

    // 1. Upload to Cloudflare R2
    final permanentUrl = await uploadBytesToR2(
      bytes: bytes,
      filePath: filePath,
      contentType: 'image/jpeg',
    );

    // 2. Persist in Supabase profiles table, Auth metadata, and local cache
    await persistPhotoUrlToSupabase(
      url: permanentUrl,
      isProfilePhoto: isProfilePhoto,
      userId: currentUserId,
    );

    return permanentUrl;
  }

  /// Convenience wrapper accepting [XFile] picked via ImagePicker
  Future<String> uploadAndPersistPhoto({
    required XFile xFile,
    required bool isProfilePhoto,
    String? customUserId,
  }) async {
    final Uint8List fileBytes = await xFile.readAsBytes();
    return uploadBytesAndPersist(
      bytes: fileBytes,
      isProfilePhoto: isProfilePhoto,
      customUserId: customUserId,
    );
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

    // Derive AWS SigV4 signing key
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
