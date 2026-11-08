import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/cloudflare_r2_photo_service.dart';

/// Interactive Photo Manager for Profile Photo and Family Photo
///
/// Features:
/// 1. Active Screen & Button Wiring:
///    - Tapping Profile Photo section OR Family Photo section (photo area, badge, or button)
///      immediately triggers the image picker.
///    - Shows visible loading spinner AND SnackBar ('Uploading photo...') the moment an image is chosen.
/// 2. Upload Pipeline (Cloudflare R2 + Automatic Supabase Storage Fallback):
///    - Pure Uint8List bytes extracted via `await image.readAsBytes()` (Zero dart:io File usage).
///    - ImagePicker with maxWidth: 1000, maxHeight: 1000, imageQuality: 75.
///    - First attempts direct AWS SigV4 PUT to Cloudflare R2 (avatars/profile_... or family/family_...).
///    - If R2 fails (e.g. browser CORS or network issue), immediately logs error and uploads to
///      Supabase Storage avatars bucket (upsert: true) with filename photo_${userId}_${timestamp}.jpg.
/// 3. Supabase Database Row Match (id vs register_id):
///    - Accurately matches user row via .eq('id', ...) or .eq('register_id', ...).
///    - For Profile Photo: updates BOTH `photo` and `photo_url` columns.
///    - For Family Photo: updates BOTH `family_photo` and `family_photo_url` columns.
///    - Prints updated row result and immediately refreshes local UI state with new URL.
/// 4. Delete Photo Option:
///    - Removes object from R2 / Storage and sets photo columns to null in Supabase.
class MatrimonyPhotoManager extends StatefulWidget {
  final CloudflareR2PhotoService? r2Service;
  final String? customUserId;
  final String? customRegisterId;
  final VoidCallback? onPhotosUpdated;
  final void Function(String photoUrl, bool isProfilePhoto)? onPhotoCached;

