import sqlite3
import psycopg2
import urllib.parse

password = urllib.parse.unquote('%40Thresiamma2')
conn = psycopg2.connect(
    dbname='postgres',
    user='postgres.ejtkrilhntdbsiavugta',
    password=password,
    host='aws-0-ap-northeast-1.pooler.supabase.com',
    port=6543,
    sslmode='require',
    connect_timeout=10
)
cur = conn.cursor()
cur.execute("SELECT id, name, aadhaar_status, status FROM profiles ORDER BY created_at DESC;")
sb_profiles = {r[0]: {'name': r[1], 'aadhaar_status': r[2], 'status': r[3]} for r in cur.fetchall()}
conn.close()

sqlite_conn = sqlite3.connect('admin/admin.db')
sqlite_cur = sqlite_conn.cursor()
sqlite_cur.execute("SELECT id, name, aadhaar_status, status FROM profiles ORDER BY created_at DESC;")
sqlite_profiles = {r[0]: {'name': r[1], 'aadhaar_status': r[2], 'status': r[3]} for r in sqlite_cur.fetchall()}
sqlite_conn.close()

print(f"Total profiles in Supabase: {len(sb_profiles)}")
print(f"Total profiles in SQLite:   {len(sqlite_profiles)}")

missing_in_supabase = [pid for pid in sqlite_profiles if pid not in sb_profiles]
print(f"Missing in Supabase: {missing_in_supabase}")

for pid, data in sb_profiles.items():
    if 'Mattayi' in data['name']:
        print(f"   Supabase Mattayi: ID={pid} | Status={data['status']} | AadhaarStatus={data['aadhaar_status']}")
