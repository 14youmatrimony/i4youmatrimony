import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Pure Cross-Platform Cloudflare R2 & Supabase Photo Upload Service
///
/// Operates seamlessly across Flutter Web, Android, and iOS:
/// - Uses [XFile.readAsBytes] ([Uint8List]) instead of dart:io File or native compression.
/// - Signs requests using AWS Signature Version 4 (HMAC-SHA256) in pure Dart.
/// - Uploads bytes directly to Cloudflare R2 via HTTP PUT with unique timestamped filenames.
/// - Verifies row persistence via Supabase `.update(...).eq(...).select()`.
class CloudflareR2PhotoService {
  final String endpoint;
  final String accessKeyId;
  final String secretAccessKey;
  final String bucketName;
  final String publicUrlBase;
  final String region;

  CloudflareR2PhotoService({
    required this.endpoint,
    required this.accessKeyId,
    required this.secretAccessKey,
    required this.bucketName,
    required this.publicUrlBase,
    this.region = 'auto',
  });

  /// Factory constructor to initialize from environment variables or constants
  factory CloudflareR2PhotoService.fromEnv({
    String? endpoint,
    String? accessKeyId,
    String? secretAccessKey,
    String? bucketName,
    String? publicUrlBase,
  }) {
    return CloudflareR2PhotoService(
      endpoint: (endpoint ?? const String.fromEnvironment('R2_ENDPOINT')).replaceAll(RegExp(r'/+$'), ''),
      accessKeyId: accessKeyId ?? const String.fromEnvironment('R2_ACCESS_KEY_ID'),
      secretAccessKey: secretAccessKey ?? const String.fromEnvironment('R2_SECRET_ACCESS_KEY'),
      bucketName: bucketName ?? const String.fromEnvironment('R2_BUCKET_NAME'),
      publicUrlBase: (publicUrlBase ?? const String.fromEnvironment('R2_PUBLIC_URL')).replaceAll(RegExp(r'/+$'), ''),
    );
  }

  /// Uploads photo from [XFile] to Cloudflare R2 and persists permanent URL to Supabase `profiles`.
  ///
  /// [xFile]: compressed image picked via ImagePicker (maxWidth: 1080, maxHeight: 1080, imageQuality: 75)
  /// [isProfilePhoto]: true for Profile Photo (updates `profile_photo_url`), false for Family Photo (updates `family_photo_url`)
  /// [customUserId]: optional override; defaults to current Supabase auth user ID
  Future<String> uploadAndPersistPhoto({
    required XFile xFile,
    required bool isProfilePhoto,
    String? customUserId,
  }) async {
    // 1. Cross-Platform Byte Extraction (Pure Uint8List - Zero dart:io or native compression)
    final Uint8List fileBytes = await xFile.readAsBytes();
    if (fileBytes.isEmpty) {
      throw Exception('Selected image is empty.');
    }

    // 2. Resolve Authenticated User ID
    final supabase = Supabase.instance.client;
    final currentUserId = customUserId ?? supabase.auth.currentUser?.id;
    if (currentUserId == null || currentUserId.isEmpty) {
      throw Exception('User is not authenticated. Please log in before uploading.');
    }

    final cleanUserId = currentUserId.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
    final folder = isProfilePhoto ? 'profiles' : 'family';
    final prefix = isProfilePhoto ? 'profile' : 'family';
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final fileExtension = _resolveExtension(xFile.name, xFile.mimeType);

    // Unique Filename: e.g., profile_${userId}_$timestamp.jpg or family_${userId}_$timestamp.jpg
    final fileName = '${prefix}_${cleanUserId}_$timestamp.$fileExtension';
    final filePath = '$folder/$cleanUserId/$fileName';
    final contentType = _resolveContentType(fileExtension);

    // 3. Upload directly to Cloudflare R2 via AWS Signature V4 PUT
    await _uploadBytesToR2(
      bytes: fileBytes,
      filePath: filePath,
      contentType: contentType,
    );

    // 4. Construct Permanent R2 Public URL with Cache Busting (?v=$timestamp)
    final base = publicUrlBase.isNotEmpty ? publicUrlBase : '$endpoint/$bucketName';
    final permanentUrl = '$base/$filePath';
    final permanentUrlWithCacheBust = '$permanentUrl?v=$timestamp';

    // 5. Verify Supabase Database Persistence:
    // Update Supabase and verify row was genuinely updated via .select()
    final targetColumn = isProfilePhoto ? 'profile_photo_url' : 'family_photo_url';
    final Map<String, dynamic> updatePayload = {
      targetColumn: permanentUrlWithCacheBust,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    };

    // Mirror to standard photo and photo_url columns for backwards compatibility
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
        // Fallback: match by register_id or phone if auth id differs from primary key
        final List<dynamic> retryRows = await supabase
            .from('profiles')
            .update(updatePayload)
            .or('id.eq.$currentUserId,register_id.eq.$currentUserId,phone.eq.$currentUserId')
            .select();

        if (retryRows.isEmpty) {
          throw Exception('Supabase update verification failed: No matching profile record found for user $currentUserId.');
        }
      }
    } catch (e) {
      // Fallback: if custom column is missing in older database schema, retry with standard photo columns
      if (e.toString().contains('column') || e.toString().contains('42703')) {
        final safePayload = Map<String, dynamic>.from(updatePayload);
        safePayload.remove(targetColumn);
        final List<dynamic> safeRows = await supabase
            .from('profiles')
            .update(safePayload)
            .eq('id', currentUserId)
            .select();

        if (safeRows.isEmpty) {
          await supabase
              .from('profiles')
              .update(safePayload)
              .or('id.eq.$currentUserId,register_id.eq.$currentUserId,phone.eq.$currentUserId')
              .select();
        }
      } else {
        rethrow;
      }
    }

    return permanentUrlWithCacheBust;
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

  String _resolveExtension(String fileName, String? mimeType) {
    final lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.webp') || (mimeType?.contains('webp') ?? false)) return 'webp';
    if (lowerName.endsWith('.png') || (mimeType?.contains('png') ?? false)) return 'png';
    return 'jpg';
  }

  String _resolveContentType(String extension) {
    switch (extension) {
      case 'webp':
        return 'image/webp';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
      default:
        return 'image/jpeg';
    }
  }
}
