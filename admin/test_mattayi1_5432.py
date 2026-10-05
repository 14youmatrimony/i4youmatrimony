import os
import sqlite3
import psycopg2
import urllib.parse

project_ref = 'ejtkrilhntdbsiavugta'
password = urllib.parse.unquote('%40Thresiamma2')
host = "aws-0-ap-northeast-1.pooler.supabase.com"

print("Connecting on port 5432 session mode...")
pg_conn = psycopg2.connect(
    dbname='postgres',
    user=f'postgres.{project_ref}',
    password=password,
    host=host,
    port=5432,
    sslmode='require',
    connect_timeout=15
)
pg_cur = pg_conn.cursor()

sqlite_conn = sqlite3.connect('admin/admin.db')
sqlite_conn.row_factory = sqlite3.Row
sqlite_cur = sqlite_conn.cursor()

sqlite_cur.execute("SELECT * FROM profiles WHERE id = 'p_1791044984217'")
row = dict(sqlite_cur.fetchone())

print(f"Row id={row['id']}, photo_len={len(row['photo']) if row['photo'] else 0}, front_len={len(row['aadhaar_front_image']) if row['aadhaar_front_image'] else 0}")

try:
    pg_cur.execute("""
        INSERT INTO profiles (
            id, name, email, phone, age, gender, height, skin_colour, photo,
            religion, caste, mother_tongue, state, city, district, native_address,
            education, education_category, profession, company, annual_income,
            manglik, diet, verified, aadhaar_verified, govt_id_verified, match_score,
            status, deletion_reason, deleted_at, created_at, updated_at,
            aadhaar_front_image, aadhaar_back_image, aadhaar_status,
            aadhaar_rejection_reason, single_photos, family_photos
        ) VALUES (
            %(id)s, %(name)s, %(email)s, %(phone)s, %(age)s, %(gender)s, %(height)s, %(skin_colour)s, %(photo)s,
            %(religion)s, %(caste)s, %(mother_tongue)s, %(state)s, %(city)s, %(district)s, %(native_address)s,
            %(education)s, %(education_category)s, %(profession)s, %(company)s, %(annual_income)s,
            %(manglik)s, %(diet)s, %(verified)s, %(aadhaar_verified)s, %(govt_id_verified)s, %(match_score)s,
            %(status)s, %(deletion_reason)s, %(deleted_at)s, %(created_at)s, %(updated_at)s,
            %(aadhaar_front_image)s, %(aadhaar_back_image)s, %(aadhaar_status)s,
            %(aadhaar_rejection_reason)s, %(single_photos)s, %(family_photos)s
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            status = EXCLUDED.status,
            aadhaar_status = EXCLUDED.aadhaar_status;
    """, row)
    pg_conn.commit()
    print("SUCCESS! Inserted Mattayi 1 into Supabase on port 5432!")
except Exception as e:
    print("Failed to insert on port 5432:", e)

sqlite_conn.close()
pg_conn.close()
