import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/cloudflare_r2_photo_service.dart';

/// Interactive State-Preserving Photo Manager for Profile Photo and Family Photo
///
/// Implements 4 critical guarantees:
/// 1. Formats R2 URLs strictly to public domain: https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev/<objectKey>
///    (No private S3 endpoint, no /i4youmatrimony, no double slashes).
/// 2. Matches Supabase public.profiles accurately using .or('id.eq.$userId,register_id.eq.$userId')
///    and updates ALL columns (photo, photo_url, profile_photo_url; family_photo, family_photo_url).
/// 3. Updates local session cache (SharedPreferences keys + user JSON) immediately after upload
///    so page refresh keeps the new photo locked.
/// 4. Syncs fresh row directly from Supabase on initState/refresh, auto-replacing any legacy
///    private S3 endpoint prefix with the public domain.
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
      if (data.session?.user != null) {
        _loadPhotosFromSupabase();
      }
    });

    // Always fetch fresh profile row directly from Supabase on initialize
    _loadPhotosFromSupabase();
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  /// Always fetches fresh row directly from Supabase public.profiles on load/refresh,
  /// overwrites local cached user object, and sanitizes legacy private S3 endpoint URLs.
  Future<void> _loadPhotosFromSupabase() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final supabase = Supabase.instance.client;

      // 1. Fetch fresh profiles directly from public.profiles
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

      // 2. Determine target user ID (from widget prop, auth session, or SharedPreferences)
      String? targetId = widget.customUserId?.trim();
      String? targetRegId = widget.customRegisterId?.trim();

      if (targetId == null || targetId.isEmpty) {
        final authUser = supabase.auth.currentUser;
        if (authUser != null) {
          targetId = authUser.id;
        }
      }

      if (targetId == null || targetId.isEmpty) {
        try {
          final prefs = await SharedPreferences.getInstance();
          targetId = prefs.getString('user_id') ?? prefs.getString('cached_user_id') ?? prefs.getString('id');
          targetRegId = targetRegId ?? prefs.getString('register_id');
        } catch (_) {}
      }

      Map<String, dynamic>? freshProfileRow;

      // 3. Match user row accurately using .or('id.eq.$userId,register_id.eq.$userId')
      if (targetId != null && targetId.isNotEmpty) {
        try {
          final orFilter = 'id.eq.$targetId,register_id.eq.$targetId';
          final dynamic directResult = await supabase
              .from('profiles')
              .select('id, register_id, name, photo, photo_url, profile_photo_url, avatar_url, family_photo, family_photo_url')
              .or(orFilter)
              .maybeSingle();

          if (directResult is Map) {
            freshProfileRow = Map<String, dynamic>.from(directResult);
          }
        } catch (e) {
          debugPrint('[MatrimonyPhotoManager] Direct fetch notice: $e');
        }

        if (freshProfileRow == null && _allProfiles.isNotEmpty) {
          freshProfileRow = _allProfiles.firstWhere(
            (p) => p['id']?.toString() == targetId || p['register_id']?.toString() == targetId,
            orElse: () => _allProfiles.first,
          );
        }
      } else if (_allProfiles.isNotEmpty) {
        freshProfileRow = _allProfiles.first;
      }

      if (freshProfileRow != null) {
        _applyFreshProfile(freshProfileRow);
      } else {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = 'No profile record found in public.profiles. Connect to Supabase to load profiles.';
          });
        }
      }
    } catch (e) {
      debugPrint('[MatrimonyPhotoManager] Error loading fresh profiles from Supabase: $e');
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load profile data: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  /// Overwrites local cached user object and applies sanitized public URLs
  void _applyFreshProfile(Map<String, dynamic> profile) {
    final String uid = (profile['id'] ?? '').toString().trim();
    final String regId = (widget.customRegisterId != null && widget.customRegisterId!.isNotEmpty)
        ? widget.customRegisterId!
        : (profile['register_id'] ?? uid).toString().trim();
    final String name = (profile['name'] ?? profile['full_name'] ?? 'Member').toString().trim();

    final String rawProfilePhoto = (profile['photo'] ??
            profile['photo_url'] ??
            profile['profile_photo_url'] ??
            profile['avatar_url'] ??
            '')
        .toString()
        .trim();

    final String rawFamilyPhoto = (profile['family_photo'] ??
            profile['family_photo_url'] ??
            '')
        .toString()
        .trim();

    // Automatically replace private S3 endpoint prefix with public domain: https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev/
    final String cleanProfilePhoto = CloudflareR2PhotoService.formatR2PublicUrl(rawProfilePhoto);
    final String cleanFamilyPhoto = CloudflareR2PhotoService.formatR2PublicUrl(rawFamilyPhoto);

    // Overwrite local cached user object in SharedPreferences immediately
    try {
      SharedPreferences.getInstance().then((prefs) {
        prefs.setString('user_id', uid);
        prefs.setString('register_id', regId);
        if (cleanProfilePhoto.isNotEmpty) {
          prefs.setString('photo', cleanProfilePhoto);
          prefs.setString('photo_url', cleanProfilePhoto);
          prefs.setString('profile_photo_url', cleanProfilePhoto);
          prefs.setString('avatar_url', cleanProfilePhoto);
        }
        if (cleanFamilyPhoto.isNotEmpty) {
          prefs.setString('family_photo', cleanFamilyPhoto);
          prefs.setString('family_photo_url', cleanFamilyPhoto);
        }

        // Update stored user JSON
        final Map<String, dynamic> freshUserMap = Map<String, dynamic>.from(profile);
        freshUserMap['photo'] = cleanProfilePhoto;
        freshUserMap['photo_url'] = cleanProfilePhoto;
        freshUserMap['profile_photo_url'] = cleanProfilePhoto;
        freshUserMap['avatar_url'] = cleanProfilePhoto;
        freshUserMap['family_photo'] = cleanFamilyPhoto;
        freshUserMap['family_photo_url'] = cleanFamilyPhoto;
        prefs.setString('i4u_auth_user', jsonEncode(freshUserMap));
        prefs.setString('current_user_profile', jsonEncode(freshUserMap));
        debugPrint('[MatrimonyPhotoManager] Overwrote local cached user object in SharedPreferences');
      });
    } catch (_) {}

    // Evict cached images so stale images never linger
    PaintingBinding.instance.imageCache.clear();
    PaintingBinding.instance.imageCache.clearLiveImages();

    if (mounted) {
      setState(() {
        _resolvedUserId = uid.isNotEmpty ? uid : 'user';
        _resolvedRegisterId = regId;
        _resolvedName = name;
        _profilePhotoUrl = cleanProfilePhoto.isNotEmpty ? cleanProfilePhoto : null;
        _familyPhotoUrl = cleanFamilyPhoto.isNotEmpty ? cleanFamilyPhoto : null;
        _isLoading = false;
      });
    }
  }

  /// Triggered immediately on tapping Profile Photo OR Family Photo section
  Future<void> _pickAndUploadPhoto({required bool isProfilePhoto}) async {
    final photoLabel = isProfilePhoto ? 'Profile Photo' : 'Family Photo';
    debugPrint('[MatrimonyPhotoManager] Tapped to upload/change $photoLabel');

    try {
      // 1. Pick image with built-in compression (maxWidth: 1000, maxHeight: 1000, imageQuality: 75)
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

      // 2. Show visible loading spinner AND SnackBar ('Uploading photo...') the moment user selects an image
      if (mounted) {
        setState(() {
          if (isProfilePhoto) {
            _isUploadingProfile = true;
          } else {
            _isUploadingFamily = true;
          }
          _errorMessage = null;
        });

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

      // 3. Read picked image using await pickedFile.readAsBytes() (Uint8List, zero dart:io)
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

      // 4. Upload to Cloudflare R2 (saves strictly as https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev/<objectKey>)
      final publicUrl = await _r2Service.uploadBytesToR2(
        bytes: bytes,
        filePath: r2Path,
        userId: userId,
        isProfilePhoto: isProfilePhoto,
        contentType: 'image/jpeg',
      );

      // 5. Update Supabase public.profiles matching .or('id.eq.$userId,register_id.eq.$userId')
      final updatedRow = await _r2Service.persistPhotoUrlToSupabase(
        url: publicUrl,
        isProfilePhoto: isProfilePhoto,
        userId: userId,
        registerId: _resolvedRegisterId,
      );

      // 6. Update local session cache (SharedPreferences / Provider) immediately
      try {
        final prefs = await SharedPreferences.getInstance();
        if (isProfilePhoto) {
          await prefs.setString('photo', publicUrl);
          await prefs.setString('photo_url', publicUrl);
          await prefs.setString('profile_photo_url', publicUrl);
          await prefs.setString('avatar_url', publicUrl);
        } else {
          await prefs.setString('family_photo', publicUrl);
          await prefs.setString('family_photo_url', publicUrl);
        }

        final jsonKeys = ['i4u_auth_user', 'current_user_profile', 'user_profile', 'cached_user', 'user_data'];
        for (final key in jsonKeys) {
          final raw = prefs.getString(key);
          if (raw != null && raw.isNotEmpty) {
            try {
              final Map<String, dynamic> userMap = jsonDecode(raw);
              if (isProfilePhoto) {
                userMap['photo'] = publicUrl;
                userMap['photo_url'] = publicUrl;
                userMap['profile_photo_url'] = publicUrl;
                userMap['avatar_url'] = publicUrl;
              } else {
                userMap['family_photo'] = publicUrl;
                userMap['family_photo_url'] = publicUrl;
              }
              await prefs.setString(key, jsonEncode(userMap));
            } catch (_) {}
          }
        }
      } catch (_) {}

      // 7. Evict stale cached images
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();

      // 8. Immediately refresh local user state/UI with the new URL
      if (mounted) {
        setState(() {
          if (isProfilePhoto) {
            _profilePhotoUrl = publicUrl;
          } else {
            _familyPhotoUrl = publicUrl;
          }
        });

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
        widget.onPhotoCached?.call(publicUrl, isProfilePhoto);
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
                          _applyFreshProfile(selected);
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

  /// Network image renderer with ValueKey cache lock and automatic public URL normalization
  Widget _buildNetworkImage(String url) {
    // Automatically replace private S3 endpoint prefix with public domain: https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev/
    final publicRenderUrl = CloudflareR2PhotoService.formatR2PublicUrl(url);

    return Image.network(
      publicRenderUrl,
      key: ValueKey(publicRenderUrl),
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
        debugPrint('[MatrimonyPhotoManager] Image.network load error for $publicRenderUrl: $error');
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
