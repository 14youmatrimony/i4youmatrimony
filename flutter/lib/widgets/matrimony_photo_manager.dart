import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/cloudflare_r2_photo_service.dart';

/// State-Preserving Photo Manager for Profile Photo and Family Photo
///
/// Features:
/// 1. Built-in cross-platform compression via ImagePicker(maxWidth: 1000, maxHeight: 1000, imageQuality: 75).
/// 2. Reads pure Uint8List bytes via `await image.readAsBytes()` (Zero dart:io File usage; safe for Web, Android, iOS).
/// 3. Direct upload of Uint8List bytes to Cloudflare R2 with unique keys:
///     - avatars/profile_${userId}_${timestamp}.jpg
///     - family/family_${userId}_${timestamp}.jpg
/// 4. Immediate update of exact columns in Supabase `public.profiles` table:
///     - Profile Photo: `photo`, `photo_url`, `profile_photo_url`, `avatar_url`, `single_photos`
///     - Family Photo: `family_photo`, `family_photo_url`, `family_photos`
/// 5. Deletion Option: Dedicated Delete button for both Profile Photo and Family Photo:
///     - Removes object from Cloudflare R2 via SigV4 DELETE.
///     - Sets `photo: null, photo_url: null` (or `family_photo: null, family_photo_url: null`) in Supabase.
/// 6. Synchronizes `supabase.auth.updateUser` metadata and local SharedPreferences / Provider cache.
/// 7. Updates UI state only AFTER Supabase database update succeeds.
/// 8. On page refresh, always fetches the latest row from Supabase `public.profiles` and locks UI cache with `ValueKey`.
class MatrimonyPhotoManager extends StatefulWidget {
  final CloudflareR2PhotoService? r2Service;
  final String? customUserId;
  final VoidCallback? onPhotosUpdated;
  final void Function(String photoUrl, bool isProfilePhoto)? onPhotoCached;

  const MatrimonyPhotoManager({
    super.key,
    this.r2Service,
    this.customUserId,
    this.onPhotosUpdated,
    this.onPhotoCached,
  });

  @override
  State<MatrimonyPhotoManager> createState() => _MatrimonyPhotoManagerState();
}

class _MatrimonyPhotoManagerState extends State<MatrimonyPhotoManager> {
  final ImagePicker _picker = ImagePicker();
  late final CloudflareR2PhotoService _r2Service;
  StreamSubscription<AuthState>? _authSubscription;

  String? _profilePhotoUrl;
  String? _familyPhotoUrl;

  bool _isLoading = true;
  bool _isUploadingProfile = false;
  bool _isUploadingFamily = false;
  bool _isDeletingProfile = false;
  bool _isDeletingFamily = false;
  String? _errorMessage;
  String? _resolvedUserId;

