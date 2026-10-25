"""
Firebase Cloud Messaging (FCM) Dispatcher for I 4 You Matrimonial

Dispatches high-priority push notifications to Android and iOS devices.
Features:
- Native APNs and Android FCM v1 message structure
- Supports incoming call rings with heads-up display and custom call channel
- Offline chat message alerts with deep-link navigation
- Graceful fallback when Firebase service credentials are not yet configured
"""

import os
import json
import time
import urllib.request
import urllib.error

# Look for Firebase service account in common directories
SERVICE_ACCOUNT_PATHS = [
    os.path.join(os.path.dirname(__file__), 'firebase-service-account.json'),
    os.path.join(os.path.dirname(__file__), '..', 'firebase-service-account.json'),
    os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', '')
]

_cached_access_token = None
_cached_token_expiry = 0


def get_service_account_credentials():
    """Locates and parses the Firebase service account JSON file if available."""
    for path in SERVICE_ACCOUNT_PATHS:
        if path and os.path.isfile(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data.get('project_id') and (data.get('private_key') or data.get('client_email')):
                        return data, path
            except Exception as e:
                print(f"[-] Error reading service account at {path}: {e}")
    return None, None


def get_google_access_token(service_account):
    """Generates an OAuth2 access token for FCM HTTP v1 using the service account."""
    global _cached_access_token, _cached_token_expiry
    now = time.time()
    if _cached_access_token and (now < _cached_token_expiry - 60):
        return _cached_access_token

    try:
        # Check if google-auth library is available
        from google.oauth2 import service_account as g_sa
        import google.auth.transport.requests

        scopes = ['https://www.googleapis.com/auth/firebase.messaging']
        creds = g_sa.Credentials.from_service_account_info(service_account, scopes=scopes)
        req = google.auth.transport.requests.Request()
        creds.refresh(req)
        _cached_access_token = creds.token
        _cached_token_expiry = now + 3500
        return _cached_access_token
    except Exception as e:
        print(f"[-] Google OAuth2 token error: {e}")
        return None


def send_fcm_v1_message(token: str, title: str, body: str, data: dict, project_id: str, access_token: str,
                        priority: str = 'high', channel_id: str = 'call_notifications_channel', sound: str = None):
    """Sends a single FCM v1 message to an Android or iOS device."""
    url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    
    # Ensure all data values are strings for FCM compatibility
    str_data = {}
    if data and isinstance(data, dict):
        for k, v in data.items():
            str_data[str(k)] = json.dumps(v) if isinstance(v, (dict, list, bool)) else str(v)

    notification_payload = {
        "title": title,
        "body": body
    }

    message_payload = {
        "message": {
            "token": token,
            "notification": notification_payload,
            "data": str_data,
            "android": {
                "priority": "HIGH" if priority == 'high' else "NORMAL",
                "notification": {
                    "channel_id": channel_id,
                    "sound": sound or "default",
                    "default_sound": True,
                    "default_vibrate_timings": True,
                    "notification_priority": "PRIORITY_MAX" if priority == 'high' else "PRIORITY_DEFAULT"
                }
            },
            "apns": {
                "headers": {
                    "apns-priority": "10" if priority == 'high' else "5",
                    "apns-push-type": "alert"
                },
                "payload": {
                    "aps": {
                        "alert": {
                            "title": title,
                            "body": body
                        },
                        "sound": sound or "default",
                        "badge": 1,
                        "content-available": 1
                    }
                }
            }
        }
    }

    req_data = json.dumps(message_payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json; UTF-8'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            res_body = response.read().decode('utf-8')
            return True, json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"[-] FCM HTTP Error {e.code}: {err_msg}")
        return False, err_msg
    except Exception as e:
        print(f"[-] FCM Send Exception: {e}")
        return False, str(e)


def dispatch_push_to_tokens(tokens: list, title: str, body: str, data: dict,
                            priority: str = 'high', channel_id: str = 'call_notifications_channel', sound: str = None):
    """
    Dispatches push notification to a list of tokens (Android, iOS, Web).
    Returns dict with delivery statistics.
    """
    if not tokens:
        return {"success": False, "reason": "No registered device tokens found for recipient."}

    service_account, path = get_service_account_credentials()
    if not service_account:
        return {
            "success": False,
            "pending_setup": True,
            "reason": "Firebase service account JSON not yet placed on server. Place 'firebase-service-account.json' in 'admin/' folder to enable live native delivery."
        }

    project_id = service_account.get('project_id')
    access_token = get_google_access_token(service_account)
    if not access_token:
        return {"success": False, "reason": "Failed to generate Google OAuth2 token for Firebase."}

    successful = 0
    failed = 0

    for token_item in tokens:
        tok = token_item.get('token') if isinstance(token_item, dict) else token_item
        if not tok:
            continue
        ok, res = send_fcm_v1_message(
            token=tok,
            title=title,
            body=body,
            data=data,
            project_id=project_id,
            access_token=access_token,
            priority=priority,
            channel_id=channel_id,
            sound=sound
        )
        if ok:
            successful += 1
        else:
            failed += 1

    return {
        "success": successful > 0,
        "sent_count": successful,
        "failed_count": failed,
        "total_targets": len(tokens)
    }
