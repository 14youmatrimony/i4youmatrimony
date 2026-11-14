import 'package:flutter/foundation.dart';

/// Default VAPID Public Key for Web Push Notifications
const String defaultVapidPublicKey =
    'BIkSQCoyw-J2gPIo_V84wnTtvWUjp78bblj2GvuH7t4i4aVbKfwF6bezusVrwCvIJBGcAtUtHo5mP3rGLZuItL8';

/// Request notification permission and subscribe to Web Push notifications using VAPID key.
/// (Non-web platforms return null)
Future<Map<String, dynamic>?> subscribeToWebPush({
  String vapidPublicKey = defaultVapidPublicKey,
  String? userId,
}) async {
  debugPrint('[WebPush] Web push is only supported in web environments.');
  return null;
}

/// Save web push subscription JSON into Supabase user_devices table.
/// (Non-web platforms return false)
Future<bool> saveWebPushSubscriptionToSupabase({
  required Map<String, dynamic> subscriptionJson,
  String? userId,
}) async {
  debugPrint('[WebPush] Web push persistence is only supported in web environments.');
  return false;
}
