import io
import base64
import json
import sqlite3
import psycopg2
import urllib.parse
from PIL import Image

def optimize_base64_image(b64_str: str, max_dim: int = 1080, quality: int = 85) -> str:
    """Compresses large base64 image strings to lightweight, high-quality JPEGs."""
    if not b64_str or not isinstance(b64_str, str):
        return b64_str
    if not b64_str.startswith('data:image'):
        return b64_str
    if len(b64_str) < 200_000: # Already small (<200KB)
        return b64_str

    try:
        header, encoded = b64_str.split(',', 1)
        image_data = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(image_data))
        
        # Convert RGBA / P to RGB
        if image.mode in ('RGBA', 'LA', 'P'):
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'RGBA':
                rgb_image.paste(image, mask=image.split()[3])
            else:
                rgb_image.paste(image)
            image = rgb_image

        # Resize if larger than max_dim
        image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=quality, optimize=True)
        compressed_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        new_str = f"data:image/jpeg;base64,{compressed_b64}"
        print(f"      [Optimized image] {len(b64_str)} bytes -> {len(new_str)} bytes ({(len(new_str)/len(b64_str))*100:.1f}%)")
        return new_str
    except Exception as e:
        print(f"      [Image optimization notice] Could not compress: {e}")
        return b64_str

project_ref = 'ejtkrilhntdbsiavugta'
password = urllib.parse.unquote('%40Thresiamma2')
host = "aws-0-ap-northeast-1.pooler.supabase.com"

print("Connecting to Supabase PostgreSQL...")
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

sqlite_cur.execute("SELECT * FROM profiles WHERE id = 'p_1791044984217'")
row = dict(sqlite_cur.fetchone())

print(f"Syncing {row['id']} ({row['name']})...")
print(f"Original photo length: {len(row['photo']) if row['photo'] else 0}")
print(f"Original aadhaar_front_image length: {len(row['aadhaar_front_image']) if row['aadhaar_front_image'] else 0}")

row['photo'] = optimize_base64_image(row['photo'], max_dim=800, quality=80)
row['aadhaar_front_image'] = optimize_base64_image(row['aadhaar_front_image'], max_dim=1200, quality=85)
if row.get('aadhaar_back_image'):
    row['aadhaar_back_image'] = optimize_base64_image(row['aadhaar_back_image'], max_dim=1200, quality=85)

# Optimize single_photos if present
if row.get('single_photos'):
    try:
        photos = json.loads(row['single_photos'])
        optimized_photos = [optimize_base64_image(p, max_dim=1080, quality=80) for p in photos]
        row['single_photos'] = json.dumps(optimized_photos)
    except Exception:
        pass

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
        photo = EXCLUDED.photo,
        aadhaar_front_image = EXCLUDED.aadhaar_front_image,
        aadhaar_back_image = EXCLUDED.aadhaar_back_image,
        single_photos = EXCLUDED.single_photos,
        status = EXCLUDED.status,
        aadhaar_status = EXCLUDED.aadhaar_status,
        aadhaar_rejection_reason = EXCLUDED.aadhaar_rejection_reason;
""", row)
pg_conn.commit()
print("SUCCESS! Mattayi 1 (p_1791044984217) successfully saved to Supabase!")

# Also update the SQLite record so local database is lightweight
sqlite_cur.execute("""
    UPDATE profiles SET
        photo = ?,
        aadhaar_front_image = ?,
        single_photos = ?
    WHERE id = ?
""", (row['photo'], row['aadhaar_front_image'], row['single_photos'], row['id']))
sqlite_conn.commit()
print("Updated local SQLite with optimized images as well!")

sqlite_conn.close()
pg_conn.close()
