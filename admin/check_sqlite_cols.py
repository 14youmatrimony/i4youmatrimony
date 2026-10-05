import sqlite3

conn = sqlite3.connect('admin/admin.db')
cur = conn.cursor()
cur.execute("PRAGMA table_info(profiles);")
cols = [r[1] for r in cur.fetchall()]
print("SQLite profiles columns:", cols)
conn.close()