  const MatrimonyPhotoManager({
    super.key,
    this.r2Service,
    this.customUserId,
    this.customRegisterId,
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
  String? _resolvedRegisterId;
  String? _resolvedName;

  List<Map<String, dynamic>> _allProfiles = [];

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

    _loadPhotosFromSupabase();
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  /// Hydrates active profile and photo URLs directly from Supabase public.profiles
  Future<void> _loadPhotosFromSupabase() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final supabase = Supabase.instance.client;

      // 1. Fetch available profiles from public.profiles
      final dynamic rowsResponse = await supabase
          .from('profiles')
          .select('id, register_id, name, phone, email, photo, photo_url, profile_photo_url, avatar_url, family_photo, family_photo_url');

      final List<Map<String, dynamic>> loadedList = [];
      if (rowsResponse is List) {
        for (final item in rowsResponse) {
          if (item is Map) {
            loadedList.add(Map<String, dynamic>.from(item));
          }
        }
      }
      _allProfiles = loadedList;

      // 2. Resolve target profile
      Map<String, dynamic>? targetProfile;

      // Explicit ID passed via widget
      if (widget.customUserId != null && widget.customUserId!.trim().isNotEmpty) {
        final cid = widget.customUserId!.trim();
        targetProfile = _allProfiles.firstWhere(
          (p) => p['id']?.toString() == cid || p['register_id']?.toString() == cid,
          orElse: () => {'id': cid, 'name': 'Member'},
        );
      }

      // Check current auth user
      if (targetProfile == null) {
        final authUser = supabase.auth.currentUser;
        if (authUser != null) {
          final authId = authUser.id;
          final authPhone = authUser.phone ?? authUser.userMetadata?['phone']?.toString();
          final authEmail = authUser.email;
          targetProfile = _allProfiles.firstWhere(
            (p) =>
                p['id']?.toString() == authId ||
                (authPhone != null && p['phone']?.toString() == authPhone) ||
                (authEmail != null && p['email']?.toString() == authEmail),
            orElse: () => {'id': authId, 'name': authUser.userMetadata?['name']?.toString() ?? 'Member'},
          );
        }
      }

      // Check SharedPreferences for saved profile ID
      if (targetProfile == null) {
        try {
          final prefs = await SharedPreferences.getInstance();
          final savedId = prefs.getString('user_id') ?? prefs.getString('cached_user_id') ?? prefs.getString('id');
          if (savedId != null && savedId.isNotEmpty) {
            targetProfile = _allProfiles.firstWhere(
              (p) => p['id']?.toString() == savedId || p['register_id']?.toString() == savedId,
              orElse: () => {'id': savedId, 'name': 'Member'},
            );
          }
        } catch (_) {}
      }

      // Default to first profile in database if available
      if (targetProfile == null && _allProfiles.isNotEmpty) {
        targetProfile = _allProfiles.first;
      }

      if (targetProfile != null) {
        _selectActiveProfile(targetProfile);
      } else {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = 'No profile record found in public.profiles. Connect to Supabase to load profiles.';
          });
        }
      }
    } catch (e) {
      debugPrint('[MatrimonyPhotoManager] Error loading profiles: $e');
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load profile data: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  void _selectActiveProfile(Map<String, dynamic> profile) {
    final String uid = (profile['id'] ?? '').toString().trim();
    final String regId = (widget.customRegisterId != null && widget.customRegisterId!.isNotEmpty)
        ? widget.customRegisterId!
        : (profile['register_id'] ?? '').toString().trim();
    final String name = (profile['name'] ?? profile['full_name'] ?? 'Member').toString().trim();

    final String? profilePhoto = profile['photo']?.toString() ??
        profile['photo_url']?.toString() ??
        profile['profile_photo_url']?.toString() ??
        profile['avatar_url']?.toString();

    final String? familyPhoto = profile['family_photo']?.toString() ??
        profile['family_photo_url']?.toString();

    // Evict cached images so previous photo doesn't linger
    PaintingBinding.instance.imageCache.clear();
    PaintingBinding.instance.imageCache.clearLiveImages();

    if (mounted) {
      setState(() {
        _resolvedUserId = uid.isNotEmpty ? uid : 'user';
        _resolvedRegisterId = regId;
        _resolvedName = name;
        _profilePhotoUrl = (profilePhoto != null && profilePhoto.trim().isNotEmpty) ? profilePhoto.trim() : null;
        _familyPhotoUrl = (familyPhoto != null && familyPhoto.trim().isNotEmpty) ? familyPhoto.trim() : null;
        _isLoading = false;
      });
    }
  }

  /// Triggered immediately on tapping Profile Photo OR Family Photo section
  Future<void> _pickAndUploadPhoto({required bool isProfilePhoto}) async {
    final photoLabel = isProfilePhoto ? 'Profile Photo' : 'Family Photo';
    debugPrint('[MatrimonyPhotoManager] Tapped to upload/change $photoLabel');

    try {
      // 1. Image selection with built-in cross-platform compression (maxWidth: 1000, maxHeight: 1000, imageQuality: 75)
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1000,
        maxHeight: 1000,
        imageQuality: 75,
      );

      // User cancelled picker dialog
      if (image == null) {
        debugPrint('[MatrimonyPhotoManager] Image selection cancelled by user');
        return;
      }

      // 2. THE MOMENT THE USER SELECTS AN IMAGE:
      // Immediately activate loading spinner on the card
      if (mounted) {
        setState(() {
          if (isProfilePhoto) {
            _isUploadingProfile = true;
          } else {
            _isUploadingFamily = true;
          }
          _errorMessage = null;
        });

        // Immediately show prominent floating SnackBar ('Uploading photo...') as required!
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    color: Color(0xFFDFB76C),
                  ),
                ),
                const SizedBox(width: 14),
                Text(
                  'Uploading $photoLabel...',
                  style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF0F172A),
            duration: const Duration(seconds: 20),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }

      // 3. Read picked image as Uint8List bytes (Zero dart:io File usage; safe for Web, Android, iOS)
      final bytes = await image.readAsBytes();
      if (bytes.isEmpty) {
        throw Exception('Selected image file is empty.');
      }

      final userId = (_resolvedUserId != null && _resolvedUserId!.isNotEmpty)
          ? _resolvedUserId!
          : 'user';
      final timestamp = DateTime.now().millisecondsSinceEpoch;

      final r2Path = isProfilePhoto
          ? 'avatars/profile_${userId}_$timestamp.jpg'
          : 'family/family_${userId}_$timestamp.jpg';

      // 4. Upload Pipeline (Cloudflare R2 + Automatic Supabase Storage Fallback)
      // First attempts Cloudflare R2 AWS SigV4 PUT; if CORS or keys fail, automatically falls back to Supabase Storage avatars bucket
      final permanentUrl = await _r2Service.uploadBytesToR2(
        bytes: bytes,
        filePath: r2Path,
        userId: userId,
        isProfilePhoto: isProfilePhoto,
        contentType: 'image/jpeg',
      );

      // 5. Update Supabase public.profiles table matching id or register_id
      // For Profile Photo: updates BOTH photo and photo_url (and profile_photo_url)
      // For Family Photo: updates BOTH family_photo and family_photo_url
      final updatedRow = await _r2Service.persistPhotoUrlToSupabase(
        url: permanentUrl,
        isProfilePhoto: isProfilePhoto,
        userId: userId,
        registerId: _resolvedRegisterId,
      );

      // Print the updated row result to console as requested
      debugPrint('====================================================');
      debugPrint('[Upload Pipeline] Successfully Saved $photoLabel to Supabase:');
      debugPrint('Permanent URL: $permanentUrl');
      debugPrint('Updated Row: ${updatedRow != null ? jsonEncode(updatedRow) : "Success"}');
      // ignore: avoid_print
      print('[Upload Pipeline] Updated Row Result: ${updatedRow != null ? jsonEncode(updatedRow) : "Success"}');
      debugPrint('====================================================');

      // 6. Evict image caches
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();

      // 7. Immediately refresh local user state/UI with the new URL
      if (mounted) {
        setState(() {
          if (isProfilePhoto) {
            _profilePhotoUrl = permanentUrl;
          } else {
            _familyPhotoUrl = permanentUrl;
          }
        });

        // Hide 'Uploading photo...' SnackBar and show completion toast
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Color(0xFF34D399), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '$photoLabel updated and saved to Supabase!',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF065F46),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );

        widget.onPhotosUpdated?.call();
        widget.onPhotoCached?.call(permanentUrl, isProfilePhoto);
      }
    } catch (e) {
      debugPrint('[MatrimonyPhotoManager] Upload pipeline error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Color(0xFFF87171), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text('Upload failed: ${e.toString()}'),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF991B1B),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 6),
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

  /// Deletes photo from both storage and Supabase public.profiles
  Future<void> _confirmAndDeletePhoto({required bool isProfilePhoto}) async {
    final photoLabel = isProfilePhoto ? 'Profile Photo' : 'Family Photo';
    final existingUrl = isProfilePhoto ? _profilePhotoUrl : _familyPhotoUrl;

    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete $photoLabel?'),
        content: Text(
          'Are you sure you want to permanently delete this $photoLabel? '
          'This will remove the file from storage and reset the photo in Supabase.',
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
      final userId = (_resolvedUserId != null && _resolvedUserId!.isNotEmpty)
          ? _resolvedUserId!
          : 'user';

      setState(() {
        if (isProfilePhoto) {
          _isDeletingProfile = true;
        } else {
          _isDeletingFamily = true;
        }
      });

      // 1. Delete from storage and set Supabase columns to null
      await _r2Service.deletePhotoFromR2AndSupabase(
        isProfilePhoto: isProfilePhoto,
        userId: userId,
        registerId: _resolvedRegisterId,
        existingUrl: existingUrl,
      );

      // 2. Clear image caches
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();

      // 3. Immediately refresh local user state/UI
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
            content: Text('$photoLabel deleted successfully.'),
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
            // Active Profile Info & Switcher Header
            _buildProfileSelectorHeader(),

            const SizedBox(height: 16),

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

            // 1. Profile Photo Section (fully interactive anywhere on tap)
            _buildInteractivePhotoCard(
              title: 'Profile Photo',
              subtitle: 'Primary photo displayed across match recommendations (Tap photo to upload/change)',
              photoUrl: _profilePhotoUrl,
              isUploading: _isUploadingProfile,
              isDeleting: _isDeletingProfile,
              icon: Icons.person_rounded,
              onUploadPressed: () => _pickAndUploadPhoto(isProfilePhoto: true),
              onDeletePressed: () => _confirmAndDeletePhoto(isProfilePhoto: true),
              aspectRatio: 1.0,
            ),

            const SizedBox(height: 24),

            // 2. Family Photo Section (fully interactive anywhere on tap)
            _buildInteractivePhotoCard(
              title: 'Family Photo',
              subtitle: 'Shared in family background to introduce your loved ones (Tap photo to upload/change)',
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

  /// Header showing active profile details and profile switcher dropdown
  Widget _buildProfileSelectorHeader() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0B192C),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFDFB76C).withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.account_circle_rounded, color: Color(0xFFDFB76C), size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _resolvedName != null ? 'Active Profile: $_resolvedName' : 'Loading Profile...',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'ID: ${_resolvedRegisterId ?? _resolvedUserId ?? "Resolving..."}',
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 12,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: Colors.white70, size: 20),
                onPressed: _loadPhotosFromSupabase,
                tooltip: 'Reload from Supabase',
              ),
            ],
          ),

          // Profile Switcher Dropdown (allows managing photos for any loaded profile)
          if (_allProfiles.length > 1) ...[
            const SizedBox(height: 12),
            const Divider(color: Colors.white12, height: 1),
            const SizedBox(height: 8),
            Row(
              children: [
                const Text(
                  'Switch Profile:',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isDense: true,
                      dropdownColor: const Color(0xFF1E293B),
                      value: _allProfiles.any((p) => p['id']?.toString() == _resolvedUserId)
                          ? _resolvedUserId
                          : null,
                      hint: const Text('Select Candidate', style: TextStyle(color: Colors.white60, fontSize: 13)),
                      icon: const Icon(Icons.arrow_drop_down, color: Color(0xFFDFB76C)),
                      items: _allProfiles.map((p) {
                        final pid = p['id']?.toString() ?? '';
                        final pname = p['name'] ?? p['full_name'] ?? 'Candidate';
                        final preg = p['register_id']?.toString() ?? pid;
                        return DropdownMenuItem<String>(
                          value: pid,
                          child: Text(
                            '$pname ($preg)',
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }).toList(),
                      onChanged: (selectedId) {
                        if (selectedId != null) {
                          final selected = _allProfiles.firstWhere((p) => p['id']?.toString() == selectedId);
                          _selectActiveProfile(selected);
                        }
                      },
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  /// Photo card with active tap wiring on photo image, badge, and button
  Widget _buildInteractivePhotoCard({
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
    final isBusy = isUploading || isDeleting;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header (Tapping header also triggers picker)
          InkWell(
            onTap: isBusy ? null : onUploadPressed,
            child: Padding(
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
                  if (!isBusy)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(hasPhoto ? Icons.edit_rounded : Icons.add_a_photo_rounded, size: 14, color: const Color(0xFF475569)),
                          const SizedBox(width: 4),
                          Text(
                            hasPhoto ? 'Change' : 'Tap to Pick',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Photo Display Area: WRAPPED WITH INKWELL SO TAPPING DIRECTLY OPENS PICKER
          Material(
            color: const Color(0xFFF8FAFC),
            child: InkWell(
              onTap: isBusy ? null : onUploadPressed,
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

                    // Floating Camera Action Badge over the photo
                    if (!isBusy)
                      Positioned(
                        bottom: 12,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0B192C).withOpacity(0.85),
                            shape: BoxShape.circle,
                            border: Border.all(color: const Color(0xFFDFB76C), width: 1.5),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.3),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.camera_alt_rounded,
                            color: Color(0xFFDFB76C),
                            size: 20,
                          ),
                        ),
                      ),

                    // Uploading Progress Overlay
                    if (isUploading)
                      Container(
                        color: Colors.black.withOpacity(0.65),
                        child: const Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircularProgressIndicator(
                                color: Color(0xFFDFB76C),
                                strokeWidth: 3,
                              ),
                              SizedBox(height: 14),
                              Text(
                                'Uploading photo...',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Saving to Cloudflare R2 & Supabase',
                                style: TextStyle(
                                  color: Color(0xFFCBD5E1),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                    // Deleting Progress Overlay
                    if (isDeleting)
                      Container(
                        color: Colors.black.withOpacity(0.65),
                        child: const Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircularProgressIndicator(
                                color: Color(0xFFEF4444),
                                strokeWidth: 3,
                              ),
                              SizedBox(height: 14),
                              Text(
                                'Deleting photo...',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
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
          ),

          // Bottom Action Buttons
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

  /// Network image renderer with ValueKey cache lock
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
                  'Failed to load image from storage',
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
              fontSize: 14,
              color: Color(0xFF334155),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Tap here to choose from gallery',
            style: TextStyle(
              fontSize: 12,
              color: Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }
}
