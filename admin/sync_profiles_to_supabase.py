import os
import sqlite3
import psycopg2
import psycopg2.extras
import urllib.parse

project_ref = 'ejtkrilhntdbsiavugta'
password = urllib.parse.unquote('%40Thresiamma2')
host = "aws-0-ap-northeast-1.pooler.supabase.com"

print("Connecting to Supabase PostgreSQL via Pooler...")
pg_conn = psycopg2.connect(
    dbname='postgres',
    user=f'postgres.{project_ref}',
    password=password,
    host=host,
    port=5432,
    sslmode='require'
)
pg_cur = pg_conn.cursor()

# 1. Add missing columns to Supabase 'profiles' table if they don't exist
alter_cols = [
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aadhaar_front_image TEXT;",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aadhaar_back_image TEXT;",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aadhaar_status VARCHAR(50) DEFAULT 'pending';",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aadhaar_rejection_reason TEXT;",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS single_photos TEXT;",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_photos TEXT;"
]
for q in alter_cols:
    pg_cur.execute(q)
pg_conn.commit()
print("[+] Supabase profiles schema updated with missing Aadhaar & Photo columns.")

# Also add RLS policy so anon/public can read and insert if needed
try:
    pg_cur.execute("""
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone'
        ) THEN
            CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow public profile registration'
        ) THEN
            CREATE POLICY "Allow public profile registration" ON profiles FOR INSERT WITH CHECK (true);
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow public profile update'
        ) THEN
            CREATE POLICY "Allow public profile update" ON profiles FOR UPDATE USING (true);
        END IF;
    END
    $$;
    """)
    pg_conn.commit()
    print("[+] Supabase RLS policies configured for profiles table.")
except Exception as e:
    print(f"[-] RLS policy notice: {e}")
    pg_conn.rollback()

# 2. Read all profiles from SQLite admin.db and sync to Supabase
sqlite_conn = sqlite3.connect('admin/admin.db')
sqlite_conn.row_factory = sqlite3.Row
sqlite_cur = sqlite_conn.cursor()

sqlite_cur.execute("SELECT * FROM profiles")
sqlite_profiles = sqlite_cur.fetchall()
print(f"[*] Found {len(sqlite_profiles)} profiles in local SQLite admin.db. Syncing to Supabase...")

synced_count = 0
for r in sqlite_profiles:
    row = dict(r)
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
    synced_count += 1

pg_conn.commit()
print(f"[+] Successfully synced {synced_count} profiles to Supabase!")

# 3. Verify Mattayi profiles in Supabase
pg_cur.execute("SELECT id, name, aadhaar_status, status FROM profiles WHERE name LIKE '%Mattayi%';")
mattayi_rows = pg_cur.fetchall()
print(f"[+] Mattayi profiles now verified in Supabase: {len(mattayi_rows)}")
for mr in mattayi_rows:
    print("   ->", mr)

# 4. Check total profiles count in Supabase
pg_cur.execute("SELECT COUNT(*) FROM profiles;")
total = pg_cur.fetchone()[0]
print(f"[+] Total profiles in Supabase now: {total}")

sqlite_conn.close()
pg_conn.close()
