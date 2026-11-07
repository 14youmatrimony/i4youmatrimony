import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/cloudflare_r2_photo_service.dart';

/// State-Preserving Photo Manager for Profile Photo and Family Photo
///
/// Workflow:
/// 1. Built-in cross-platform compression via [ImagePicker.pickImage](maxWidth: 1000, maxHeight: 1000, imageQuality: 75).
/// 2. Reads pure [Uint8List] bytes via `await image.readAsBytes()` (Zero dart:io File usage; safe for Web, Android, iOS).
/// 3. Does NOT update UI state with local temporary file paths before upload completion.
/// 4. Direct upload of Uint8List bytes to Cloudflare R2:
///     - profile/${userId}_$timestamp.jpg
///     - family/${userId}_$timestamp.jpg
/// 5. Immediately upserts/updates `profile_photo_url` and `family_photo_url` in Supabase profiles table for currentUser.id.
/// 6. Only after Supabase database update succeeds, updates UI state with the permanent R2 public URL.
/// 7. Always loads `profile_photo_url` and `family_photo_url` from Supabase on [initState] to ensure persistence across page refreshes.
class MatrimonyPhotoManager extends StatefulWidget {
  final CloudflareR2PhotoService? r2Service;
  final String? customUserId;
  final VoidCallback? onPhotosUpdated;

  const MatrimonyPhotoManager({
    super.key,
    this.r2Service,
    this.customUserId,
    this.onPhotosUpdated,
  });

  @override
  State<MatrimonyPhotoManager> createState() => _MatrimonyPhotoManagerState();
}

class _MatrimonyPhotoManagerState extends State<MatrimonyPhotoManager> {
  final ImagePicker _picker = ImagePicker();
  late final CloudflareR2PhotoService _r2Service;

  String? _profilePhotoUrl;
  String? _familyPhotoUrl;

  bool _isLoading = true;
  bool _isUploadingProfile = false;
  bool _isUploadingFamily = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _r2Service = widget.r2Service ?? CloudflareR2PhotoService();
    // Hydrate photo URLs directly from Supabase profiles table on initState
    _loadPhotosFromSupabase();
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
      final supabase = Supabase.instance.client;
      final userId = widget.customUserId ?? supabase.auth.currentUser?.id;

      if (userId == null || userId.isEmpty) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = 'No authenticated user session found.';
          });
        }
        return;
      }

      // Query profiles table directly for live photo URLs
      final response = await supabase
          .from('profiles')
          .select('profile_photo_url, family_photo_url, photo_url, photo')
          .eq('id', userId)
          .maybeSingle();

      if (response != null && mounted) {
        setState(() {
          _profilePhotoUrl = response['profile_photo_url'] ??
              response['photo_url'] ??
              response['photo'];
          _familyPhotoUrl = response['family_photo_url'];
        });
      }
    } catch (e) {
      debugPrint('[MatrimonyPhotoManager] Error loading photos from Supabase: $e');
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load photos. Pull down or tap reload to retry.';
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
  /// - Extracts Uint8List bytes without dart:io File
  /// - Does NOT update UI with local temporary file paths
  /// - Uploads directly to Cloudflare R2 and persists into Supabase
  /// - Only updates UI state with permanent URL after database update succeeds
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

      // 2. Read pure Uint8List bytes (Pure cross-platform, zero dart:io File usage)
      final Uint8List bytes = await image.readAsBytes();
      if (bytes.isEmpty) {
        throw Exception('Selected image file is empty.');
      }

      // 3. Do NOT update UI state with local temporary path before upload completes.
      // Activate loading indicator only.
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

      // 4. Upload Uint8List bytes directly to Cloudflare R2 and update Supabase profiles table
      final String permanentR2Url = await _r2Service.uploadBytesAndPersist(
        bytes: bytes,
        isProfilePhoto: isProfilePhoto,
        customUserId: widget.customUserId,
      );

      // Invalidate image cache so refreshed image displays immediately
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();

      // 5. Only after Supabase database update succeeds, update UI state with permanent R2 public URL
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
                  ? 'Profile photo updated and saved to Supabase!'
                  : 'Family photo updated and saved to Supabase!',
            ),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );

        widget.onPhotosUpdated?.call();
      }
    } catch (e) {
      debugPrint('[MatrimonyPhotoManager] Photo upload failed: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: ${e.toString()}'),
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
              icon: Icons.person_rounded,
              onUploadPressed: () => _pickAndUploadPhoto(isProfilePhoto: true),
              aspectRatio: 1.0, // Square portrait
            ),

            const SizedBox(height: 24),

            // 2. Family Photo Card
            _buildPhotoCard(
              title: 'Family Photo',
              subtitle: 'Shared in family background to introduce your loved ones',
              photoUrl: _familyPhotoUrl,
              isUploading: _isUploadingFamily,
              icon: Icons.people_alt_rounded,
              onUploadPressed: () => _pickAndUploadPhoto(isProfilePhoto: false),
              aspectRatio: 1.4, // Landscape orientation for family
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
    required IconData icon,
    required VoidCallback onUploadPressed,
    required double aspectRatio,
  }) {
    final hasPhoto = photoUrl != null && photoUrl.trim().isNotEmpty;

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
                ],
              ),
            ),
          ),

          // Action Button
          Padding(
            padding: const EdgeInsets.all(14.0),
            child: ElevatedButton.icon(
              onPressed: (isUploading || _isLoading) ? null : onUploadPressed,
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
        ],
      ),
    );
  }

  /// Network image renderer with ValueKey UI cache lock and persistent headers
  Widget _buildNetworkImage(String url) {
    return Image.network(
      url,
      key: ValueKey(url), // UI Cache Lock: forces widget rebuild whenever URL changes
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
