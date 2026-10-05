"""
I 4 You Matrimonial - PostgreSQL Migration Utility
Migrates all tables and data from SQLite (admin.db) to PostgreSQL.

Usage:
    python admin/migrate_to_postgres.py "postgresql://user:password@localhost:5432/i4you_db"
    or
    python admin/migrate_to_postgres.py (reads DATABASE_URL from .env)
"""

import sys
import os
import sqlite3
from datetime import datetime

try:
    from dotenv import load_dotenv
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(root_dir, '.env'))
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
except ImportError:
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("[-] Error: psycopg2 is required for PostgreSQL migration.")
    print("    Install it via: pip install psycopg2-binary")
    sys.exit(1)

SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'admin.db')

def update_env_file(db_url: str):
    """Saves or updates DATABASE_URL in the .env files."""
    env_paths = [
        os.path.join(root_dir, '.env'),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    ]
    for p in env_paths:
        lines = []
        found = False
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip().startswith('DATABASE_URL='):
                        lines.append(f'DATABASE_URL={db_url}\n')
                        found = True
                    else:
                        lines.append(line)
        if not found:
            lines.append(f'DATABASE_URL={db_url}\n')
        with open(p, 'w', encoding='utf-8') as f:
            f.writelines(lines)
    print(f"[+] Saved DATABASE_URL to .env configuration.")

