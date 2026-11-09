/**
 * I 4 You Matrimony - Standalone Web Push & Background Notification Service
 * 
 * Non-intrusive, isolated client-side Web Push subscription utility.
 * Supports Chrome, Firefox, Edge, Safari (macOS & iOS 16.4+ PWA standalone), and Android.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase.js';

/**
 * Helper to convert a URL-safe Base64 string to a Uint8Array
 * Required by registration.pushManager.subscribe({ applicationServerKey })
 */
export function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Invalid VAPID Public Key: string expected.');
  }

  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if Service Worker and Web Push are supported in current browser/environment
 */
export function isPushSupported() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return Boolean(
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Detect client platform/device type ('web' | 'android' | 'ios')
 */
export function getDeviceType() {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'web';
}

/**
 * Dynamically ensures the manifest link is present in the document head for PWA
 */
function ensureManifestLink() {
  if (typeof document === 'undefined') return;
  try {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }
  } catch (e) {
    // Ignore DOM head errors
  }
}

/**
 * Resolves the authenticated user ID (UUID) safely from input, Supabase Auth, or storage
 */
async function resolveCurrentUserId(providedUserId) {
  // 1. Direct string argument
  if (typeof providedUserId === 'string' && providedUserId.trim()) {
    return providedUserId.trim();
  }

  // 2. Object argument
  if (providedUserId && typeof providedUserId === 'object') {
    const candidate = providedUserId.id || providedUserId.user_id || providedUserId.uid;
    if (candidate && typeof candidate === 'string') {
      return candidate.trim();
    }
  }

  // 3. Supabase Auth session
  if (isSupabaseConfigured() && supabase?.auth) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        return data.user.id;
      }
    } catch (e) {}
  }

  // 4. LocalStorage cached user
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('i4u_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) return String(parsed.id);
        if (parsed?.user_id) return String(parsed.user_id);
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Primary function to register the Service Worker, request permission,
 * subscribe to Web Push, and persist the subscription to Supabase.
 * 
 * @param {string|object} [userId] - Optional user ID or user object.
 * @returns {Promise<{ success: boolean, subscription?: PushSubscription, error?: string }>}
 */
export async function registerAndSubscribePush(userId) {
  ensureManifestLink();

  // 1. Check browser feature support
  if (!isPushSupported()) {
    console.warn('[WebPush] PushManager or ServiceWorker not supported in this browser.');
    return { success: false, error: 'Push notifications are not supported in this browser.' };
  }

  // 2. Validate VAPID Public Key
  const vapidPublicKey = 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VAPID_PUBLIC_KEY) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_VAPID_PUBLIC_KEY) ||
    '';

  if (!vapidPublicKey || !vapidPublicKey.trim()) {
    console.warn('[WebPush] VITE_VAPID_PUBLIC_KEY is not defined in environment variables.');
    return { success: false, error: 'VAPID public key is not configured.' };
  }

  try {
    // 3. Request Notification permission
    const currentPermission = Notification.permission;
    if (currentPermission === 'denied') {
      console.warn('[WebPush] Notification permission was previously denied by the user.');
      return { success: false, error: 'Notification permission denied.' };
    }

    const permission = currentPermission === 'granted' 
      ? 'granted' 
      : await Notification.requestPermission();

    if (permission !== 'granted') {
      console.log('[WebPush] Notification permission not granted:', permission);
      return { success: false, error: 'Notification permission not granted.' };
    }

    // 4. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // 5. Convert VAPID key to binary format
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey.trim());

    // 6. Subscribe to Web Push via PushManager
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // 7. Resolve target user ID
    const targetUserId = await resolveCurrentUserId(userId);
    if (!targetUserId) {
      console.warn('[WebPush] Cannot save push subscription: No valid user_id resolved.');
      return { success: true, subscription, warning: 'Subscribed locally, but user_id missing for database persistence.' };
    }

    // 8. Extract subscription details
    const subJson = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = subJson.keys?.p256dh || '';
    const auth = subJson.keys?.auth || '';

    if (!endpoint || !p256dh || !auth) {
      return { success: false, error: 'Invalid push subscription keys returned by browser.' };
    }

    // 9. Upsert into Supabase public.push_subscriptions
    if (isSupabaseConfigured() && supabase) {
      const payload = {
        user_id: targetUserId,
        endpoint,
        p256dh,
        auth,
        subscription_json: subJson,
        device_type: getDeviceType(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert(payload, { onConflict: 'user_id,endpoint' });

      if (error) {
        console.warn('[WebPush] Supabase upsert subscription notice:', error.message);
        // Fallback: If foreign key failure occurs because user_id is custom text, log for developer
        return { success: false, error: error.message, subscription };
      }

      console.log('[WebPush] Successfully subscribed and synchronized with Supabase.');
      return { success: true, subscription, data };
    }

    return { success: true, subscription };
  } catch (err) {
    console.error('[WebPush] Registration/Subscription error:', err);
    return { success: false, error: err?.message || 'Failed to subscribe to push notifications.' };
  }
}

/**
 * Unsubscribes the current device from PushManager and deletes record from Supabase
 */
export async function unsubscribePush(userId) {
  if (!isPushSupported()) return { success: false };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      if (isSupabaseConfigured() && supabase && endpoint) {
        const targetUserId = await resolveCurrentUserId(userId);
        let query = supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        if (targetUserId) {
          query = query.eq('user_id', targetUserId);
        }
        await query;
      }
    }

    return { success: true };
  } catch (err) {
    console.warn('[WebPush] Error during unsubscribe:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Gets the current notification permission and active subscription
 */
export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) {
    return { isSupported: false, permission: 'unsupported', subscription: null };
  }

  const permission = Notification.permission;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      isSupported: true,
      permission,
      isSubscribed: Boolean(subscription),
      subscription
    };
  } catch (e) {
    return {
      isSupported: true,
      permission,
      isSubscribed: false,
      subscription: null
    };
  }
}

/**
 * Lightweight React Hook for non-intrusive Web Push subscription.
 * Call this in top-level components or right after user login.
 * 
 * @example
 * // In any component:
 * import { usePushNotification } from '../utils/pushNotificationService';
 * usePushNotification(currentUser);
 */
export function usePushNotification(user, autoSubscribe = true) {
  const [status, setStatus] = useState({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    loading: true
  });

  const checkStatus = useCallback(async () => {
    const res = await getPushSubscriptionStatus();
    setStatus({
      isSupported: res.isSupported,
      permission: res.permission,
      isSubscribed: res.isSubscribed,
      loading: false
    });
  }, []);

  const subscribe = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    const result = await registerAndSubscribePush(user);
    await checkStatus();
    return result;
  }, [user, checkStatus]);

  const unsubscribe = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    const result = await unsubscribePush(user);
    await checkStatus();
    return result;
  }, [user, checkStatus]);

  useEffect(() => {
    checkStatus();

    // If user is authenticated and autoSubscribe is enabled, attempt silent or non-blocking subscription
    if (autoSubscribe && user && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        registerAndSubscribePush(user).then(checkStatus).catch(() => {});
      }
    }
  }, [user, autoSubscribe, checkStatus]);

  return {
    ...status,
    subscribe,
    unsubscribe,
    refreshStatus: checkStatus
  };
}

export default {
  registerAndSubscribePush,
  unsubscribePush,
  getPushSubscriptionStatus,
  usePushNotification,
  isPushSupported,
  getDeviceType,
  urlBase64ToUint8Array
};
