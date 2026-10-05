import os
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv('.env')

url = os.environ.get('VITE_SUPABASE_URL')
key = os.environ.get('VITE_SUPABASE_ANON_KEY')

print('URL:', url)
print('Key length:', len(key) if key else 0)

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json'
}

# 1. Test root REST API
req = urllib.request.Request(f'{url}/rest/v1/', headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print('Root status code:', resp.status)
        print('Root response preview:', resp.read().decode('utf-8')[:300])
except urllib.error.HTTPError as e:
    print('Root HTTP error:', e.code, e.read().decode('utf-8')[:300])
except Exception as e:
    print('Root error:', e)

# 2. Test 'profiles' table query
req2 = urllib.request.Request(f'{url}/rest/v1/profiles?select=*&limit=5', headers=headers)
try:
    with urllib.request.urlopen(req2, timeout=10) as resp:
        print('Profiles status code:', resp.status)
        print('Profiles response preview:', resp.read().decode('utf-8')[:500])
except urllib.error.HTTPError as e:
    print('Profiles HTTP error:', e.code, e.read().decode('utf-8')[:500])
except Exception as e:
    print('Profiles error:', e)
