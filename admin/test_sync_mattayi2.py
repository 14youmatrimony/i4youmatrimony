import os
import sqlite3
import psycopg2
import urllib.parse

project_ref = 'ejtkrilhntdbsiavugta'
password = urllib.parse.unquote('%40Thresiamma2')
host = "aws-0-ap-northeast-1.pooler.supabase.com"

pg_conn = psycopg2.connect(
    dbname='postgres',
    user=f'postgres.{project_ref}',
    password=password,
    host=host,
    port=6543,
    sslmode='require',
    connect_timeout=10
)
pg_cur = pg_conn.cursor()

sqlite_conn = sqlite3.connect('admin/admin.db')
sqlite_conn.row_factory = sqlite3.Row
sqlite_cur = sqlite_conn.cursor()

# Test inserting p_1791044984221 (Mattayi 2)
sqlite_cur.execute("SELECT * FROM profiles WHERE id = 'p_1791044984221'")
row = dict(sqlite_cur.fetchone())

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
print("SUCCESS! Inserted Mattayi p_1791044984221 into Supabase!", flush=True)

sqlite_conn.close()
pg_conn.close()
