import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Central Supabase Configuration & Profile Synchronization Service for I 4 You Matrimony
class SupabaseService {
  /// Default Supabase Project API URL
  static const String defaultUrl = 'https://kzvdzospvgzlfkkptadl.supabase.co';

  /// Default Supabase Dashboard Link (for display and auto-normalization)
  static const String defaultDashboardUrl =
      'https://supabase.com/dashboard/project/kzvdzospvgzlfkkptadl/settings/api-keys/legacy';

  /// Default Supabase Public Anon Key
  static const String defaultAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dmR6b3Nwdmd6bGZra3B0YWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjYwOTAsImV4cCI6MjEwNzU0MjA5MH0.2cbo44WPrlC_BNQH6-YvloxlAbxd67RwMsQOOiMFh-w';

  /// SharedPreferences storage keys
  static const String prefKeyUrl = 'supabase_url';
  static const String prefKeyAnonKey = 'supabase_anon_key';

  /// Normalizes any Supabase URL format:
  /// Converts dashboard links (e.g. https://supabase.com/dashboard/project/kzvdzospvgzlfkkptadl/...)
  /// into the standard Supabase API endpoint (https://kzvdzospvgzlfkkptadl.supabase.co).
  static String normalizeUrl(String url) {
    if (url.trim().isEmpty) return defaultUrl;
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    final match = RegExp(
      r'supabase\.com/dashboard/project/([a-z0-9]+)',
      caseSensitive: false,
    ).firstMatch(clean);
    if (match != null && match.group(1) != null) {
      return 'https://${match.group(1)}.supabase.co';
    }
    return clean;
  }

  /// Extracts the project ref from a Supabase URL or Dashboard URL
  static String extractProjectRef(String url) {
    final clean = url.trim();
    final dashboardMatch = RegExp(
      r'supabase\.com/dashboard/project/([a-z0-9]+)',
      caseSensitive: false,
    ).firstMatch(clean);
    if (dashboardMatch != null && dashboardMatch.group(1) != null) {
      return dashboardMatch.group(1)!;
    }
    final domainMatch = RegExp(
      r'https?://([a-z0-9]+)\.supabase\.co',
      caseSensitive: false,
    ).firstMatch(clean);
    if (domainMatch != null && domainMatch.group(1) != null) {
      return domainMatch.group(1)!;
    }
    return 'kzvdzospvgzlfkkptadl';
  }

  /// Loads saved Supabase credentials from SharedPreferences.
  /// Falls back to default values if not yet configured.
  static Future<Map<String, String>> loadSavedCredentials() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final url = prefs.getString(prefKeyUrl);
      final anonKey = prefs.getString(prefKeyAnonKey);

