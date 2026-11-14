import 'dart:convert';
import 'dart:html' as html;
import 'dart:js_util' as js_util;
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Converts a base64url encoded VAPID public key into a Uint8List for PushManager.
Uint8List _urlBase64ToUint8List(String base64String) {
  var base64 = base64String.replaceAll('-', '+').replaceAll('_', '/');
  while (base64.length % 4 != 0) {
    base64 += '=';
  }
  return Uint8List.fromList(base64Decode(base64));
}

/// Default VAPID Public Key for Web Push Notifications
const String defaultVapidPublicKey =
    'BIkSQCoyw-J2gPIo_V84wnTtvWUjp78bblj2GvuH7t4i4aVbKfwF6bezusVrwCvIJBGcAtUtHo5mP3rGLZuItL8';

/// Requests notification permission and subscribes the user to Web Push
/// notifications using the provided public VAPID key (or [defaultVapidPublicKey]).
///
/// Returns the JSON push subscription containing `endpoint`, `keys.p256dh`,
/// and `keys.auth`, or null if permission was denied or an error occurred.
Future<Map<String, dynamic>?> subscribeToWebPush({
  String vapidPublicKey = defaultVapidPublicKey,
  String? userId,
}) async {
  try {
    // 1. Request notification permission from browser
    final permission = await html.Notification.requestPermission();
    if (permission != 'granted') {
      debugPrint('[WebPush] Notification permission was not granted: $permission');
      return null;
    }

    // 2. Check for ServiceWorker support
    final serviceWorker = html.window.navigator.serviceWorker;
    if (serviceWorker == null) {
      debugPrint('[WebPush] ServiceWorker is not supported in this browser.');
      return null;
    }

    // Wait until the service worker is active and ready
    final registration = await js_util.promiseToFuture<dynamic>(
      js_util.getProperty(serviceWorker, 'ready'),
    );

    final pushManager = js_util.getProperty(registration, 'pushManager');
    if (pushManager == null) {
      debugPrint('[WebPush] PushManager is not supported by this browser.');
      return null;
    }

    // 3. Convert VAPID key to applicationServerKey Uint8List
    final applicationServerKey = _urlBase64ToUint8List(vapidPublicKey);

    // 4. Subscribe with PushManager
    final subscribeOptions = js_util.newObject();
    js_util.setProperty(subscribeOptions, 'userVisibleOnly', true);
    js_util.setProperty(subscribeOptions, 'applicationServerKey', applicationServerKey);

    final subscription = await js_util.promiseToFuture<dynamic>(
      js_util.callMethod(pushManager, 'subscribe', [subscribeOptions]),
    );

    // 5. Serialize subscription into JSON Map
    final rawJson = js_util.callMethod(subscription, 'toJSON', []);
    final jsonString = js_util.callMethod(
      js_util.getProperty(html.window, 'JSON'),
      'stringify',
      [rawJson],
    ) as String;

    final Map<String, dynamic> subscriptionJson = jsonDecode(jsonString);
    debugPrint('[WebPush] Subscribed successfully: ${subscriptionJson['endpoint']}');

    // 6. Automatically save into Supabase user_devices if user is authenticated or specified
    final activeUserId = userId ?? Supabase.instance.client.auth.currentUser?.id;
    if (activeUserId != null && activeUserId.isNotEmpty) {
      await saveWebPushSubscriptionToSupabase(
        subscriptionJson: subscriptionJson,
        userId: activeUserId,
      );
    }

    return subscriptionJson;
  } catch (e) {
    debugPrint('[WebPush] Error during web push subscription: $e');
    return null;
  }
}

/// Saves the resulting JSON push subscription (endpoint, keys.p256dh, keys.auth)
/// into the Supabase `user_devices` table, setting the `platform` column to 'web'.
Future<bool> saveWebPushSubscriptionToSupabase({
  required Map<String, dynamic> subscriptionJson,
  String? userId,
}) async {
  try {
    // 1. Resolve user ID: explicit parameter or current Supabase auth user
    String? resolvedUserId = userId;
    if (resolvedUserId == null || resolvedUserId.isEmpty) {
      try {
        resolvedUserId = Supabase.instance.client.auth.currentUser?.id;
      } catch (_) {}
    }

    if (resolvedUserId == null || resolvedUserId.isEmpty) {
      debugPrint('[WebPush] Cannot save push subscription: No active Supabase user found.');
      return false;
    }

    // 2. Extract subscription values (endpoint, keys.p256dh, keys.auth)
    final endpoint = subscriptionJson['endpoint'] as String? ?? '';
    final keys = (subscriptionJson['keys'] as Map<dynamic, dynamic>?) ?? {};
    final p256dh = keys['p256dh'] as String? ?? '';
    final auth = keys['auth'] as String? ?? '';
    final encodedJson = jsonEncode(subscriptionJson);

    // 3. Upsert into Supabase user_devices table with platform set to 'web'
    try {
      await Supabase.instance.client.from('user_devices').upsert({
        'user_id': resolvedUserId,
        'device_token': encodedJson,
        'platform': 'web',
        'endpoint': endpoint,
        'p256dh': p256dh,
        'auth': auth,
      });
      debugPrint('[WebPush] Successfully saved push subscription in user_devices for user: $resolvedUserId');
      return true;
    } catch (_) {
      // Fallback: If table schema only includes basic columns (user_id, device_token, platform)
      await Supabase.instance.client.from('user_devices').upsert({
        'user_id': resolvedUserId,
        'device_token': encodedJson,
        'platform': 'web',
      });
      debugPrint('[WebPush] Saved push subscription into user_devices (standard columns).');
      return true;
    }
  } catch (err) {
    debugPrint('[WebPush] Error saving push subscription to Supabase user_devices: $err');
    return false;
  }
}
