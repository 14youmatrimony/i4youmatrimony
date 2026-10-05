import os
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv('.env')

url = os.environ.get('VITE_SUPABASE_URL')
key = os.environ.get('VITE_SUPABASE_ANON_KEY')

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

test_payload = {
    'id': 'p_1791044984217',
    'status': 'active',
    'aadhaar_status': 'sent_back',
    'aadhaar_rejection_reason': 'Card edges or critical portions are cut off. Please upload full card photo.'
}

req = urllib.request.Request(
    f"{url}/rest/v1/profiles?id=eq.p_1791044984217",
    data=json.dumps(test_payload).encode('utf-8'),
    headers=headers,
    method='PATCH'
)

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print("PATCH success! Status code:", resp.status)
except urllib.error.HTTPError as e:
    print("PATCH error:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
