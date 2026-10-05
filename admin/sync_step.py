import os
import sqlite3
import psycopg2
import urllib.parse

project_ref = 'ejtkrilhntdbsiavugta'
password = urllib.parse.unquote('%40Thresiamma2')
host = "aws-0-ap-northeast-1.pooler.supabase.com"

print("1. Connecting to Supabase...", flush=True)
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
print("2. Connected successfully!", flush=True)

# Add missing columns
cols = [
    ("aadhaar_front_image", "TEXT"),
    ("aadhaar_back_image", "TEXT"),
    ("aadhaar_status", "VARCHAR(50) DEFAULT 'pending'"),
    ("aadhaar_rejection_reason", "TEXT"),
    ("single_photos", "TEXT"),
    ("family_photos", "TEXT")
]

for col, col_type in cols:
    try:
        pg_cur.execute(f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} {col_type};")
        pg_conn.commit()
        print(f"   Column {col} ready.", flush=True)
    except Exception as e:
        print(f"   Error on {col}: {e}", flush=True)
        pg_conn.rollback()

print("3. Reading SQLite profiles...", flush=True)
sqlite_conn = sqlite3.connect('admin/admin.db')
sqlite_conn.row_factory = sqlite3.Row
sqlite_cur = sqlite_conn.cursor()
sqlite_cur.execute("SELECT * FROM profiles")
sqlite_profiles = sqlite_cur.fetchall()
print(f"   Found {len(sqlite_profiles)} SQLite profiles.", flush=True)

count = 0
for r in sqlite_profiles:
    row = dict(r)
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
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                age = EXCLUDED.age,
                gender = EXCLUDED.gender,
                city = EXCLUDED.city,
                district = EXCLUDED.district,
                state = EXCLUDED.state,
                photo = EXCLUDED.photo,
                status = EXCLUDED.status,
                aadhaar_verified = EXCLUDED.aadhaar_verified,
                govt_id_verified = EXCLUDED.govt_id_verified,
                verified = EXCLUDED.verified,
                aadhaar_status = EXCLUDED.aadhaar_status,
                aadhaar_front_image = EXCLUDED.aadhaar_front_image,
                aadhaar_back_image = EXCLUDED.aadhaar_back_image,
                aadhaar_rejection_reason = EXCLUDED.aadhaar_rejection_reason,
                single_photos = EXCLUDED.single_photos,
                family_photos = EXCLUDED.family_photos,
                updated_at = CURRENT_TIMESTAMP;
        """, row)
        pg_conn.commit()
        count += 1
        print(f"   [{count}/{len(sqlite_profiles)}] Synced {row['id']} ({row['name']})", flush=True)
    except Exception as e:
        print(f"   Failed to sync {row['id']}: {e}", flush=True)
        pg_conn.rollback()

print("4. Done syncing! Verifying Mattayi in Supabase...", flush=True)
pg_cur.execute("SELECT id, name, aadhaar_status, status FROM profiles WHERE name LIKE '%Mattayi%';")
for m in pg_cur.fetchall():
    print("   ->", m, flush=True)

pg_cur.execute("SELECT COUNT(*) FROM profiles;")
print("Total profiles in Supabase:", pg_cur.fetchone()[0], flush=True)

sqlite_conn.close()
pg_conn.close()
print("All finished!", flush=True)
