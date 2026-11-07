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
/// Workflow:
/// 1. Built-in cross-platform compression via [ImagePicker.pickImage](maxWidth: 1000, maxHeight: 1000, imageQuality: 75).
/// 2. Reads pure [Uint8List] bytes via `await image.readAsBytes()` (Zero dart:io File usage; safe for Web, Android, iOS).
/// 3. Does NOT update UI state with local temporary file paths before upload completion.
/// 4. Direct upload of Uint8List bytes to Cloudflare R2:
///     - profile_${userId}_$timestamp.jpg
///     - family_${userId}_$timestamp.jpg
/// 5. Immediate update of exact columns in Supabase `profiles` table:
///     - Profile: `profile_photo_url`, `photo_url`, `photo`, `avatar_url`
///     - Family: `family_photo_url`, `family_photos`
/// 6. Synchronizes `supabase.auth.updateUser` metadata and local SharedPreferences / Provider cache.
/// 7. Visible error logging: Displays red SnackBar if R2 upload or Supabase update fails.
/// 8. Only after Supabase database update succeeds, updates UI state with the permanent R2 public URL.
/// 9. On page refresh, always fetches the latest row from Supabase `public.profiles` and uses `ValueKey(photoUrl)` on the image widget so old photos never come back.
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
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _r2Service = widget.r2Service ?? CloudflareR2PhotoService();

    // Listen for auth state changes (session restoration on refresh or user login)
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

  /// Resolves the authenticated user ID, waiting for session initialization on page refresh
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

    // 3. On page refresh, session restoration is asynchronous. Wait up to 3 seconds for currentUser to be restored
    for (int i = 0; i < 30; i++) {
      await Future.delayed(const Duration(milliseconds: 100));
      if (supabase.auth.currentUser?.id != null && supabase.auth.currentUser!.id.isNotEmpty) {
        return supabase.auth.currentUser!.id;
      }
      if (supabase.auth.currentSession?.user.id != null && supabase.auth.currentSession!.user.id.isNotEmpty) {
        return supabase.auth.currentSession!.user.id;
      }
    }

    // 4. Fallback: check onAuthStateChange stream for initialSession or signedIn
    try {
      final authState = await supabase.auth.onAuthStateChange
          .firstWhere((data) =>
              data.session?.user != null ||
              data.event == AuthChangeEvent.signedIn ||
              data.event == AuthChangeEvent.initialSession)
          .timeout(const Duration(milliseconds: 1500));
      return authState.session?.user.id ?? supabase.auth.currentUser?.id;
    } catch (_) {
      return supabase.auth.currentUser?.id ?? supabase.auth.currentSession?.user.id;
    }
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

      if (userId == null || userId.isEmpty) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = 'No authenticated user session found. Please log in.';
          });
        }
        return;
      }

      final supabase = Supabase.instance.client;

      // Auto-create profile row in public.profiles (id, user_id, full_name, name) if not present
      await _r2Service.ensureProfileRowExists(
        userId: userId,
        name: supabase.auth.currentUser?.userMetadata?['name']?.toString() ??
              supabase.auth.currentUser?.userMetadata?['full_name']?.toString() ??
              'Member',
      );

      // Query profiles table for all recognized photo columns directly from Supabase
      var response = await supabase
          .from('profiles')
          .select('id, user_id, full_name, name, profile_photo_url, photo_url, photo, avatar_url, family_photo_url, family_photos')
          .eq('id', userId)
          .maybeSingle();

      if (response == null) {
        // Fallback by user_id
        response = await supabase
            .from('profiles')
            .select('id, user_id, full_name, name, profile_photo_url, photo_url, photo, avatar_url, family_photo_url, family_photos')
            .eq('user_id', userId)
            .maybeSingle();
      }

      if (response == null) {
        // Fallback by register_id or phone if id didn't match primary key
        response = await supabase
            .from('profiles')
            .select('id, user_id, full_name, name, profile_photo_url, photo_url, photo, avatar_url, family_photo_url, family_photos')
            .or('register_id.eq.$userId,phone.eq.$userId')
            .maybeSingle();
      }

      if (response != null && mounted) {
        // 1. Resolve Profile Photo (prioritizes profile_photo_url, then photo_url, photo, avatar_url)
        final profilePhoto = response['profile_photo_url'] ??
            response['photo_url'] ??
            response['photo'] ??
            response['avatar_url'];

        // 2. Resolve Family Photo (prioritizes family_photo_url, then family_photos array or string)
        String? familyPhoto = response['family_photo_url']?.toString();
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

        // Evict previous cached images so old photos never come back on refresh
        PaintingBinding.instance.imageCache.clear();
        PaintingBinding.instance.imageCache.clearLiveImages();

        setState(() {
          _profilePhotoUrl = profilePhoto?.toString();
          _familyPhotoUrl = familyPhoto?.toString();
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

  /// Cross-platform photo picker and uploader with visible error logging:
  /// - Uses ImagePicker(maxWidth: 1000, maxHeight: 1000, imageQuality: 75)
  /// - Extracts Uint8List bytes without dart:io File
  /// - Does NOT update UI with local temporary file paths
  /// - Displays red SnackBar on R2 upload failure
  /// - Displays red SnackBar on Supabase update failure
  /// - Updates UI state only after database update succeeds
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

      // 3. Resolve user ID before upload
      final userId = await _resolveUserId();
      if (userId == null || userId.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('[Authentication Error]: No logged-in user detected. Please log in first.'),
              backgroundColor: Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
        return;
      }

      // 4. Do NOT update UI state with local temporary path before upload completes.
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

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final filePath = isProfilePhoto
          ? 'profile_${userId}_$timestamp.jpg'
          : 'family_${userId}_$timestamp.jpg';

      // 5. Step 1: Upload Uint8List bytes to Cloudflare R2
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
              content: Text('[R2 Upload Failed]: ${r2Error.toString()}'),
              backgroundColor: const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 8),
            ),
          );
        }
        return; // Abort: do not update UI or database
      }

      // 6. Step 2: Immediately update/upsert Supabase profiles table
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
              content: Text('[Supabase Database Failed]: ${dbError.toString()}'),
              backgroundColor: const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 8),
            ),
          );
        }
        return; // Abort: do not update UI state
      }

      // 7. Step 3: Update local SharedPreferences & Provider cache
      try {
        final prefs = await SharedPreferences.getInstance();
        if (isProfilePhoto) {
          await prefs.setString('profile_photo_url', permanentR2Url);
          await prefs.setString('photo_url', permanentR2Url);
          await prefs.setString('avatar_url', permanentR2Url);
          await prefs.setString('photo', permanentR2Url);
        } else {
          await prefs.setString('family_photo_url', permanentR2Url);
        }
      } catch (prefErr) {
        debugPrint('[MatrimonyPhotoManager] SharedPreferences notice: $prefErr');
      }

      // Notify external Provider / StateNotifier cache listener
      widget.onPhotoCached?.call(permanentR2Url, isProfilePhoto);

      // 8. Step 4: Evict stale cached images and update UI state with permanent URL
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
                  ? 'Profile photo updated and saved to Supabase!'
                  : 'Family photo updated and saved to Supabase!',
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
