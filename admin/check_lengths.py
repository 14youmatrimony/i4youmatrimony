import sqlite3

conn = sqlite3.connect('admin/admin.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT id, name, LENGTH(photo) as photo_len, LENGTH(aadhaar_front_image) as front_len, LENGTH(aadhaar_back_image) as back_len, LENGTH(single_photos) as single_len FROM profiles WHERE id IN ('p_1790963054403', 'p_1791044984217', 'p_1791044984221')")
rows = cur.fetchall()
for r in rows:
    print(dict(r))
conn.close()
