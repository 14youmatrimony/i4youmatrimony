import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'web_push_service.dart' as web_push;

/// Top-level background message handler for Firebase Cloud Messaging.
///
/// MUST be a top-level function (not an anonymous function or class method)
/// and annotated with `@pragma('vm:entry-point')` so the Flutter engine can
/// invoke it in an isolated background thread when a message arrives while
/// the app is in background or terminated.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Ensure Firebase is initialized inside the background isolate
  await Firebase.initializeApp();

  debugPrint('[NotificationService] Background message received: ${message.messageId}');
  debugPrint('[NotificationService] Title: ${message.notification?.title}');
  debugPrint('[NotificationService] Body: ${message.notification?.body}');
  debugPrint('[NotificationService] Data payload: ${message.data}');
}

/// Firebase Cloud Messaging service managing permissions, token synchronization
/// with Supabase `user_devices`, and incoming notification handlers.
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  /// Initializes FCM: registers background handler, requests user permission,
  /// sets up foreground listeners, and syncs initial token with Supabase.
  static Future<void> initialize({
    void Function(RemoteMessage message)? onForegroundMessage,
    void Function(RemoteMessage message)? onMessageOpenedApp,
  }) async {
    try {
      // 1. Set top-level background message handler
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      // 2. Request notification permissions from user
      await requestPermission();

      // 3. Configure foreground presentation options (alert, badge, sound)
      await _messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // 4. Foreground message listener
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[NotificationService] Foreground notification: ${message.messageId}');
        debugPrint('[NotificationService] Title: ${message.notification?.title}');
        debugPrint('[NotificationService] Body: ${message.notification?.body}');
        debugPrint('[NotificationService] Data: ${message.data}');

        if (onForegroundMessage != null) {
          onForegroundMessage(message);
        }
      });

      // 5. App opened from background by tapping a notification
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('[NotificationService] Notification opened from background: ${message.messageId}');
        if (onMessageOpenedApp != null) {
          onMessageOpenedApp(message);
        }
      });

      // 6. App launched from terminated state by tapping a notification
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('[NotificationService] App launched from terminated state: ${initialMessage.messageId}');
        if (onMessageOpenedApp != null) {
          onMessageOpenedApp(initialMessage);
        }
      }

      // 7. Token refresh listener: automatically update Supabase
      _messaging.onTokenRefresh.listen((newToken) {
        debugPrint('[NotificationService] FCM token refreshed: $newToken');
        saveTokenToSupabase(token: newToken);
      });

      // 8. Retrieve and persist initial device token
      final token = await getDeviceToken();
      if (token != null) {
        await saveTokenToSupabase(token: token);
      }
    } catch (e) {
      debugPrint('[NotificationService] Initialization error: $e');
    }
  }

  /// Request notification permissions from the user.
  static Future<NotificationSettings> requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    debugPrint('[NotificationService] Permission status: ${settings.authorizationStatus}');
    return settings;
  }

  /// Retrieve the current FCM device token.
  static Future<String?> getDeviceToken() async {
    try {
      final token = await _messaging.getToken();
      debugPrint('[NotificationService] FCM Device Token: $token');
      return token;
    } catch (e) {
      debugPrint('[NotificationService] Error retrieving FCM device token: $e');
      return null;
    }
  }

  /// Save FCM token into Supabase `user_devices` table.
  ///
  /// Columns updated:
  /// - `user_id`: Authenticated user ID (or explicitly provided)
  /// - `device_token`: The FCM registration token
  /// - `platform`: Strictly set to 'android'
  static Future<bool> saveTokenToSupabase({
    String? userId,
    String? token,
  }) async {
    try {
      // 1. Resolve user ID: use explicit parameter or current Supabase auth user
      String? resolvedUserId = userId;
      if (resolvedUserId == null || resolvedUserId.isEmpty) {
        try {
          resolvedUserId = Supabase.instance.client.auth.currentUser?.id;
        } catch (_) {}
      }

      if (resolvedUserId == null || resolvedUserId.isEmpty) {
        debugPrint('[NotificationService] Skipped saving token: No authenticated Supabase user found.');
        return false;
      }

      // 2. Resolve FCM token: use explicit parameter or retrieve current token
      final resolvedToken = token ?? await getDeviceToken();
      if (resolvedToken == null || resolvedToken.isEmpty) {
        debugPrint('[NotificationService] Skipped saving token: Token is null or empty.');
        return false;
      }

      // 3. Upsert token record into existing `user_devices` table
      await Supabase.instance.client.from('user_devices').upsert({
        'user_id': resolvedUserId,
        'device_token': resolvedToken,
        'platform': 'android',
      });

      debugPrint('[NotificationService] Successfully saved device token in user_devices for user: $resolvedUserId');
      return true;
    } catch (e) {
      debugPrint('[NotificationService] Error saving token to Supabase user_devices: $e');
      return false;
    }
  }

  // Web Push (VAPID) Integration
  /// Requests notification permission and subscribes the user to Web Push notifications using VAPID key.
  static Future<Map<String, dynamic>?> subscribeWebPush({
    required String vapidPublicKey,
    String? userId,
  }) =>
      web_push.subscribeToWebPush(
        vapidPublicKey: vapidPublicKey,
        userId: userId,
      );

  /// Saves the resulting JSON push subscription (endpoint, keys.p256dh, keys.auth)
  /// into the Supabase `user_devices` table with platform set to 'web'.
  static Future<bool> saveWebSubscriptionToSupabase({
    required Map<String, dynamic> subscriptionJson,
    String? userId,
  }) =>
      web_push.saveWebPushSubscriptionToSupabase(
        subscriptionJson: subscriptionJson,
        userId: userId,
      );

  // Instance method delegates for flexibility
  Future<NotificationSettings> requestUserPermission() => requestPermission();
  Future<String?> retrieveDeviceToken() => getDeviceToken();
  Future<bool> saveDeviceToken({String? userId, String? token}) =>
      saveTokenToSupabase(userId: userId, token: token);
  Future<Map<String, dynamic>?> subscribeToWebPushNotification({
    required String vapidPublicKey,
    String? userId,
  }) =>
      subscribeWebPush(vapidPublicKey: vapidPublicKey, userId: userId);
  Future<bool> saveWebPushSubscription({
    required Map<String, dynamic> subscriptionJson,
    String? userId,
  }) =>
      saveWebSubscriptionToSupabase(
        subscriptionJson: subscriptionJson,
        userId: userId,
      );
}
