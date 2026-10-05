import sqlite3

conn = sqlite3.connect('admin/admin.db')
cur = conn.cursor()
cur.execute("SELECT id, name, aadhaar_status, status, created_at FROM profiles ORDER BY created_at DESC;")
rows = cur.fetchall()
print(f"Total profiles in local admin.db: {len(rows)}")
for r in rows:
    print(r)
conn.close()
