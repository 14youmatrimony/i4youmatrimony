import psycopg2
import urllib.parse

project_ref = 'ejtkrilhntdbsiavugta'
password = urllib.parse.unquote('%40Thresiamma2')
host = "aws-0-ap-northeast-1.pooler.supabase.com"

conn = psycopg2.connect(
    dbname='postgres',
    user=f'postgres.{project_ref}',
    password=password,
    host=host,
    port=5432,
    sslmode='require'
)
cur = conn.cursor()
cur.execute("SELECT id, name, phone, aadhaar_verified, status FROM profiles ORDER BY created_at DESC;")
rows = cur.fetchall()
print(f"Total profiles in Supabase: {len(rows)}")
for r in rows:
    print(r)
conn.close()
