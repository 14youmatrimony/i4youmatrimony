import os
import urllib.request
import urllib.error
import json
from dotenv import load_dotenv

load_dotenv('.env')

url = os.environ.get('VITE_SUPABASE_URL')
key = os.environ.get('VITE_SUPABASE_ANON_KEY')

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Check columns by trying an empty insert or checking OpenAPI definition
req = urllib.request.Request(f'{url}/rest/v1/?apikey={key}')
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        openapi = json.loads(resp.read().decode('utf-8'))
        definitions = openapi.get('definitions', {})
        print('Available tables in Supabase definitions:', list(definitions.keys()))
        if 'profiles' in definitions:
            print('Profiles table columns:', list(definitions['profiles'].get('properties', {}).keys()))
except urllib.error.HTTPError as e:
    print('OpenAPI HTTP error:', e.code, e.read().decode('utf-8')[:300])
except Exception as e:
    print('Error:', e)
