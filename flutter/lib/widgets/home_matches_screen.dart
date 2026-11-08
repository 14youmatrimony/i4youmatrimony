import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_service.dart';
import '../services/cloudflare_r2_photo_service.dart';
import 'matrimony_photo_manager.dart';

/// Home / Matches Screen for I 4 You Matrimony
///
/// Features:
/// 1. Connects strictly to main Supabase project (kzvdzospvgzlfkkptadl).
/// 2. Fetches rows directly using `await Supabase.instance.client.from('profiles').select()`.
/// 3. Does NOT apply strict `.eq()` or `.neq()` filters that hide rows if fields are null.
/// 4. Safely parses all fields from `public.profiles` using `?? ''` fallbacks.
/// 5. Reads profile image via `photo ?? photo_url ?? ''`.
/// 6. Prints the count of fetched profiles in the debug console.
/// 7. Shows a clear status message if 0 profiles are returned or when loading fails.
class HomeMatchesScreen extends StatefulWidget {
  final VoidCallback? onOpenSettings;

  const HomeMatchesScreen({
    super.key,
    this.onOpenSettings,
  });

  @override
  State<HomeMatchesScreen> createState() => _HomeMatchesScreenState();
}

class _HomeMatchesScreenState extends State<HomeMatchesScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _profiles = [];
  int _fetchedCount = 0;

  @override
  void initState() {
    super.initState();
    _loadProfiles();
  }

  /// Fetches all profiles directly from Supabase public.profiles without restrictive filters
  Future<void> _loadProfiles() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // 1. Fetch rows directly from public.profiles without strict filters
      final dynamic response = await Supabase.instance.client
          .from('profiles')
          .select();

      final List<dynamic> rawRows = (response is List) ? response : [];
      _fetchedCount = rawRows.length;

      // 2. Print fetched profiles count to debug console as required
      debugPrint('====================================================');
      debugPrint('[HomeMatchesScreen] Fetched $_fetchedCount profiles from public.profiles');
      // ignore: avoid_print
      print('[HomeMatchesScreen] Fetched $_fetchedCount profiles from public.profiles');
      debugPrint('====================================================');

      // 3. Safely parse all fields handling nulls with ?? '' and sanitize photo URLs
      final parsedList = rawRows.map((row) {
        final map = (row is Map<String, dynamic>)
            ? row
            : Map<String, dynamic>.from(row as Map);
        return _safeParseProfile(map);
      }).toList();

      // 4. Overwrite local cached user object in SharedPreferences with fresh row
      try {
        final prefs = await SharedPreferences.getInstance();
        final currentUserId = prefs.getString('user_id') ?? prefs.getString('cached_user_id') ?? prefs.getString('id');
        final currentRegId = prefs.getString('register_id');
        if ((currentUserId != null && currentUserId.isNotEmpty) || (currentRegId != null && currentRegId.isNotEmpty)) {
          final matching = parsedList.firstWhere(
            (p) {
              final pId = (p['id'] ?? '').toString().trim().toLowerCase();
              final pReg = (p['register_id'] ?? '').toString().trim().toLowerCase();
              final cUid = (currentUserId ?? '').trim().toLowerCase();
              final cReg = (currentRegId ?? '').trim().toLowerCase();
              return (cUid.isNotEmpty && (pId == cUid || pReg == cUid)) ||
                     (cReg.isNotEmpty && (pReg == cReg || pId == cReg)) ||
                     (cReg.isNotEmpty && pId.startsWith('${cReg}_'));
            },
            orElse: () => {},
          );
          if (matching.isNotEmpty) {
            prefs.setString('photo', matching['photo'] as String);
            prefs.setString('photo_url', matching['photo_url'] as String);
            prefs.setString('profile_photo_url', matching['profile_photo_url'] as String);
            prefs.setString('avatar_url', matching['profile_photo_url'] as String);
            if (matching['family_photo'] != null) {
              prefs.setString('family_photo', matching['family_photo'] as String);
              prefs.setString('family_photo_url', matching['family_photo_url'] as String);
            }
            prefs.setString('i4u_auth_user', jsonEncode(matching));
            prefs.setString('current_user_profile', jsonEncode(matching));
            prefs.setString('user_profile', jsonEncode(matching));
            prefs.setString('cached_user', jsonEncode(matching));
            prefs.setString('user_data', jsonEncode(matching));
            debugPrint('[HomeMatchesScreen] Overwrote local cached user object from fresh Supabase query');
          }
        }
      } catch (_) {}

      if (mounted) {
        setState(() {
          _profiles = parsedList;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('[HomeMatchesScreen] Error fetching profiles: $e');
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  /// Safely extracts profile attributes, guaranteeing non-null values with ?? ''
  Map<String, dynamic> _safeParseProfile(Map<String, dynamic> row) {
    // Read photo ?? photo_url ?? '' for the profile image and sanitize URL
    final String rawPhoto = (row['photo'] ??
            row['photo_url'] ??
            row['profile_photo_url'] ??
            row['avatar_url'] ??
            '')
        .toString()
        .trim();
    final String photoImage = CloudflareR2PhotoService.formatR2PublicUrl(rawPhoto);

    final String rawFamily = (row['family_photo'] ??
            row['family_photo_url'] ??
            '')
        .toString()
        .trim();
    final String familyPhotoImage = CloudflareR2PhotoService.formatR2PublicUrl(rawFamily);

    // Safely extract photos and photo lists
    List<String> singleList = [];
    final dynamic rawSingles = row['single_photos'] ?? row['photos'];
    if (rawSingles is List) {
      singleList = rawSingles.map((e) => CloudflareR2PhotoService.formatR2PublicUrl(e.toString())).where((s) => s.isNotEmpty).toList();
    } else if (rawSingles is String && rawSingles.trim().startsWith('[')) {
      try {
        final decoded = jsonDecode(rawSingles);
        if (decoded is List) {
          singleList = decoded.map((e) => CloudflareR2PhotoService.formatR2PublicUrl(e.toString())).where((s) => s.isNotEmpty).toList();
        }
      } catch (_) {}
    }
    if (singleList.isEmpty && photoImage.isNotEmpty) {
      singleList = [photoImage];
    }

    List<String> familyList = [];
    final dynamic rawFamilies = row['family_photos'];
    if (rawFamilies is List) {
      familyList = rawFamilies.map((e) => CloudflareR2PhotoService.formatR2PublicUrl(e.toString())).where((s) => s.isNotEmpty).toList();
    } else if (rawFamilies is String && rawFamilies.trim().startsWith('[')) {
      try {
        final decoded = jsonDecode(rawFamilies);
        if (decoded is List) {
          familyList = decoded.map((e) => CloudflareR2PhotoService.formatR2PublicUrl(e.toString())).where((s) => s.isNotEmpty).toList();
        }
      } catch (_) {}
    }
    if (familyList.isEmpty && familyPhotoImage.isNotEmpty) {
      familyList = [familyPhotoImage];
    }

    final String name = (row['name'] ?? row['full_name'] ?? 'Candidate').toString().trim();
    final String fullName = (row['full_name'] ?? row['name'] ?? '').toString().trim();
    final String id = (row['id'] ?? '').toString().trim();
    final String registerId = (row['register_id'] ?? id).toString().trim();
    final String gender = (row['gender'] ?? '').toString().trim();
    final String age = row['age'] != null ? row['age'].toString() : '';
    final String height = (row['height'] ?? '').toString().trim();
    final String district = (row['district'] ?? row['city'] ?? '').toString().trim();
    final String state = (row['state'] ?? '').toString().trim();
    final String city = (row['city'] ?? '').toString().trim();
    final String religion = (row['religion'] ?? '').toString().trim();
    final String caste = (row['caste'] ?? '').toString().trim();
    final String education = (row['education'] ?? row['education_category'] ?? '').toString().trim();
    final String profession = (row['profession'] ?? '').toString().trim();
    final String maritalStatus = (row['marital_status'] ?? '').toString().trim();
    final String status = (row['status'] ?? 'active').toString().trim();
    final String about = (row['about'] ?? '').toString().trim();

    return {
      'id': id,
      'register_id': registerId,
      'name': name.isEmpty ? 'Candidate' : name,
      'full_name': fullName,
      'photo': photoImage,
      'photo_url': photoImage,
      'profile_photo_url': photoImage,
      'photos': singleList,
      'single_photos': singleList,
      'family_photo': familyPhotoImage,
      'family_photo_url': familyPhotoImage,
      'family_photos': familyList,
      'gender': gender,
      'age': age,
      'height': height,
      'district': district,
      'state': state,
      'city': city,
      'religion': religion,
      'caste': caste,
      'education': education,
      'profession': profession,
      'marital_status': maritalStatus,
      'status': status,
      'about': about,
      'raw': row,
    };
  }

  Widget _buildAvatar(String imageUrl, String name) {
    final cleanUrl = CloudflareR2PhotoService.formatR2PublicUrl(imageUrl);
    if (cleanUrl.isNotEmpty &&
        (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://'))) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Image.network(
          cleanUrl,
          key: ValueKey(cleanUrl),
          width: 80,
          height: 80,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => _buildAvatarFallback(name),
          loadingBuilder: (context, child, progress) {
            if (progress == null) return child;
            return Container(
              width: 80,
              height: 80,
              color: Colors.grey.shade100,
              child: const Center(
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            );
          },
        ),
      );
    }
    return _buildAvatarFallback(name);
  }

  Widget _buildAvatarFallback(String name) {
    final initials = name.trim().isNotEmpty
        ? name.trim().substring(0, 1).toUpperCase()
        : 'C';
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: const Color(0xFFFEE2E2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFECDD3)),
      ),
      child: Center(
        child: Text(
          initials,
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Color(0xFFE11D48),
          ),
        ),
      ),
    );
  }

  void _showProfileDetails(Map<String, dynamic> profile) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _buildAvatar(profile['photo'] as String, profile['name'] as String),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            profile['name'] as String,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'ID: ${profile['register_id']}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFA7F3D0)),
                            ),
                            child: Text(
                              profile['status'] as String,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF059669),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 12),
                _buildDetailRow('Gender', profile['gender'] as String),
                _buildDetailRow('Age', profile['age'] as String),
                _buildDetailRow('Height', profile['height'] as String),
                _buildDetailRow('Location', [
                  profile['district'],
                  profile['state'],
                ].where((s) => s.toString().trim().isNotEmpty).join(', ')),
                _buildDetailRow('Education', profile['education'] as String),
                _buildDetailRow('Profession', profile['profession'] as String),
                _buildDetailRow('Community', [
                  profile['religion'],
                  profile['caste'],
                ].where((s) => s.toString().trim().isNotEmpty).join(' - ')),
                _buildDetailRow('Marital Status', profile['marital_status'] as String),
                if ((profile['about'] as String).isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text(
                    'About Candidate',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    profile['about'] as String,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade700,
                      height: 1.4,
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (c) => Scaffold(
                                appBar: AppBar(
                                  title: Text('Edit Photos: ${profile['name']}'),
                                ),
                                body: MatrimonyPhotoManager(
                                  customUserId: (profile['id'] ?? '').toString(),
                                  customRegisterId: (profile['register_id'] ?? '').toString(),
                                  onPhotosUpdated: _loadProfiles,
                                ),
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.add_a_photo_rounded, size: 18),
                        label: const Text('Edit / Upload Photos'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0B192C),
                          foregroundColor: const Color(0xFFDFB76C),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.grey.shade200,
                        foregroundColor: const Color(0xFF334155),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
                      ),
                      child: const Text('Close'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: RefreshIndicator(
        onRefresh: _loadProfiles,
        color: const Color(0xFFE11D48),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Status and Header Banner
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0B192C), Color(0xFF1E3A8A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: const Color(0xFF10B981).withOpacity(0.4),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.check_circle_rounded,
                                  color: Color(0xFF34D399), size: 14),
                              SizedBox(width: 6),
                              Text(
                                'Supabase Live Connected',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF34D399),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
                          tooltip: 'Reload Profiles',
                          onPressed: _isLoading ? null : _loadProfiles,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Verified Matrimonial Profiles',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Loaded directly from public.profiles (${SupabaseService.extractProjectRef(SupabaseService.defaultUrl)})',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFFCBD5E1),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Fetched: $_fetchedCount profiles',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Content Area: Loading / Error / Empty / List
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(color: Color(0xFFE11D48)),
                      SizedBox(height: 16),
                      Text(
                        'Fetching profiles from Supabase...',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else if (_errorMessage != null)
              SliverFillRemaining(
                child: Center(
                  child: Container(
                    margin: const EdgeInsets.all(24),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline_rounded,
                            color: Color(0xFFE11D48), size: 48),
                        const SizedBox(height: 12),
                        const Text(
                          'Database Query Failed',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadProfiles,
                          icon: const Icon(Icons.refresh_rounded, size: 16),
                          label: const Text('Retry Connection'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE11D48),
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else if (_profiles.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Container(
                    margin: const EdgeInsets.all(24),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.people_outline_rounded,
                            size: 56, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        const Text(
                          '0 profiles returned',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'No records found in public.profiles for project kzvdzospvgzlfkkptadl.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadProfiles,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE11D48),
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Refresh'),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final profile = _profiles[index];
                      return _buildProfileCard(profile, index);
                    },
                    childCount: _profiles.length,
                  ),
                ),
              ),
            const SliverToBoxAdapter(
              child: SizedBox(height: 32),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileCard(Map<String, dynamic> profile, int index) {
    final photo = profile['photo'] as String;
    final name = profile['name'] as String;
    final age = profile['age'] as String;
    final gender = profile['gender'] as String;
    final location = [
      profile['district'],
      profile['state'],
    ].where((s) => s.toString().trim().isNotEmpty).join(', ');
    final profession = profile['profession'] as String;
    final education = profile['education'] as String;
    final community = [
      profile['religion'],
      profile['caste'],
    ].where((s) => s.toString().trim().isNotEmpty).join(' - ');

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      color: Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showProfileDetails(profile),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildAvatar(photo, name),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '#${index + 1}',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (age.isNotEmpty || gender.isNotEmpty)
                      Text(
                        [age.isNotEmpty ? '$age yrs' : '', gender]
                            .where((s) => s.isNotEmpty)
                            .join(' • '),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    if (location.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(Icons.location_on_outlined,
                              size: 13, color: Colors.grey.shade500),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              location,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (profession.isNotEmpty || education.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(Icons.work_outline_rounded,
                              size: 13, color: Colors.grey.shade500),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              profession.isNotEmpty ? profession : education,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (community.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        community,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