def init_postgres_schema(pg_conn):
    """Creates all required tables in PostgreSQL with standard constraints."""
    cur = pg_conn.cursor()
    print("[*] Creating PostgreSQL schema...")

    # 1. Admin Users
    cur.execute("""
    CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role VARCHAR(50) DEFAULT 'Super Admin',
        avatar TEXT,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Profiles Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(250),
        phone VARCHAR(250),
        age INTEGER,
        gender VARCHAR(20),
        height VARCHAR(20),
        skin_colour VARCHAR(50),
        photo TEXT,
        religion VARCHAR(50),
        caste VARCHAR(50),
        mother_tongue VARCHAR(50),
        state VARCHAR(50),
        city VARCHAR(50),
        district VARCHAR(50),
        native_address TEXT,
        education VARCHAR(100),
        education_category VARCHAR(50),
        profession VARCHAR(100),
        company VARCHAR(100),
        annual_income VARCHAR(50),
        manglik VARCHAR(30),
        diet VARCHAR(30),
        verified INTEGER DEFAULT 0,
        aadhaar_verified INTEGER DEFAULT 0,
        govt_id_verified INTEGER DEFAULT 0,
        match_score INTEGER DEFAULT 85,
        status VARCHAR(30) DEFAULT 'active',
        deletion_reason TEXT,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Offers Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS offers (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(150) NOT NULL,
        discount_percent INTEGER NOT NULL,
        plan_type VARCHAR(50) NOT NULL,
        description TEXT,
        valid_from VARCHAR(20),
        valid_until VARCHAR(20),
        max_uses INTEGER DEFAULT 100,
        current_uses INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 4. Payments Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(100) UNIQUE NOT NULL,
        user_id VARCHAR(100),
        user_name VARCHAR(150) NOT NULL,
        plan_name VARCHAR(100) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        payment_method VARCHAR(50) NOT NULL,
        status VARCHAR(30) NOT NULL,
        invoice_no VARCHAR(100) UNIQUE NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 5. Activity Logs Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        action VARCHAR(100) NOT NULL,
        target_entity VARCHAR(100) NOT NULL,
        target_id VARCHAR(100),
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. Account Deletions Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS account_deletions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100),
        user_name VARCHAR(150),
        email VARCHAR(150),
        phone VARCHAR(50),
        reason TEXT NOT NULL,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    pg_conn.commit()
    cur.close()
    print("[+] PostgreSQL schema verified.")

def migrate_data(pg_conn):
    """Transfers records from SQLite to PostgreSQL preserving IDs and relationships."""
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"[-] SQLite database not found at {SQLITE_DB_PATH}. Only initialized empty PostgreSQL tables.")
        return

    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    pg_cur = pg_conn.cursor()

    stats = {}

    # 1. Admin Users
    try:
        sqlite_cur.execute("SELECT * FROM admin_users")
        rows = sqlite_cur.fetchall()
        count = 0
        for r in rows:
            pg_cur.execute("""
                INSERT INTO admin_users (id, username, email, password_hash, full_name, role, avatar, last_login, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (email) DO NOTHING
            """, (r['id'], r['username'], r['email'], r['password_hash'], r['full_name'], r['role'], r['avatar'], r['last_login'], r['created_at']))
            count += 1
        pg_conn.commit()
        stats['admin_users'] = count
    except Exception as e:
        print(f"[-] Warning migrating admin_users: {e}")
        pg_conn.rollback()

    # 2. Profiles
    try:
        sqlite_cur.execute("SELECT * FROM profiles")
        rows = sqlite_cur.fetchall()
        count = 0
        for r in rows:
            pg_cur.execute("""
                INSERT INTO profiles (
                    id, name, email, phone, age, gender, height, skin_colour, photo,
                    religion, caste, mother_tongue, state, city, district, native_address,
                    education, education_category, profession, company, annual_income,
                    manglik, diet, verified, aadhaar_verified, govt_id_verified, match_score,
                    status, deletion_reason, deleted_at, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    status = EXCLUDED.status,
                    deletion_reason = EXCLUDED.deletion_reason,
                    deleted_at = EXCLUDED.deleted_at
            """, (
                r['id'], r['name'], r['email'], r['phone'], r['age'], r['gender'], r['height'], r['skin_colour'], r['photo'],
                r['religion'], r['caste'], r['mother_tongue'], r['state'], r['city'], r['district'], r['native_address'],
                r['education'], r['education_category'], r['profession'], r['company'], r['annual_income'],
                r['manglik'], r['diet'], r['verified'], r['aadhaar_verified'], r['govt_id_verified'], r['match_score'],
                r['status'], r['deletion_reason'], r['deleted_at'], r['created_at'], r['updated_at']
            ))
            count += 1
        pg_conn.commit()
        stats['profiles'] = count
    except Exception as e:
        print(f"[-] Warning migrating profiles: {e}")
        pg_conn.rollback()

    # 3. Offers
    try:
        sqlite_cur.execute("SELECT * FROM offers")
        rows = sqlite_cur.fetchall()
        count = 0
        for r in rows:
            pg_cur.execute("""
                INSERT INTO offers (id, code, title, discount_percent, plan_type, description, valid_from, valid_until, max_uses, current_uses, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (code) DO NOTHING
            """, (
                r['id'], r['code'], r['title'], r['discount_percent'], r['plan_type'], r['description'],
                r['valid_from'], r['valid_until'], r['max_uses'], r['current_uses'], r['is_active'], r['created_at']
            ))
            count += 1
        pg_conn.commit()
        stats['offers'] = count
    except Exception as e:
        print(f"[-] Warning migrating offers: {e}")
        pg_conn.rollback()

    # 4. Payments
    try:
        sqlite_cur.execute("SELECT * FROM payments")
        rows = sqlite_cur.fetchall()
        count = 0
        for r in rows:
            pg_cur.execute("""
                INSERT INTO payments (id, transaction_id, user_id, user_name, plan_name, amount, currency, payment_method, status, invoice_no, payment_date, notes, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (transaction_id) DO NOTHING
            """, (
                r['id'], r['transaction_id'], r['user_id'], r['user_name'], r['plan_name'], r['amount'],
                r['currency'], r['payment_method'], r['status'], r['invoice_no'], r['payment_date'], r['notes'], r['created_at']
            ))
            count += 1
        pg_conn.commit()
        stats['payments'] = count
    except Exception as e:
        print(f"[-] Warning migrating payments: {e}")
        pg_conn.rollback()

    # 5. Activity Logs
    try:
        sqlite_cur.execute("SELECT * FROM activity_logs")
        rows = sqlite_cur.fetchall()
        count = 0
        for r in rows:
            pg_cur.execute("""
                INSERT INTO activity_logs (id, admin_id, action, target_entity, target_id, details, ip_address, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                r['id'], r['admin_id'], r['action'], r['target_entity'], r['target_id'], r['details'], r['ip_address'], r['created_at']
            ))
            count += 1
        pg_conn.commit()
        stats['activity_logs'] = count
    except Exception as e:
        print(f"[-] Warning migrating activity_logs: {e}")
        pg_conn.rollback()

    # 6. Account Deletions
    try:
        sqlite_cur.execute("SELECT * FROM account_deletions")
        rows = sqlite_cur.fetchall()
        count = 0
        for r in rows:
            pg_cur.execute("""
                INSERT INTO account_deletions (id, user_id, user_name, email, phone, reason, feedback, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                r['id'], r['user_id'], r['user_name'], r['email'], r['phone'], r['reason'], r['feedback'], r['created_at']
            ))
            count += 1
        pg_conn.commit()
        stats['account_deletions'] = count
    except Exception as e:
        print(f"[-] Warning migrating account_deletions: {e}")
        pg_conn.rollback()

    # Synchronize PostgreSQL auto-increment sequences
    print("[*] Synchronizing PostgreSQL ID sequences...")
    for table in ['admin_users', 'offers', 'payments', 'activity_logs', 'account_deletions']:
        try:
            pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1)) FROM {table};")
        except Exception:
            pass
    pg_conn.commit()

    sqlite_conn.close()
    pg_cur.close()

    print("\n" + "="*50)
    print(" ✅ POSTGRESQL MIGRATION SUCCESSFUL!")
    print("="*50)
    for tbl, cnt in stats.items():
        print(f"  • {tbl.ljust(20)}: {cnt} records migrated")
    print("="*50 + "\n")

def main():
    db_url = None
    if len(sys.argv) > 1 and sys.argv[1].strip():
        db_url = sys.argv[1].strip()
    else:
        db_url = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URI')

    if not db_url:
        print("\n" + "="*60)
        print(" I 4 You - PostgreSQL Database Migration")
        print("="*60)
        print("Please provide your PostgreSQL Connection URI:")
        print("Example: postgresql://postgres:password@localhost:5432/i4you_db")
        print("Example: postgresql://postgres.xxxx:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres")
        print("="*60)
        try:
            db_url = input("\nEnter PostgreSQL Connection URI: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nMigration aborted.")
            return

    if not db_url:
        print("[-] Error: No connection string provided.")
        return

    # Handle postgres:// vs postgresql://
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)

    print(f"\n[*] Connecting to PostgreSQL: {db_url.split('@')[-1] if '@' in db_url else db_url}...")
    try:
        pg_conn = psycopg2.connect(db_url)
        print("[+] Connected to PostgreSQL successfully!")
    except Exception as e:
        print(f"[-] Connection failed: {e}")
        return

    try:
        init_postgres_schema(pg_conn)
        migrate_data(pg_conn)
        update_env_file(db_url)
    finally:
        pg_conn.close()

if __name__ == '__main__':
    main()
