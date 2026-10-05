import os
import urllib.request
import urllib.error
import json
from dotenv import load_dotenv
import sqlite3

load_dotenv('.env')

url = os.environ.get('VITE_SUPABASE_URL')
key = os.environ.get('VITE_SUPABASE_ANON_KEY')

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

conn = sqlite3.connect('admin/admin.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT * FROM profiles WHERE id = 'p_1791044984217'")
row = dict(cur.fetchone())
conn.close()

# Prepare clean payload
print("Attempting to insert profile to Supabase:", row['id'], row['name'])

# Try with minimal fields first to see column acceptance
payload = {
    'id': row['id'],
    'name': row['name'],
    'gender': row['gender'],
    'age': row['age'],
    'city': row['city'],
    'district': row['district'],
    'state': row['state'],
    'religion': row['religion'],
    'status': row['status']
}

req = urllib.request.Request(
    f'{url}/rest/v1/profiles',
    data=json.dumps(payload).encode('utf-8'),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print('Insert success! Status:', resp.status)
        print('Inserted data:', resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('Insert HTTP error:', e.code, e.read().decode('utf-8'))
except Exception as e:
    print('Insert error:', e)