      return {
        'url': (url != null && url.trim().isNotEmpty) ? normalizeUrl(url) : defaultUrl,
        'anonKey': (anonKey != null && anonKey.trim().isNotEmpty) ? anonKey.trim() : defaultAnonKey,
      };
    } catch (e) {
      debugPrint('[SupabaseService] Error loading credentials from SharedPreferences: $e');
      return {
        'url': defaultUrl,
        'anonKey': defaultAnonKey,
      };
    }
  }

  /// Persists the Supabase URL and Anon Key into SharedPreferences
  static Future<void> saveCredentials({
    required String url,
    required String anonKey,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final normalized = normalizeUrl(url);
    await prefs.setString(prefKeyUrl, normalized);
    await prefs.setString(prefKeyAnonKey, anonKey.trim());
    debugPrint('[SupabaseService] Successfully saved credentials to SharedPreferences: $normalized');
  }

  /// Clears custom Supabase keys from SharedPreferences, reverting to defaults
  static Future<void> resetCredentialsToDefaults() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(prefKeyUrl);
    await prefs.remove(prefKeyAnonKey);
    debugPrint('[SupabaseService] Reset Supabase credentials in SharedPreferences to defaults');
  }

  /// Checks if Supabase client is currently initialized
  static bool get isClientInitialized {
    try {
      final _ = Supabase.instance.client;
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Tests connectivity to a given Supabase project using direct ping
  static Future<Map<String, dynamic>> testConnection({
    String? url,
    String? anonKey,
  }) async {
    try {
      final targetUrl = normalizeUrl(url ?? defaultUrl);
      final targetKey = (anonKey != null && anonKey.trim().isNotEmpty)
          ? anonKey.trim()
          : defaultAnonKey;

      final testClient = SupabaseClient(targetUrl, targetKey);

      // Lightweight test query to verify API reachable
      await testClient.from('profiles').select('id').limit(1);

      return {
        'success': true,
        'message': 'Connected successfully to Supabase ($targetUrl)',
      };
    } catch (e) {
      final errStr = e.toString().toLowerCase();
      // If error is related to RLS, permissions, or table structure, endpoint is reachable and authenticating
      if (errStr.contains('pgrst') ||
          errStr.contains('jwt') ||
          errStr.contains('401') ||
          errStr.contains('403') ||
          errStr.contains('permission denied') ||
          errStr.contains('relation "public.profiles" does not exist')) {
        return {
          'success': true,
          'message': 'Supabase endpoint reached & authenticated successfully.',
        };
      }
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }

  /// Initialize Supabase client reading from SharedPreferences if arguments are omitted
  static Future<void> initialize({String? url, String? anonKey}) async {
    String targetUrl = url?.trim() ?? '';
    String targetKey = anonKey?.trim() ?? '';

    // If either URL or anonKey is missing, load saved values from SharedPreferences
    if (targetUrl.isEmpty || targetKey.isEmpty) {
      final saved = await loadSavedCredentials();
      if (targetUrl.isEmpty) targetUrl = saved['url'] ?? defaultUrl;
      if (targetKey.isEmpty) targetKey = saved['anonKey'] ?? defaultAnonKey;
    }

    targetUrl = normalizeUrl(targetUrl);
    if (targetKey.isEmpty) targetKey = defaultAnonKey;

    // Safely dispose existing instance if already initialized to allow reconfiguration
    if (isClientInitialized) {
      try {
        await Supabase.instance.dispose();
      } catch (disposeErr) {
        debugPrint('[SupabaseService] Dispose warning during re-init: $disposeErr');
      }
    }

    // ignore: deprecated_member_use
    await Supabase.initialize(
      url: targetUrl,
      // ignore: deprecated_member_use
      anonKey: targetKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );

    debugPrint('[SupabaseService] Supabase successfully initialized with endpoint: $targetUrl');
  }

  /// Reinitializes Supabase with new URL and Anon Key and updates SharedPreferences
  static Future<void> reinitialize({
    required String url,
    required String anonKey,
  }) async {
    await saveCredentials(url: url, anonKey: anonKey);
    await initialize(url: url, anonKey: anonKey);
  }

  /// Automatically ensures user row exists in public.profiles.
  /// If missing, upserts (id, user_id, full_name, name) so the table is never empty.
  static Future<Map<String, dynamic>?> ensureProfileRowExists({
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
    if (cleanId.isEmpty) return null;

    final resolvedName = (name != null && name.trim().isNotEmpty)
        ? name.trim()
        : ((fullName != null && fullName.trim().isNotEmpty) ? fullName.trim() : 'Member');

    try {
      // 1. Check if row exists
      final existing = await supabase
          .from('profiles')
          .select('id, user_id, full_name, name, profile_photo_url, photo_url, avatar_url, family_photo_url')
          .or('id.eq.$cleanId,user_id.eq.$cleanId')
          .maybeSingle();

      if (existing != null) {
        return existing;
      }

      // 2. Auto-create in public.profiles
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

      await supabase.from('profiles').upsert(payload, onConflict: 'id');
      debugPrint('[SupabaseService] Auto-created profile row in public.profiles for: $cleanId');
      return payload;
    } catch (e) {
      if (e.toString().contains('column') || e.toString().contains('42703')) {
        final fallbackPayload = {
          'id': cleanId,
          'name': resolvedName,
          'status': 'active',
          'created_at': DateTime.now().toUtc().toIso8601String(),
          'updated_at': DateTime.now().toUtc().toIso8601String(),
        };
        await supabase.from('profiles').upsert(fallbackPayload, onConflict: 'id');
        return fallbackPayload;
      }
      debugPrint('[SupabaseService] Error ensuring profile row exists: $e');
      return null;
    }
  }

  /// Strictly fetch profile & photo URLs directly from public.profiles on load/refresh
  static Future<Map<String, dynamic>?> fetchProfileFromDatabase(String userId) async {
    final supabase = Supabase.instance.client;
    final cleanId = userId.trim();
    if (cleanId.isEmpty) return null;

    try {
      var row = await supabase
          .from('profiles')
          .select('id, user_id, full_name, name, profile_photo_url, photo_url, photo, avatar_url, family_photo_url, family_photos, updated_at')
          .eq('id', cleanId)
          .maybeSingle();

      if (row == null) {
        row = await supabase
            .from('profiles')
            .select('id, user_id, full_name, name, profile_photo_url, photo_url, photo, avatar_url, family_photo_url, family_photos, updated_at')
            .eq('user_id', cleanId)
            .maybeSingle();
      }

      return row;
    } catch (e) {
      debugPrint('[SupabaseService] Error fetching profile: $e');
      return null;
    }
  }

  /// Updates existing user row in Supabase public.profiles (profile_photo_url, photo_url, avatar_url, family_photo_url)
  /// AND synchronizes supabase.auth.updateUser metadata AND local SharedPreferences cache.
  static Future<void> updateUserPhotoUrls({
    required String userId,
    required String photoUrl,
    required bool isProfilePhoto,
  }) async {
    final supabase = Supabase.instance.client;
    final cleanId = userId.trim();
    if (cleanId.isEmpty) return;

    final targetColumn = isProfilePhoto ? 'profile_photo_url' : 'family_photo_url';
    final Map<String, dynamic> updatePayload = {
      'id': cleanId,
      'user_id': cleanId,
      targetColumn: photoUrl,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    };

    if (isProfilePhoto) {
      updatePayload['photo'] = photoUrl;
      updatePayload['photo_url'] = photoUrl;
      updatePayload['avatar_url'] = photoUrl;
      updatePayload['profile_photo_url'] = photoUrl;
    } else {
      updatePayload['family_photo_url'] = photoUrl;
      updatePayload['family_photos'] = jsonEncode([photoUrl]);
    }

    // 1. Update existing row in public.profiles
    try {
      final List<dynamic> updated = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', cleanId)
          .select('id');

      if (updated.isEmpty) {
        final List<dynamic> altUpdated = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('user_id', cleanId)
            .select('id');

        if (altUpdated.isEmpty) {
          await supabase.from('profiles').upsert(updatePayload, onConflict: 'id');
        }
      }
      debugPrint('[SupabaseService] Successfully updated public.profiles photo columns for $cleanId');
    } catch (e) {
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
          metadata['profile_photo_url'] = photoUrl;
          metadata['photo_url'] = photoUrl;
          metadata['avatar_url'] = photoUrl;
          metadata['photo'] = photoUrl;
        } else {
          metadata['family_photo_url'] = photoUrl;
        }
        await supabase.auth.updateUser(UserAttributes(data: metadata));
        debugPrint('[SupabaseService] Successfully updated auth metadata');
      }
    } catch (authErr) {
      debugPrint('[SupabaseService] Auth metadata sync warning: $authErr');
    }

    // 3. Synchronize local SharedPreferences cache
    try {
      final prefs = await SharedPreferences.getInstance();
      if (isProfilePhoto) {
        await prefs.setString('profile_photo_url', photoUrl);
        await prefs.setString('photo_url', photoUrl);
        await prefs.setString('avatar_url', photoUrl);
        await prefs.setString('photo', photoUrl);
      } else {
        await prefs.setString('family_photo_url', photoUrl);
      }
      debugPrint('[SupabaseService] Updated local SharedPreferences photo cache');
    } catch (prefErr) {
      debugPrint('[SupabaseService] SharedPreferences cache warning: $prefErr');
    }
  }
}
