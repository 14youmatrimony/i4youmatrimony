import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Central Supabase Configuration & Profile Synchronization Service for I 4 You Matrimony
class SupabaseService {
  static const String defaultUrl = 'https://pheqzsfrwhjxspaaroea.supabase.co';
  static const String defaultAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZXF6c2Zyd2hqeHNwYWFyb2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjY2MjgsImV4cCI6MjEwNzU0MjYyOH0.U-W92yqF0vMoyqK-uScBSjlV6LtfuAMV9J2ncPaL6PI';

  /// Normalizes any Supabase URL format:
  /// Converts dashboard links (e.g. https://supabase.com/dashboard/project/pheqzsfrwhjxspaaroea/...)
  /// into the standard Supabase API endpoint (https://pheqzsfrwhjxspaaroea.supabase.co).
  static String normalizeUrl(String url) {
    if (url.isEmpty) return defaultUrl;
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    final match = RegExp(r'supabase\.com/dashboard/project/([a-z0-9]+)', caseSensitive: false).firstMatch(clean);
    if (match != null && match.group(1) != null) {
      return 'https://${match.group(1)}.supabase.co';
    }
    return clean;
  }

  /// Initialize Supabase client
  static Future<void> initialize({String? url, String? anonKey}) async {
    final targetUrl = normalizeUrl(url ?? defaultUrl);
    final targetKey = (anonKey != null && anonKey.isNotEmpty) ? anonKey : defaultAnonKey;

    await Supabase.initialize(
      url: targetUrl,
      anonKey: targetKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
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
