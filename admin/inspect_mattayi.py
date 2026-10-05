import sqlite3
import json

conn = sqlite3.connect('admin/admin.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT * FROM profiles WHERE name LIKE '%Mattayi%'")
rows = cur.fetchall()
print(f'Found {len(rows)} profiles matching Mattayi:')
for r in rows:
    d = dict(r)
    print('ID:', d.get('id'), 'Name:', d.get('name'), 'Phone:', d.get('phone'), 'Status:', d.get('status'), 'AadhaarStatus:', d.get('aadhaar_status'))
conn.close()