  @override
  void initState() {
    super.initState();
    _r2Service = widget.r2Service ?? CloudflareR2PhotoService();

    // Listen for auth state changes
    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      if (data.session?.user != null && (_profilePhotoUrl == null && _familyPhotoUrl == null)) {
        _loadPhotosFromSupabase();
      }
    });

    // Hydrate photo URLs directly from Supabase profiles table on initState
    _loadPhotosFromSupabase();
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  /// Resolves the user ID safely across sessions, preferences, and database profiles
  Future<String?> _resolveUserId() async {
    // 1. Explicit user ID passed via widget
    if (widget.customUserId != null && widget.customUserId!.trim().isNotEmpty) {
      return widget.customUserId!.trim();
    }

    final supabase = Supabase.instance.client;

    // 2. Check if currentUser or currentSession is already available
    if (supabase.auth.currentUser?.id != null && supabase.auth.currentUser!.id.isNotEmpty) {
      return supabase.auth.currentUser!.id;
    }
    if (supabase.auth.currentSession?.user.id != null && supabase.auth.currentSession!.user.id.isNotEmpty) {
      return supabase.auth.currentSession!.user.id;
    }

    // 3. Check SharedPreferences for stored user ID
    try {
      final prefs = await SharedPreferences.getInstance();
      final storedId = prefs.getString('user_id') ?? prefs.getString('cached_user_id') ?? prefs.getString('id');
      if (storedId != null && storedId.trim().isNotEmpty) {
        return storedId.trim();
      }
    } catch (_) {}

    // 4. Fallback: query public.profiles to pick an existing active profile
    try {
      final dynamic firstProfile = await supabase
          .from('profiles')
          .select('id, register_id')
          .limit(1)
          .maybeSingle();

      if (firstProfile != null && firstProfile['id'] != null) {
        return firstProfile['id'].toString();
      }
    } catch (_) {}

    return null;
  }

  /// Always loads `profile_photo_url` and `family_photo_url` from Supabase on initState
  /// Ensures refreshing the page never loses the photos
  Future<void> _loadPhotosFromSupabase() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final userId = await _resolveUserId();
      _resolvedUserId = userId;

      if (userId == null || userId.isEmpty) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = 'No user session or profile record found. Please verify your connection.';
          });
        }
        return;
      }

      final supabase = Supabase.instance.client;

      // Auto-create profile row in public.profiles if not present
      await _r2Service.ensureProfileRowExists(
        userId: userId,
        name: supabase.auth.currentUser?.userMetadata?['name']?.toString() ??
              supabase.auth.currentUser?.userMetadata?['full_name']?.toString() ??
              'Member',
      );

      // Query profiles table for all recognized photo columns directly from Supabase
      // Note: do not select non-existent column user_id
      dynamic response = await supabase
          .from('profiles')
          .select('id, register_id, name, photo, photo_url, profile_photo_url, avatar_url, family_photo, family_photo_url, family_photos')
          .eq('id', userId)
          .maybeSingle();

      if (response == null) {
        // Fallback by register_id
        response = await supabase
            .from('profiles')
            .select('id, register_id, name, photo, photo_url, profile_photo_url, avatar_url, family_photo, family_photo_url, family_photos')
            .eq('register_id', userId)
            .maybeSingle();
      }

      if (response != null && mounted) {
        // 1. Resolve Profile Photo (prioritizes photo, then photo_url, profile_photo_url, avatar_url)
        final profilePhoto = response['photo'] ??
            response['photo_url'] ??
            response['profile_photo_url'] ??
            response['avatar_url'];

        // 2. Resolve Family Photo (prioritizes family_photo, then family_photo_url, family_photos)
        String? familyPhoto = response['family_photo']?.toString();
        if (familyPhoto == null || familyPhoto.trim().isEmpty) {
          familyPhoto = response['family_photo_url']?.toString();
        }
        if (familyPhoto == null || familyPhoto.trim().isEmpty) {
          final rawFamily = response['family_photos'];
          if (rawFamily != null) {
            if (rawFamily is List && rawFamily.isNotEmpty) {
              familyPhoto = rawFamily[0]?.toString();
            } else if (rawFamily is String && rawFamily.trim().isNotEmpty) {
              try {
                final decoded = jsonDecode(rawFamily);
                if (decoded is List && decoded.isNotEmpty) {
                  familyPhoto = decoded[0]?.toString();
                } else {
                  familyPhoto = rawFamily;
                }
              } catch (_) {
                familyPhoto = rawFamily;
              }
            }
          }
        }

        // Evict previous cached images so old photos never persist on refresh
        PaintingBinding.instance.imageCache.clear();
        PaintingBinding.instance.imageCache.clearLiveImages();

        setState(() {
          _profilePhotoUrl = (profilePhoto != null && profilePhoto.toString().trim().isNotEmpty)
              ? profilePhoto.toString().trim()
              : null;
          _familyPhotoUrl = (familyPhoto != null && familyPhoto.trim().isNotEmpty)
              ? familyPhoto.trim()
              : null;
        });
      }
    } catch (e) {
      debugPrint('[MatrimonyPhotoManager] Error loading photos from Supabase: $e');
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load photos: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  /// Cross-platform photo picker and uploader:
  /// - Uses ImagePicker(maxWidth: 1000, maxHeight: 1000, imageQuality: 75)
  /// - Reads pure Uint8List bytes without dart:io File
  /// - Uploads to Cloudflare R2 strictly (avatars/profile_... or family/family_...)
  /// - Saves permanent R2 URL to Supabase public.profiles
  /// - Updates local UI state only AFTER Supabase update succeeds
  Future<void> _pickAndUploadPhoto({required bool isProfilePhoto}) async {
    try {
      // 1. Image selection with built-in compression across Web, Android, and iOS
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1000,
        maxHeight: 1000,
        imageQuality: 75,
      );

      if (image == null) return;

      // 2. Read pure Uint8List bytes (pure cross-platform, zero dart:io File usage)
      final Uint8List bytes = await image.readAsBytes();
      if (bytes.isEmpty) {
        throw Exception('Selected image file is empty.');
      }

      // 3. Resolve user ID before upload
      final userId = await _resolveUserId();
      if (userId == null || userId.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('No active profile detected. Please log in or select a profile.'),
              backgroundColor: Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
        return;
      }

      // 4. Activate uploading spinner (do not set local preview path before DB succeeds)
      if (mounted) {
        setState(() {
          if (isProfilePhoto) {
            _isUploadingProfile = true;
          } else {
            _isUploadingFamily = true;
          }
          _errorMessage = null;
        });
      }

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final filePath = isProfilePhoto
          ? 'avatars/profile_${userId}_$timestamp.jpg'
          : 'family/family_${userId}_$timestamp.jpg';

      // 5. Upload Uint8List bytes strictly to Cloudflare R2
      String permanentR2Url;
      try {
        permanentR2Url = await _r2Service.uploadBytesToR2(
          bytes: bytes,
          filePath: filePath,
          contentType: 'image/jpeg',
        );
      } catch (r2Error) {
        debugPrint('[MatrimonyPhotoManager] R2 Upload failed: $r2Error');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Cloudflare R2 Upload Failed: ${r2Error.toString()}'),
              backgroundColor: const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 8),
            ),
          );
        }
        return;
      }

      // 6. Immediately update Supabase profiles table
      try {
        await _r2Service.persistPhotoUrlToSupabase(
          url: permanentR2Url,
          isProfilePhoto: isProfilePhoto,
          userId: userId,
        );
      } catch (dbError) {
        debugPrint('[MatrimonyPhotoManager] Supabase update failed: $dbError');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Database Update Failed: ${dbError.toString()}'),
              backgroundColor: const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 8),
            ),
          );
        }
        return;
      }

      // 7. Update local SharedPreferences & Provider cache
      try {
        final prefs = await SharedPreferences.getInstance();
        if (isProfilePhoto) {
          await prefs.setString('profile_photo_url', permanentR2Url);
          await prefs.setString('photo_url', permanentR2Url);
          await prefs.setString('avatar_url', permanentR2Url);
          await prefs.setString('photo', permanentR2Url);
        } else {
          await prefs.setString('family_photo', permanentR2Url);
          await prefs.setString('family_photo_url', permanentR2Url);
        }
      } catch (prefErr) {
        debugPrint('[MatrimonyPhotoManager] SharedPreferences notice: $prefErr');
      }

      widget.onPhotoCached?.call(permanentR2Url, isProfilePhoto);

      // 8. Evict stale cached images and update UI state only AFTER Supabase succeeded
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();

      if (mounted) {
        setState(() {
          if (isProfilePhoto) {
            _profilePhotoUrl = permanentR2Url;
          } else {
            _familyPhotoUrl = permanentR2Url;
          }
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isProfilePhoto
                  ? 'Profile photo uploaded to Cloudflare R2 and saved!'
                  : 'Family photo uploaded to Cloudflare R2 and saved!',
            ),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );

        widget.onPhotosUpdated?.call();
      }
    } catch (e) {
      debugPrint('[MatrimonyPhotoManager] Photo operation failed: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Operation failed: ${e.toString()}'),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          if (isProfilePhoto) {
            _isUploadingProfile = false;
          } else {
            _isUploadingFamily = false;
          }
        });
      }
    }
  }

  /// Deletes photo from both Cloudflare R2 and Supabase public.profiles
  Future<void> _confirmAndDeletePhoto({required bool isProfilePhoto}) async {
    final photoTypeLabel = isProfilePhoto ? 'Profile Photo' : 'Family Photo';
    final existingUrl = isProfilePhoto ? _profilePhotoUrl : _familyPhotoUrl;

    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete $photoTypeLabel?'),
        content: Text(
          'Are you sure you want to permanently delete this $photoTypeLabel? '
          'This will remove the file from Cloudflare R2 and reset the photo in Supabase.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final userId = await _resolveUserId();
      if (userId == null || userId.isEmpty) {
        throw Exception('User ID could not be determined.');
      }

      setState(() {
        if (isProfilePhoto) {
          _isDeletingProfile = true;
        } else {
          _isDeletingFamily = true;
        }
      });

      // 1. Delete from Cloudflare R2 and update Supabase columns to null
      await _r2Service.deletePhotoFromR2AndSupabase(
        isProfilePhoto: isProfilePhoto,
        userId: userId,
        existingUrl: existingUrl,
      );

      // 2. Clear image caches
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();

      // 3. Update local state
      if (mounted) {
        setState(() {
          if (isProfilePhoto) {
            _profilePhotoUrl = null;
          } else {
            _familyPhotoUrl = null;
          }
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$photoTypeLabel deleted successfully from Cloudflare R2 and Supabase.'),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );

        widget.onPhotosUpdated?.call();
      }
    } catch (e) {
      debugPrint('[MatrimonyPhotoManager] Error deleting photo: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete photo: ${e.toString()}'),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          if (isProfilePhoto) {
            _isDeletingProfile = false;
          } else {
            _isDeletingFamily = false;
          }
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadPhotosFromSupabase,
      color: const Color(0xFFDFB76C),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Active Profile Info Banner
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF0B192C),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.cloud_done_rounded, color: Color(0xFFDFB76C), size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Cloudflare R2 Storage (Bucket: i4youmatrimony)',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          _resolvedUserId != null
                              ? 'Connected Profile ID: $_resolvedUserId'
                              : 'Resolving active profile...',
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.white70, size: 18),
                    onPressed: _loadPhotosFromSupabase,
                    tooltip: 'Reload from Supabase',
                  ),
                ],
              ),
            ),

            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(color: Colors.red.shade800, fontSize: 13),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 18),
                      onPressed: _loadPhotosFromSupabase,
                      tooltip: 'Retry',
                    ),
                  ],
                ),
              ),

            // 1. Profile Photo Card
            _buildPhotoCard(
              title: 'Profile Photo',
              subtitle: 'Primary photo displayed across match recommendations',
              photoUrl: _profilePhotoUrl,
              isUploading: _isUploadingProfile,
              isDeleting: _isDeletingProfile,
              icon: Icons.person_rounded,
              onUploadPressed: () => _pickAndUploadPhoto(isProfilePhoto: true),
              onDeletePressed: () => _confirmAndDeletePhoto(isProfilePhoto: true),
              aspectRatio: 1.0,
            ),

            const SizedBox(height: 24),

            // 2. Family Photo Card
            _buildPhotoCard(
              title: 'Family Photo',
              subtitle: 'Shared in family background to introduce your loved ones',
              photoUrl: _familyPhotoUrl,
              isUploading: _isUploadingFamily,
              isDeleting: _isDeletingFamily,
              icon: Icons.people_alt_rounded,
              onUploadPressed: () => _pickAndUploadPhoto(isProfilePhoto: false),
              onDeletePressed: () => _confirmAndDeletePhoto(isProfilePhoto: false),
              aspectRatio: 1.4,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoCard({
    required String title,
    required String subtitle,
    required String? photoUrl,
    required bool isUploading,
    required bool isDeleting,
    required IconData icon,
    required VoidCallback onUploadPressed,
    required VoidCallback onDeletePressed,
    required double aspectRatio,
  }) {
    final hasPhoto = photoUrl != null && photoUrl.trim().isNotEmpty;
    final isBusy = isUploading || isDeleting || _isLoading;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Icon(icon, color: const Color(0xFFDFB76C), size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Photo Display / Loading / Placeholder Area
          Container(
            color: const Color(0xFFF8FAFC),
            child: AspectRatio(
              aspectRatio: aspectRatio,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (_isLoading)
                    const Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Color(0xFFDFB76C),
                      ),
                    )
                  else if (hasPhoto)
                    _buildNetworkImage(photoUrl)
                  else
                    _buildEmptyPlaceholder(title, icon),

                  // Upload Progress Overlay
                  if (isUploading)
                    Container(
                      color: Colors.black54,
                      child: const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(
                              color: Color(0xFFDFB76C),
                            ),
                            SizedBox(height: 12),
                            Text(
                              'Uploading to Cloudflare R2...',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Deleting Progress Overlay
                  if (isDeleting)
                    Container(
                      color: Colors.black54,
                      child: const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(
                              color: Color(0xFFEF4444),
                            ),
                            SizedBox(height: 12),
                            Text(
                              'Deleting photo...',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Action Buttons: Upload/Change & Delete
          Padding(
            padding: const EdgeInsets.all(14.0),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: isBusy ? null : onUploadPressed,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0B192C),
                      foregroundColor: const Color(0xFFDFB76C),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    icon: Icon(hasPhoto ? Icons.photo_camera_rounded : Icons.upload_rounded, size: 18),
                    label: Text(
                      hasPhoto ? 'Change $title' : 'Upload $title',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                  ),
                ),
                if (hasPhoto) ...[
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: isBusy ? null : onDeletePressed,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFEE2E2),
                      foregroundColor: const Color(0xFFDC2626),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: const BorderSide(color: Color(0xFFFCA5A5)),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    ),
                    icon: const Icon(Icons.delete_outline_rounded, size: 18),
                    label: const Text(
                      'Delete',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Network image renderer with ValueKey UI cache lock and persistent headers
  Widget _buildNetworkImage(String url) {
    return Image.network(
      url,
      key: ValueKey(url),
      fit: BoxFit.cover,
      headers: const {
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Cache-Control': 'max-age=31536000',
      },
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return Center(
          child: CircularProgressIndicator(
            value: loadingProgress.expectedTotalBytes != null
                ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                : null,
            strokeWidth: 2.5,
            color: const Color(0xFFDFB76C),
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) {
        debugPrint('[MatrimonyPhotoManager] Image.network load error for $url: $error');
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.broken_image_rounded, size: 44, color: Color(0xFF94A3B8)),
                const SizedBox(height: 8),
                const Text(
                  'Failed to load image',
                  style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _loadPhotosFromSupabase,
                  icon: const Icon(Icons.refresh, size: 16),
                  label: const Text('Reload Photo', style: TextStyle(fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyPlaceholder(String title, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: const Color(0xFFE2E8F0),
            child: Icon(icon, size: 36, color: const Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 12),
          Text(
            'No $title uploaded yet',
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
