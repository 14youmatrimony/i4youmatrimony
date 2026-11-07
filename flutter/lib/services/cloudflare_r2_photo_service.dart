import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Pure Cross-Platform Cloudflare R2 & Supabase Photo Upload Service
///
/// Operates seamlessly across Flutter Web, Android, and iOS:
/// - Zero dart:io File usage and zero external compression libraries (eliminates web crashes).
/// - Accepts Uint8List bytes extracted via await image.readAsBytes().
/// - Signs requests using AWS Signature Version 4 (HMAC-SHA256) in pure Dart.
/// - Uploads bytes directly to Cloudflare R2 via HTTP PUT with unique timestamped filenames:
///     - profile/${userId}_$timestamp.jpg
///     - family/${userId}_$timestamp.jpg
/// - Immediately upserts or updates Supabase profiles table (`profile_photo_url` & `family_photo_url`).
class CloudflareR2PhotoService {
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

  /// Uploads Uint8List bytes directly to Cloudflare R2 and persists permanent public URL
  /// into the Supabase `profiles` table (`profile_photo_url` or `family_photo_url`).
  ///
  /// Unique Filename Format:
  /// - Profile Photo: profile/${userId}_$timestamp.jpg
  /// - Family Photo: family/${userId}_$timestamp.jpg
  Future<String> uploadBytesAndPersist({
    required Uint8List bytes,
    required bool isProfilePhoto,
    String? customUserId,
  }) async {
    // 1. Validate image bytes
    if (bytes.isEmpty) {
      throw Exception('Selected image is empty.');
    }

    // 2. Resolve Authenticated User ID
    final supabase = Supabase.instance.client;
    final currentUserId = customUserId ?? supabase.auth.currentUser?.id;
    if (currentUserId == null || currentUserId.isEmpty) {
      throw Exception('User is not authenticated. Please log in before uploading.');
    }

    // 3. Construct unique timestamped filename
    // Exactly: profile/${userId}_$timestamp.jpg or family/${userId}_$timestamp.jpg
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final folder = isProfilePhoto ? 'profile' : 'family';
    final filePath = '$folder/${currentUserId}_$timestamp.jpg';
    const contentType = 'image/jpeg';

    // 4. Upload Uint8List bytes directly to Cloudflare R2 via AWS Signature V4 PUT
    await _uploadBytesToR2(
      bytes: bytes,
      filePath: filePath,
      contentType: contentType,
    );

    // 5. Construct Permanent R2 Public URL with Cache Busting (?v=$timestamp)
    final base = publicUrlBase.isNotEmpty ? publicUrlBase : '$endpoint/$bucketName';
    final permanentUrlWithCacheBust = '$base/$filePath?v=$timestamp';

    // 6. Immediately upsert or update Supabase profiles table for currentUser.id
    final targetColumn = isProfilePhoto ? 'profile_photo_url' : 'family_photo_url';
    final Map<String, dynamic> updatePayload = {
      targetColumn: permanentUrlWithCacheBust,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    };

    // Keep standard and avatar columns synchronized for backwards compatibility
    if (isProfilePhoto) {
      updatePayload['photo'] = permanentUrlWithCacheBust;
      updatePayload['photo_url'] = permanentUrlWithCacheBust;
      updatePayload['avatar_url'] = permanentUrlWithCacheBust;
    } else {
      updatePayload['family_photos'] = jsonEncode([permanentUrlWithCacheBust]);
    }

    try {
      final List<dynamic> updatedRows = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', currentUserId)
          .select();

      if (updatedRows.isEmpty) {
        // Upsert if profile row with id does not exist yet
        await supabase.from('profiles').upsert({
          'id': currentUserId,
          ...updatePayload,
        }).select();
      }
    } catch (e) {
      // Fallback: if custom column is missing in older database migrations, retry with standard photo columns
      if (e.toString().contains('column') || e.toString().contains('42703')) {
        final safePayload = Map<String, dynamic>.from(updatePayload);
        safePayload.remove(targetColumn);
        final List<dynamic> safeRows = await supabase
            .from('profiles')
            .update(safePayload)
            .eq('id', currentUserId)
            .select();

        if (safeRows.isEmpty) {
          await supabase.from('profiles').upsert({
            'id': currentUserId,
            ...safePayload,
          }).select();
        }
      } else {
        rethrow;
      }
    }

    return permanentUrlWithCacheBust;
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
  Future<void> _uploadBytesToR2({
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

    final canonicalUri = '/$bucketName/${filePath.split('/').map(Uri.encodeComponent).join('/')}';
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
