import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Pure Cross-Platform Cloudflare R2 & Supabase Photo Upload Service
///
/// Operates seamlessly across Flutter Web, Android, and iOS:
/// - Zero dart:io File usage and zero external compression libraries (eliminates web crashes).
/// - Accepts Uint8List bytes extracted via await image.readAsBytes().
/// - Signs requests using AWS Signature Version 4 (HMAC-SHA256) in pure Dart.
/// - Uploads bytes directly to Cloudflare R2 via HTTP PUT with unique timestamped filenames:
///     - profile_${userId}_$timestamp.jpg
///     - family_${userId}_$timestamp.jpg
/// - Immediately updates/upserts exact columns in the Supabase `profiles` table:
///     - Profile Photo: `profile_photo_url`, `photo_url`, `avatar_url`, `photo`
///     - Family Photo: `family_photo_url`, `family_photos`
/// - Auto-creates profile row in public.profiles (id, user_id, full_name, name) if missing
class CloudflareR2PhotoService {
  static const String defaultSupabaseUrl = 'https://kzvdzospvgzlfkkptadl.supabase.co';
  static const String defaultSupabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dmR6b3Nwdmd6bGZra3B0YWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjYwOTAsImV4cCI6MjEwNzU0MjA5MH0.2cbo44WPrlC_BNQH6-YvloxlAbxd67RwMsQOOiMFh-w';

  static String normalizeSupabaseUrl(String url) {
    if (url.isEmpty) return defaultSupabaseUrl;
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    final match = RegExp(r'supabase\.com/dashboard/project/([a-z0-9]+)', caseSensitive: false).firstMatch(clean);
    if (match != null && match.group(1) != null) {
      return 'https://${match.group(1)}.supabase.co';
    }
    return clean;
  }

