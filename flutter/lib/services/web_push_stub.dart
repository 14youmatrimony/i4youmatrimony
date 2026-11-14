import 'package:flutter/foundation.dart';

/// Request notification permission and subscribe to Web Push notifications using VAPID key.
/// (Non-web platforms return null)
Future<Map<String, dynamic>?> subscribeToWebPush({
  required String vapidPublicKey,
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
