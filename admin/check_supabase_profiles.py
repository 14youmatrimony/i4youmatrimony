import psycopg2
import urllib.parse

password = urllib.parse.unquote('%40Thresiamma2')
conn = psycopg2.connect(
    dbname='postgres', 
    user='postgres.ejtkrilhntdbsiavugta', 
    password=password, 
    host='aws-0-ap-northeast-1.pooler.supabase.com', 
    port=6543, 
    sslmode='require'
)
cur = conn.cursor()
cur.execute("SELECT id, name, status, aadhaar_status FROM profiles WHERE name LIKE '%Mattayi%';")
rows = cur.fetchall()
print('Mattayi profiles in Supabase:', rows)

cur.execute("SELECT id, name, status FROM profiles ORDER BY created_at DESC LIMIT 10;")
print('\nLatest 10 profiles in Supabase:')
for r in cur.fetchall():
    print(r)

conn.close()