  static const String defaultEndpoint =
      'https://60ba75772b194956aea9a7080138d7e0.r2.cloudflarestorage.com';
  static const String defaultAccessKeyId = '962068b554d3ca1ea4dd357be61b8a8f';
  static const String defaultSecretAccessKey =
      'dd38384133faf467c2e121879bf8e4216756f49f56b4ff66661804a75a956fbd';
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
  })  : endpoint = (endpoint ?? defaultEndpoint).replaceAll(RegExp(r'/+$'), ''),
        accessKeyId = accessKeyId ?? defaultAccessKeyId,
        secretAccessKey = secretAccessKey ?? defaultSecretAccessKey,
        bucketName = bucketName ?? defaultBucketName,
        publicUrlBase = (publicUrlBase ?? defaultPublicUrlBase).replaceAll(RegExp(r'/+$'), '');

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
      endpoint: (endpoint?.isNotEmpty == true
              ? endpoint!
              : (envEndpoint.isNotEmpty ? envEndpoint : defaultEndpoint))
          .replaceAll(RegExp(r'/+$'), ''),
      accessKeyId: accessKeyId?.isNotEmpty == true
          ? accessKeyId!
          : (envAccessKey.isNotEmpty ? envAccessKey : defaultAccessKeyId),
      secretAccessKey: secretAccessKey?.isNotEmpty == true
          ? secretAccessKey!
          : (envSecretKey.isNotEmpty ? envSecretKey : defaultSecretAccessKey),
      bucketName: bucketName?.isNotEmpty == true
          ? bucketName!
          : (envBucket.isNotEmpty ? envBucket : defaultBucketName),
      publicUrlBase: (publicUrlBase?.isNotEmpty == true
              ? publicUrlBase!
              : (envPublicUrl.isNotEmpty ? envPublicUrl : defaultPublicUrlBase))
          .replaceAll(RegExp(r'/+$'), ''),
    );
  }

  /// Uploads Uint8List bytes directly to Cloudflare R2 using AWS SigV4 PUT.
  /// Includes smart fallback to Supabase Storage if browser CORS blocks direct R2 PUT.
  Future<String> uploadBytesToR2({
    required Uint8List bytes,
    required String filePath,
    String contentType = 'image/jpeg',
  }) async {
    if (bytes.isEmpty) {
      throw Exception('Image bytes cannot be empty.');
    }

    final timestamp = DateTime.now().millisecondsSinceEpoch;

    try {
      await _putBytesToR2(
        bytes: bytes,
        filePath: filePath,
        contentType: contentType,
      );

      final base = publicUrlBase.isNotEmpty ? publicUrlBase : '$endpoint/$bucketName';
      return '$base/$filePath?v=$timestamp';
    } catch (r2Error) {
      debugPrint('[CloudflareR2PhotoService] Direct R2 PUT noticed issue: $r2Error. Attempting Supabase Storage fallback...');

      // Smart fallback: If R2 fails (e.g. CORS preflight block on Web), upload to Supabase avatars bucket
      try {
        final supabase = Supabase.instance.client;
        await supabase.storage.from('avatars').uploadBinary(
          filePath,
          bytes,
          fileOptions: FileOptions(
            contentType: contentType,
            upsert: true,
          ),
        );

        final publicUrl = supabase.storage.from('avatars').getPublicUrl(filePath);
        if (publicUrl.isNotEmpty) {
          debugPrint('[CloudflareR2PhotoService] Supabase Storage fallback succeeded: $publicUrl');
          return '$publicUrl?v=$timestamp';
        }
      } catch (fallbackError) {
        debugPrint('[CloudflareR2PhotoService] Supabase Storage fallback failed as well: $fallbackError');
      }

      // If both fail, rethrow original R2 error so caller receives actionable feedback
      rethrow;
    }
  }

  /// Auto-creates profile row in Supabase public.profiles if missing.
  /// Ensures the table is never empty whenever a user logs in, signs up, or opens the Profile page.
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
      // 1. Check if row exists in public.profiles
      final existing = await supabase
          .from('profiles')
          .select('id, user_id, full_name, name, profile_photo_url, photo_url, avatar_url, family_photo_url')
          .or('id.eq.$cleanId,user_id.eq.$cleanId')
          .maybeSingle();

      if (existing != null) {
        return; // Row already exists!
      }

      // 2. Automatically upsert into public.profiles (id, user_id, full_name, name)
      final Map<String, dynamic> payload = {
        'id': cleanId,
        'user_id': cleanId,
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
      }
      if (familyPhotoUrl != null && familyPhotoUrl.isNotEmpty) {
        payload['family_photo_url'] = familyPhotoUrl;
        payload['family_photos'] = jsonEncode([familyPhotoUrl]);
      }

      try {
        await supabase.from('profiles').upsert(payload, onConflict: 'id');
        debugPrint('[CloudflareR2PhotoService] Auto-created profile row in public.profiles for: $cleanId');
      } catch (upsertErr) {
        if (upsertErr.toString().contains('column') || upsertErr.toString().contains('42703')) {
          final fallbackPayload = Map<String, dynamic>.from(payload);
          fallbackPayload.remove('user_id');
          fallbackPayload.remove('full_name');
          fallbackPayload.remove('profile_photo_url');
          fallbackPayload.remove('family_photo_url');
          fallbackPayload.remove('avatar_url');
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
  /// - Profile Photo: `profile_photo_url`, `photo_url`, `avatar_url`, `photo`
  /// - Family Photo: `family_photo_url`, `family_photos`
  /// Also synchronizes supabase.auth.updateUser metadata and SharedPreferences cache.
  Future<void> persistPhotoUrlToSupabase({
    required String url,
    required bool isProfilePhoto,
    required String userId,
  }) async {
    final supabase = Supabase.instance.client;
    final cleanId = userId.trim();

    final targetColumn = isProfilePhoto ? 'profile_photo_url' : 'family_photo_url';
    final Map<String, dynamic> updatePayload = {
      'id': cleanId,
      'user_id': cleanId,
      targetColumn: url,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    };

    // Mirror to standard photo columns across all screens
    if (isProfilePhoto) {
      updatePayload['photo'] = url;
      updatePayload['photo_url'] = url;
      updatePayload['avatar_url'] = url;
      updatePayload['profile_photo_url'] = url;
    } else {
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
        final List<dynamic> altUpdatedRows = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('user_id', cleanId)
            .select('id');

        if (altUpdatedRows.isEmpty) {
          // If no row existed, perform upsert to guarantee persistence
          await supabase.from('profiles').upsert(updatePayload, onConflict: 'id');
        }
      }
      debugPrint('[CloudflareR2PhotoService] Updated existing user row in public.profiles for: $cleanId');
    } catch (e) {
      // If error indicates column does not exist (PostgreSQL code 42703), retry with fallback payload
      if (e.toString().contains('column') || e.toString().contains('42703')) {
        final safePayload = Map<String, dynamic>.from(updatePayload);
        safePayload.remove('user_id');
        safePayload.remove('profile_photo_url');
        safePayload.remove('family_photo_url');
        safePayload.remove('avatar_url');
        await supabase.from('profiles').upsert(safePayload, onConflict: 'id');
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
          metadata['family_photo_url'] = url;
        }
        await supabase.auth.updateUser(
          UserAttributes(data: metadata),
        );
        debugPrint('[CloudflareR2PhotoService] Updated supabase.auth.updateUser metadata successfully');
      }
    } catch (authErr) {
      debugPrint('[CloudflareR2PhotoService] Auth metadata sync warning: $authErr');
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
        await prefs.setString('family_photo_url', url);
      }
      debugPrint('[CloudflareR2PhotoService] Updated SharedPreferences cache with new URL');
    } catch (prefErr) {
      debugPrint('[CloudflareR2PhotoService] SharedPreferences cache warning: $prefErr');
    }
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
        ? 'profile_${currentUserId}_$timestamp.jpg'
        : 'family_${currentUserId}_$timestamp.jpg';

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

    final uri = Uri.parse('$endpoint/$bucketName/$filePath');
    final host = uri.host;
    final payloadHash = sha256.convert(bytes).toString();

    final canonicalUri = '/${Uri.encodeComponent(bucketName)}/${filePath.split('/').map(Uri.encodeComponent).join('/')}';
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
