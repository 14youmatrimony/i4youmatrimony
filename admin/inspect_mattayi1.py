import sqlite3
import json

conn = sqlite3.connect('admin/admin.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT * FROM profiles WHERE id = 'p_1791044984217'")
row = dict(cur.fetchone())
for k, v in row.items():
    if isinstance(v, str) and len(v) > 100:
        print(f"  {k}: [length {len(v)}] starts with: {v[:40]}...")
    else:
        print(f"  {k}: {v}")
conn.close()
