import os
import json
import sqlite3
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

try:
    from security import (
        hash_password,
        verify_password,
        validate_password_strength,
        sanitize_text,
        sanitize_email,
        sanitize_phone,
        sanitize_profile_id,
        sanitize_identifier,
        escape_sql_like,
        check_sql_injection_attempt,
        encrypt_customer_data,
        decrypt_customer_data,
        is_encrypted,
        mask_customer_phone,
        mask_customer_email
    )
except ImportError:
    from .security import (
        hash_password,
        verify_password,
        validate_password_strength,
        sanitize_text,
        sanitize_email,
        sanitize_phone,
        sanitize_profile_id,
        sanitize_identifier,
        escape_sql_like,
        check_sql_injection_attempt,
        encrypt_customer_data,
        decrypt_customer_data,
        is_encrypted,
        mask_customer_phone,
        mask_customer_email
    )

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'admin.db')

# Whitelist Sets for SQL Injection Protection
ALLOWED_SORT_COLUMNS = {
    'created_at', 'name', 'age', 'match_score', 'verified', 
    'annual_income', 'status', 'updated_at'
}
ALLOWED_SORT_DIRECTIONS = {'ASC', 'DESC'}

ALLOWED_FILTER_COLUMNS = {
    'gender', 'religion', 'caste', 'state', 'city', 'district', 
    'diet', 'education_category', 'status', 'verified', 
    'aadhaar_verified', 'govt_id_verified', 'manglik', 'aadhaar_status'
}

ALLOWED_PROFILE_UPDATE_FIELDS = {
    'name', 'email', 'phone', 'age', 'gender', 'height', 'skin_colour', 
    'photo', 'religion', 'caste', 'mother_tongue', 'state', 'city', 
    'district', 'native_address', 'education', 'education_category', 
    'profession', 'company', 'annual_income', 'manglik', 'diet', 
    'verified', 'aadhaar_verified', 'govt_id_verified', 'match_score', 'status',
    'deletion_reason', 'deleted_at', 'aadhaar_front_image', 'aadhaar_back_image',
    'aadhaar_status', 'aadhaar_rejection_reason'
}

# Sensitive Customer PII Fields that must ALWAYS be encrypted at rest in SQLite
SENSITIVE_CUSTOMER_FIELDS = {'phone', 'email', 'native_address'}



# ==========================================
# DATABASE ENGINE CONFIGURATION (POSTGRESQL & SQLITE)
# ==========================================

try:
    from dotenv import load_dotenv
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(root_dir, '.env'))
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'), override=True)
except ImportError:
    pass

DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URI')
PGHOST = os.environ.get('PGHOST')
PGPORT = os.environ.get('PGPORT', '5432')
PGDATABASE = os.environ.get('PGDATABASE') or os.environ.get('PGDB')
PGUSER = os.environ.get('PGUSER')
PGPASSWORD = os.environ.get('PGPASSWORD')

def is_postgres_configured() -> bool:
    """Checks whether PostgreSQL connection parameters or URI are configured."""
    use_sqlite = os.environ.get('USE_SQLITE', '').lower() in ('1', 'true', 'yes')
    if use_sqlite:
        return False
    return bool(DATABASE_URL or (PGHOST and PGDATABASE and PGUSER))

def get_active_db_engine() -> str:
    """Returns 'PostgreSQL' if connected to PostgreSQL, else 'SQLite'."""
    if is_postgres_configured():
        return 'PostgreSQL'
    return 'SQLite'

def get_database_status() -> Dict[str, Any]:
    """Returns connection and metadata details for system inspection."""
    is_pg = is_postgres_configured()
    if is_pg:
        db_name = PGDATABASE or (DATABASE_URL.split('/')[-1].split('?')[0] if DATABASE_URL else 'postgres')
        host_info = PGHOST or (DATABASE_URL.split('@')[-1].split('/')[0] if (DATABASE_URL and '@' in DATABASE_URL) else 'remote')
        return {
            'engine': 'PostgreSQL',
            'configured': True,
            'database': db_name,
            'host': host_info
        }
    return {
        'engine': 'SQLite',
        'configured': True,
        'database': 'admin.db',
        'host': 'localhost (file)'
    }


# ==========================================
# POSTGRESQL DRIVER ADAPTER & WRAPPERS
# ==========================================

class PostgresCursorWrapper:
    """
    Transparent cursor wrapper that allows standard SQLite-style queries (?)
    to execute cleanly on PostgreSQL (%s), while providing dict and index access.
    """
    def __init__(self, raw_cursor, raw_conn):
        self._cursor = raw_cursor
        self._conn = raw_conn
        self._lastrowid = None

    @staticmethod
    def _convert_query(query: str) -> str:
        """Converts SQLite '?' parameter placeholders to PostgreSQL '%s' placeholders."""
        if '?' not in query:
            return query
        parts = []
        in_quote = False
        quote_char = None
        for ch in query:
            if ch in ("'", '"') and not in_quote:
                in_quote = True
                quote_char = ch
                parts.append(ch)
            elif ch == quote_char and in_quote:
                in_quote = False
                parts.append(ch)
            elif ch == '?' and not in_quote:
                parts.append('%s')
            else:
                parts.append(ch)
        return ''.join(parts)

    def execute(self, query: str, params=None):
        clean_q = query.strip()
        # Bypass PRAGMA statements on PostgreSQL (SQLite-specific)
        if clean_q.upper().startswith('PRAGMA'):
            return self

        converted = self._convert_query(clean_q)
        is_insert = converted.lstrip().upper().startswith('INSERT')

        if is_insert and 'RETURNING' not in converted.upper():
            try:
                self._cursor.execute(converted + " RETURNING id", params or ())
                row = self._cursor.fetchone()
                if row:
                    self._lastrowid = row[0]
                return self
            except Exception:
                self._conn.rollback()

        if params is not None:
            self._cursor.execute(converted, params)
        else:
            self._cursor.execute(converted)
        return self

    def executemany(self, query: str, seq_of_params):
        converted = self._convert_query(query.strip())
        self._cursor.executemany(converted, seq_of_params)
        return self

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def fetchmany(self, size=None):
        return self._cursor.fetchmany(size) if size else self._cursor.fetchmany()

    @property
    def rowcount(self):
        return self._cursor.rowcount

    @property
    def lastrowid(self):
        return self._lastrowid

    @property
    def description(self):
        return self._cursor.description

    def close(self):
        self._cursor.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class PostgresConnectionWrapper:
    """Connection wrapper delivering DictCursor instances compatible with SQLite Row."""
    def __init__(self, raw_conn):
        self._conn = raw_conn

    def cursor(self):
        import psycopg2.extras
        raw_cursor = self._conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        return PostgresCursorWrapper(raw_cursor, self._conn)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

    def execute(self, query: str, params=None):
        cur = self.cursor()
        cur.execute(query, params)
        return cur

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


_pg_last_fail_time = 0
_PG_RETRY_INTERVAL = 15  # Retry postgres connection after 15 seconds if temporarily unreachable

def get_db_connection():
    """
    Returns an active database connection.
    Connects to PostgreSQL if configured (DATABASE_URL or PG* credentials).
    Falls back gracefully to SQLite if PostgreSQL is not configured or server is unreachable.
    Uses a circuit breaker so failing remote postgres connections don't block subsequent requests.
    """
    global _pg_last_fail_time
    import time
    now = time.time()
    if is_postgres_configured() and (now - _pg_last_fail_time > _PG_RETRY_INTERVAL):
        try:
            import psycopg2
            if DATABASE_URL:
                uri = DATABASE_URL
                if uri.startswith('postgres://'):
                    uri = uri.replace('postgres://', 'postgresql://', 1)
                raw_conn = psycopg2.connect(uri, client_encoding='utf8', connect_timeout=15, keepalives=1, keepalives_idle=30, keepalives_interval=10, keepalives_count=5)
            else:
                raw_conn = psycopg2.connect(
                    host=PGHOST,
                    port=int(PGPORT or 5432),
                    dbname=PGDATABASE,
                    user=PGUSER,
                    password=PGPASSWORD,
                    connect_timeout=15,
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=5
                )
            return PostgresConnectionWrapper(raw_conn)
        except Exception as pg_err:
            _pg_last_fail_time = now
            print(f"[-] Notice: PostgreSQL connection unreachable ({pg_err}). Using SQLite fallback.")

    # SQLite Fallback Connection
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_postgres_tables(conn):
    """Initializes tables in PostgreSQL database with standard schemas."""
    cursor = conn.cursor()
    cursor.execute("""
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

    cursor.execute("""
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
        aadhaar_front_image TEXT,
        aadhaar_back_image TEXT,
        aadhaar_status VARCHAR(50) DEFAULT 'pending',
        aadhaar_rejection_reason TEXT,
        single_photos TEXT,
        family_photos TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
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

    cursor.execute("""
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

    cursor.execute("""
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

    cursor.execute("""
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

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS membership_plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        tagline VARCHAR(250),
        badge VARCHAR(50),
        is_popular INTEGER DEFAULT 0,
        color VARCHAR(30) DEFAULT 'amber',
        contact_credits INTEGER DEFAULT 30,
        price_1m INTEGER DEFAULT 0,
        offer_price_1m INTEGER DEFAULT 0,
        price_3m INTEGER DEFAULT 0,
        offer_price_3m INTEGER DEFAULT 0,
        price_6m INTEGER DEFAULT 0,
        offer_price_6m INTEGER DEFAULT 0,
        price_12m INTEGER DEFAULT 0,
        offer_price_12m INTEGER DEFAULT 0,
        daily_interests VARCHAR(100) DEFAULT 'Unlimited',
        kundali_reports VARCHAR(100) DEFAULT 'Basic Ashtakoot',
        search_boost VARCHAR(100) DEFAULT '1x Standard',
        has_advisor INTEGER DEFAULT 0,
        privacy_shield VARCHAR(100) DEFAULT 'Standard',
        support_level VARCHAR(100) DEFAULT 'Priority Support',
        features TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()

    # Migration for existing Postgres installations
    try:
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS price_1m INTEGER DEFAULT 0;")
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS offer_price_1m INTEGER DEFAULT 0;")
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS daily_interests VARCHAR(100) DEFAULT 'Unlimited';")
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS kundali_reports VARCHAR(100) DEFAULT 'Basic Ashtakoot';")
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS search_boost VARCHAR(100) DEFAULT '1x Standard';")
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS has_advisor INTEGER DEFAULT 0;")
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS privacy_shield VARCHAR(100) DEFAULT 'Standard';")
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS support_level VARCHAR(100) DEFAULT 'Priority Support';")
        cursor.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aadhaar_front_image TEXT;")
        cursor.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aadhaar_back_image TEXT;")
        cursor.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aadhaar_status VARCHAR(50) DEFAULT 'pending';")
        cursor.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aadhaar_rejection_reason TEXT;")
        conn.commit()
    except Exception as me:
        conn.rollback()
        print(f"[-] Postgres migration note: {me}")
    sync_postgres_sequences(conn)


def sync_postgres_sequences(conn):
    """Synchronizes all SERIAL primary key sequences with MAX(id) to prevent duplicate key errors."""
    try:
        tables = ['offers', 'payments', 'activity_logs', 'account_deletions', 'admin_users']
        raw_conn = getattr(conn, '_conn', conn)
        cur = raw_conn.cursor()
        for table in tables:
            try:
                cur.execute(f"SELECT pg_get_serial_sequence('{table}', 'id');")
                row = cur.fetchone()
                seq = row[0] if row else None
                if seq:
                    cur.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table};")
                    max_id = cur.fetchone()[0]
                    if max_id > 0:
                        cur.execute(f"SELECT setval('{seq}', {max_id}, true);")
                    else:
                        cur.execute(f"SELECT setval('{seq}', 1, false);")
            except Exception:
                raw_conn.rollback()
        raw_conn.commit()
    except Exception as e:
        print(f"[-] Sequence sync warning: {e}")



def init_sqlite_tables(conn):
    """Initializes tables in SQLite database with standard schemas."""
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'Super Admin',
        avatar TEXT,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        age INTEGER,
        gender TEXT,
        height TEXT,
        skin_colour TEXT,
        photo TEXT,
        religion TEXT,
        caste TEXT,
        mother_tongue TEXT,
        state TEXT,
        city TEXT,
        district TEXT,
        native_address TEXT,
        education TEXT,
        education_category TEXT,
        profession TEXT,
        company TEXT,
        annual_income TEXT,
        manglik TEXT,
        diet TEXT,
        verified INTEGER DEFAULT 0,
        aadhaar_verified INTEGER DEFAULT 0,
        govt_id_verified INTEGER DEFAULT 0,
        match_score INTEGER DEFAULT 85,
        status TEXT DEFAULT 'active',
        deletion_reason TEXT,
        deleted_at TIMESTAMP,
        aadhaar_front_image TEXT,
        aadhaar_back_image TEXT,
        aadhaar_status TEXT DEFAULT 'pending',
        aadhaar_rejection_reason TEXT,
        single_photos TEXT,
        family_photos TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("PRAGMA table_info(profiles)")
    cols = [col[1] for col in cursor.fetchall()]
    if 'deletion_reason' not in cols:
        cursor.execute("ALTER TABLE profiles ADD COLUMN deletion_reason TEXT")
    if 'deleted_at' not in cols:
        cursor.execute("ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMP")
    if 'aadhaar_front_image' not in cols:
        cursor.execute("ALTER TABLE profiles ADD COLUMN aadhaar_front_image TEXT")
    if 'aadhaar_back_image' not in cols:
        cursor.execute("ALTER TABLE profiles ADD COLUMN aadhaar_back_image TEXT")
    if 'aadhaar_status' not in cols:
        cursor.execute("ALTER TABLE profiles ADD COLUMN aadhaar_status TEXT DEFAULT 'pending'")
    if 'aadhaar_rejection_reason' not in cols:
        cursor.execute("ALTER TABLE profiles ADD COLUMN aadhaar_rejection_reason TEXT")
    if 'single_photos' not in cols:
        cursor.execute("ALTER TABLE profiles ADD COLUMN single_photos TEXT")
    if 'family_photos' not in cols:
        cursor.execute("ALTER TABLE profiles ADD COLUMN family_photos TEXT")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        discount_percent INTEGER NOT NULL,
        plan_type TEXT NOT NULL,
        description TEXT,
        valid_from TEXT,
        valid_until TEXT,
        max_uses INTEGER DEFAULT 100,
        current_uses INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        user_name TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL,
        invoice_no TEXT UNIQUE NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        action TEXT NOT NULL,
        target_entity TEXT NOT NULL,
        target_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS account_deletions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        user_name TEXT,
        email TEXT,
        phone TEXT,
        reason TEXT NOT NULL,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS membership_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tagline TEXT,
        badge TEXT,
        is_popular INTEGER DEFAULT 0,
        color TEXT DEFAULT 'amber',
        contact_credits INTEGER DEFAULT 30,
        price_3m INTEGER DEFAULT 0,
        offer_price_3m INTEGER DEFAULT 0,
        price_6m INTEGER DEFAULT 0,
        offer_price_6m INTEGER DEFAULT 0,
        price_12m INTEGER DEFAULT 0,
        offer_price_12m INTEGER DEFAULT 0,
        price_1m INTEGER DEFAULT 0,
        offer_price_1m INTEGER DEFAULT 0,
        daily_interests TEXT DEFAULT 'Unlimited',
        kundali_reports TEXT DEFAULT 'Basic Ashtakoot',
        search_boost TEXT DEFAULT '1x Standard',
        has_advisor INTEGER DEFAULT 0,
        privacy_shield TEXT DEFAULT 'Standard',
        support_level TEXT DEFAULT 'Priority Support',
        features TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()

    # Migration for existing SQLite installations: add detail columns if missing
    cursor.execute("PRAGMA table_info(membership_plans)")
    mp_cols = [c[1] for c in cursor.fetchall()]
    if 'price_1m' not in mp_cols:
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN price_1m INTEGER DEFAULT 0")
    if 'offer_price_1m' not in mp_cols:
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN offer_price_1m INTEGER DEFAULT 0")
    if 'daily_interests' not in mp_cols:
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN daily_interests TEXT DEFAULT 'Unlimited'")
    if 'kundali_reports' not in mp_cols:
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN kundali_reports TEXT DEFAULT 'Basic Ashtakoot'")
    if 'search_boost' not in mp_cols:
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN search_boost TEXT DEFAULT '1x Standard'")
    if 'has_advisor' not in mp_cols:
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN has_advisor INTEGER DEFAULT 0")
    if 'privacy_shield' not in mp_cols:
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN privacy_shield TEXT DEFAULT 'Standard'")
    if 'support_level' not in mp_cols:
        cursor.execute("ALTER TABLE membership_plans ADD COLUMN support_level TEXT DEFAULT 'Priority Support'")
    conn.commit()


DEFAULT_MEMBERSHIP_PLANS = [
    {
        'id': 'free',
        'name': 'Free Basic',
        'tagline': 'Standard exploratory access',
        'badge': None,
        'is_popular': 0,
        'color': 'slate',
        'contact_credits': 5,
        'price_1m': 0,
        'offer_price_1m': 0,
        'price_3m': 0,
        'offer_price_3m': 0,
        'price_6m': 0,
        'offer_price_6m': 0,
        'price_12m': 0,
        'offer_price_12m': 0,
        'daily_interests': '5 / day',
        'kundali_reports': 'Basic Ashtakoot Milan',
        'search_boost': '1x Standard',
        'has_advisor': 0,
        'privacy_shield': 'Standard Public',
        'support_level': 'Basic Email (48-72h)',
        'features': json.dumps([
            {'text': 'Browse 100% Aadhaar Verified Profiles', 'included': True},
            {'text': 'Send up to 5 Interests per day', 'included': True},
            {'text': 'View 5 Verified Contact Numbers', 'included': True},
            {'text': 'Basic Ashtakoot Milan Summary', 'included': True},
            {'text': 'Direct WhatsApp & Phone Connect', 'included': False},
            {'text': 'Unlimited Chat & Messages', 'included': False},
            {'text': '3x Search Visibility Profile Boost', 'included': False},
            {'text': 'Personal Matchmaking Advisor', 'included': False}
        ]),
        'is_active': 1,
        'sort_order': 1
    },
    {
        'id': 'gold',
        'name': 'Gold Match',
        'tagline': 'Ideal for serious marriage seekers',
        'badge': 'POPULAR CHOICE',
        'is_popular': 0,
        'color': 'amber',
        'contact_credits': 30,
        'price_1m': 999,
        'offer_price_1m': 499,
        'price_3m': 2499,
        'offer_price_3m': 1299,
        'price_6m': 3999,
        'offer_price_6m': 1999,
        'price_12m': 6999,
        'offer_price_12m': 3299,
        'daily_interests': '25 / day',
        'kundali_reports': '15 Detailed Reports',
        'search_boost': '2x Priority',
        'has_advisor': 0,
        'privacy_shield': 'Photo Blur until Accepted',
        'support_level': 'Priority Chat & Email (24h)',
        'features': json.dumps([
            {'text': 'Browse 100% Aadhaar Verified Profiles', 'included': True},
            {'text': 'Send Unlimited Interests & Shortlists', 'included': True},
            {'text': 'View 30 Verified Mobile Numbers & Addresses', 'included': True},
            {'text': 'Full 36 Gunas Ashtakoot Astrological Dossier', 'included': True},
            {'text': 'Unlimited Direct Matrimonial Chat', 'included': True},
            {'text': 'Instant WhatsApp Family Connect Link', 'included': True},
            {'text': '3x Search Visibility Profile Boost', 'included': False},
            {'text': 'Personal Matchmaking Advisor', 'included': False}
        ]),
        'is_active': 1,
        'sort_order': 2
    },
    {
        'id': 'diamond',
        'name': 'Diamond VIP',
        'tagline': 'Fastest matches with 3x visibility',
        'badge': 'MOST POPULAR ⭐',
        'is_popular': 1,
        'color': 'blue',
        'contact_credits': 75,
        'price_1m': 1599,
        'offer_price_1m': 799,
        'price_3m': 3999,
        'offer_price_3m': 1999,
        'price_6m': 4999,
        'offer_price_6m': 2499,
        'price_12m': 8999,
        'offer_price_12m': 3999,
        'daily_interests': '50 / day',
        'kundali_reports': '50 Reports + PDF Download',
        'search_boost': '3x Spotlight',
        'has_advisor': 0,
        'privacy_shield': 'Protected Contact Access',
        'support_level': 'Priority Phone & WhatsApp (12h)',
        'features': json.dumps([
            {'text': 'Browse 100% Aadhaar Verified Profiles', 'included': True},
            {'text': 'Send Unlimited Interests & Follow-ups', 'included': True},
            {'text': 'View 75 Verified Contact Numbers + Parents Contacts', 'included': True},
            {'text': 'Full 36 Gunas Vedic Horoscope & Dosha Analysis', 'included': True},
            {'text': 'Priority Chat Badge & Read Receipts', 'included': True},
            {'text': 'Instant WhatsApp Connect & Family Contact Access', 'included': True},
            {'text': '3x Search Visibility & Spotlight in Match Feed', 'included': True},
            {'text': 'VIP Aadhaar Golden Shield on Profile', 'included': True},
            {'text': 'Dedicated Matrimonial Relationship Manager', 'included': False}
        ]),
        'is_active': 1,
        'sort_order': 3
    },
    {
        'id': 'vip',
        'name': 'Platinum Royal',
        'tagline': 'White-glove concierge matchmaking',
        'badge': 'ELITE CONCIERGE 👑',
        'is_popular': 0,
        'color': 'purple',
        'contact_credits': 999,
        'price_1m': 2999,
        'offer_price_1m': 1499,
        'price_3m': 6999,
        'offer_price_3m': 3499,
        'price_6m': 9999,
        'offer_price_6m': 4999,
        'price_12m': 14999,
        'offer_price_12m': 6999,
        'daily_interests': 'Unlimited',
        'kundali_reports': 'Unlimited + Senior Astrologer',
        'search_boost': '5x VIP Top Rank #1',
        'has_advisor': 1,
        'privacy_shield': '100% Strict VIP Shield',
        'support_level': '24/7 Dedicated VIP Concierge',
        'features': json.dumps([
            {'text': 'Unlimited Verified Contact Numbers & Native Addresses', 'included': True},
            {'text': 'Personal Dedicated Matrimonial Relationship Manager', 'included': True},
            {'text': 'Handpicked Verified Matches Introduced Every Weekend', 'included': True},
            {'text': 'Top #1 Spotlight in All District Searches', 'included': True},
            {'text': '100% Complete Privacy Shield (Hidden to Uninvited)', 'included': True},
            {'text': 'Unlimited Direct WhatsApp & Video Call Arranged', 'included': True},
            {'text': 'Senior Astrologer Kundali Matching Consultation', 'included': True},
            {'text': 'Complimentary Professional Matrimonial Photo Session', 'included': True}
        ]),
        'is_active': 1,
        'sort_order': 4
    }
]


def seed_default_plans(conn):
    """Populates initial membership plans if table is empty or enriches existing records."""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM membership_plans")
        count = cursor.fetchone()[0]
        if count == 0:
            for p in DEFAULT_MEMBERSHIP_PLANS:
                cursor.execute("""
                    INSERT INTO membership_plans (
                        id, name, tagline, badge, is_popular, color, contact_credits,
                        price_1m, offer_price_1m,
                        price_3m, offer_price_3m, price_6m, offer_price_6m,
                        price_12m, offer_price_12m,
                        daily_interests, kundali_reports, search_boost, has_advisor,
                        privacy_shield, support_level,
                        features, is_active, sort_order
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    p['id'], p['name'], p['tagline'], p['badge'], p['is_popular'],
                    p['color'], p['contact_credits'],
                    p['price_1m'], p['offer_price_1m'],
                    p['price_3m'], p['offer_price_3m'],
                    p['price_6m'], p['offer_price_6m'],
                    p['price_12m'], p['offer_price_12m'],
                    p['daily_interests'], p['kundali_reports'], p['search_boost'], p['has_advisor'],
                    p['privacy_shield'], p['support_level'],
                    p['features'], p['is_active'], p['sort_order']
                ))
            conn.commit()
            print("[+] Seeded default membership plans.")
        else:
            # Upgrade existing records if new detail columns are default/missing
            for p in DEFAULT_MEMBERSHIP_PLANS:
                cursor.execute("""
                    UPDATE membership_plans 
                    SET price_1m = CASE WHEN price_1m = 0 THEN ? ELSE price_1m END,
                        offer_price_1m = CASE WHEN offer_price_1m = 0 THEN ? ELSE offer_price_1m END,
                        daily_interests = COALESCE(daily_interests, ?),
                        kundali_reports = COALESCE(kundali_reports, ?),
                        search_boost = COALESCE(search_boost, ?),
                        has_advisor = CASE WHEN id = 'vip' THEN 1 ELSE has_advisor END,
                        privacy_shield = COALESCE(privacy_shield, ?),
                        support_level = COALESCE(support_level, ?)
                    WHERE id = ?
                """, (
                    p['price_1m'], p['offer_price_1m'],
                    p['daily_interests'], p['kundali_reports'], p['search_boost'],
                    p['privacy_shield'], p['support_level'],
                    p['id']
                ))
            conn.commit()
    except Exception as e:
        print(f"[-] Plans seed notice: {e}")


def seed_default_admin_users(conn):
    """Guarantees standard RBAC administrative accounts are provisioned without overwriting customized user credentials."""
    rbac_accounts = [
        ('admin', 'admin@i4you.com', 'Admin@12345', 'Arun Thomas', 'Super Admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'),
        ('crm', 'crm@i4you.com', 'Crm@12345', 'Priya Nair', 'CRM Manager', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'),
        ('finance', 'finance@i4you.com', 'Finance@12345', 'Kavita Iyer', 'Finance Manager', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'),
        ('support', 'support@i4you.com', 'Support@12345', 'Arun Kumar', 'Support Executive', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200')
    ]
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM admin_users WHERE role = 'Super Admin' LIMIT 1")
        has_super_admin = cursor.fetchone() is not None
    except Exception:
        has_super_admin = False

    for username, email, pwd, name, role, avatar in rbac_accounts:
        try:
            cursor.execute("SELECT id FROM admin_users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)", (email, username))
            row = cursor.fetchone()
            if not row:
                # If a Super Admin already exists, don't auto-create a duplicate super admin
                if role == 'Super Admin' and has_super_admin:
                    continue
                pass_hash = hash_password(pwd)
                cursor.execute("""
                    INSERT INTO admin_users (username, email, password_hash, full_name, role, avatar)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (username, email, pass_hash, name, role, avatar))
            # If account already exists, NEVER overwrite custom full_name, password_hash, or avatar!
        except Exception:
            pass
    conn.commit()


DEFAULT_OFFERS = [
    {
        'code': 'VIVAH50',
        'title': 'Festive Vivah Mahotsav: Flat 50% Savings',
        'discount_percent': 50,
        'plan_type': 'All Plans',
        'description': 'Flat 50% discount on all quarterly & annual plans during auspicious wedding season.',
        'valid_from': '2026-01-01',
        'valid_until': '2026-12-31',
        'max_uses': 500,
        'is_active': 1
    },
    {
        'code': 'FIRSTMATCH',
        'title': 'New Member Welcome Bonus: Flat 40% Off',
        'discount_percent': 40,
        'plan_type': 'All Plans',
        'description': 'Special introductory savings for newly registered candidates & families.',
        'valid_from': '2026-01-01',
        'valid_until': '2026-12-31',
        'max_uses': 300,
        'is_active': 1
    },
    {
        'code': 'ROYALVIP30',
        'title': 'Royal VIP Elite Upgrade Promo',
        'discount_percent': 30,
        'plan_type': 'Royal VIP 12-Months',
        'description': 'Exclusive 30% concession on VIP Assisted Matchmaking tier.',
        'valid_from': '2026-01-01',
        'valid_until': '2026-12-31',
        'max_uses': 150,
        'is_active': 1
    }
]


def seed_default_offers(conn):
    """Ensures standard promotional discount coupons exist and are active."""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM offers WHERE is_active = 1")
        active_count = cursor.fetchone()[0]
        if active_count == 0:
            for o in DEFAULT_OFFERS:
                try:
                    cursor.execute("""
                        INSERT INTO offers (
                            code, title, discount_percent, plan_type, description,
                            valid_from, valid_until, max_uses, current_uses, is_active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                    """, (
                        o['code'], o['title'], o['discount_percent'], o['plan_type'],
                        o['description'], o['valid_from'], o['valid_until'], o['max_uses'], o['is_active']
                    ))
                except Exception:
                    conn.rollback()
                    cursor.execute("UPDATE offers SET is_active = 1 WHERE code = ?", (o['code'],))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"[-] Offers seed notice: {e}")


def init_db():
    """Initializes database tables on PostgreSQL or SQLite depending on active engine."""
    conn = get_db_connection()
    try:
        if isinstance(conn, PostgresConnectionWrapper):
            init_postgres_tables(conn)
        else:
            init_sqlite_tables(conn)
        seed_default_plans(conn)
        seed_default_offers(conn)
        seed_default_admin_users(conn)
    finally:
        conn.close()

    # Automatically ensure customer PII records are encrypted at rest
    migrate_encrypt_customer_data()


# ==========================================
# SECURE ADMIN AUTHENTICATION & MANAGEMENT
# ==========================================

def create_admin_user(
    username: str, 
    email: str, 
    password: str, 
    full_name: str, 
    role: str = 'Super Admin',
    avatar: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates an admin user with:
    - Input sanitization (username, email, name)
    - Strong password validation
    - Salted password hashing (scrypt / PBKDF2)
    - Strictly parameterized SQL INSERT
    """
    # 1. Sanitize & validate inputs
    clean_username = sanitize_text(username, max_length=50).lower().replace(' ', '')
    if not clean_username:
        raise ValueError("Username cannot be empty.")
    
    clean_email = sanitize_email(email)
    clean_name = sanitize_text(full_name, max_length=100)
    clean_role = sanitize_text(role, max_length=50) or 'Super Admin'
    clean_avatar = sanitize_text(avatar, max_length=500) if avatar else None

    # 2. Validate password complexity
    is_valid, msg = validate_password_strength(password)
    if not is_valid:
        raise ValueError(f"Password validation failed: {msg}")

    # 3. Hash password
    pass_hash = hash_password(password)

    # 4. Parameterized Insert
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO admin_users (username, email, password_hash, full_name, role, avatar)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (clean_username, clean_email, pass_hash, clean_name, clean_role, clean_avatar))
        user_id = cursor.lastrowid
        conn.commit()

        # Log security event
        log_activity_secure(
            action='ADMIN_USER_CREATED',
            target_entity='admin_users',
            target_id=str(user_id),
            details=f"Created admin user: {clean_username} ({clean_email})",
            admin_id=user_id
        )

        return {
            'id': user_id,
            'username': clean_username,
            'email': clean_email,
            'full_name': clean_name,
            'role': clean_role
        }
    finally:
        conn.close()


def authenticate_admin(
    username_or_email: str, 
    password: str, 
    ip_address: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Authenticates an admin user:
    - Sanitizes input
    - Constant-time password hash verification
    - Updates last_login timestamp on success
    - Audit logs success or failure with IP address
    """
    if not username_or_email or not password:
        return None
    
    clean_login = sanitize_text(username_or_email, max_length=100).strip().lower()
    clean_ip = sanitize_text(ip_address, max_length=45) if ip_address else None

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Parameterized query - prevents SQL injection
        cursor.execute("""
            SELECT id, username, email, password_hash, full_name, role, avatar, last_login
            FROM admin_users
            WHERE username = ? OR email = ?
        """, (clean_login, clean_login))
        user = cursor.fetchone()

        if not user:
            log_activity_secure(
                action='AUTH_FAILED',
                target_entity='admin_users',
                details=f"Failed login attempt for unknown user: {clean_login}",
                ip_address=clean_ip
            )
            return None

        # Timing-attack resistant verification
        if not verify_password(user['password_hash'], password):
            log_activity_secure(
                action='AUTH_FAILED',
                target_entity='admin_users',
                target_id=str(user['id']),
                details=f"Invalid password for admin user: {user['username']}",
                ip_address=clean_ip,
                admin_id=user['id']
            )
            return None

        # Update last login
        now_ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute("UPDATE admin_users SET last_login = ? WHERE id = ?", (now_ts, user['id']))
        conn.commit()

        log_activity_secure(
            action='AUTH_SUCCESS',
            target_entity='admin_users',
            target_id=str(user['id']),
            details=f"Successful admin login for {user['username']}",
            ip_address=clean_ip,
            admin_id=user['id']
        )

        user_dict = dict(user)
        del user_dict['password_hash']
        user_dict['last_login'] = now_ts
        return user_dict
    finally:
        conn.close()


def update_admin_password(user_id: int, old_password: str, new_password: str) -> bool:
    """Safely updates an admin's password with old password verification and strength check."""
    if not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("Invalid user ID.")
    
    is_valid, msg = validate_password_strength(new_password)
    if not is_valid:
        raise ValueError(f"New password does not meet requirements: {msg}")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM admin_users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user or not verify_password(user['password_hash'], old_password):
            return False

        new_hash = hash_password(new_password)
        cursor.execute("UPDATE admin_users SET password_hash = ? WHERE id = ?", (new_hash, user_id))
        conn.commit()

        log_activity_secure(
            action='PASSWORD_CHANGED',
            target_entity='admin_users',
            target_id=str(user_id),
            details="Admin password was successfully updated",
            admin_id=user_id
        )
        return True
    finally:
        conn.close()


# ==========================================
# SECURE PROFILES DATABASE OPERATIONS
# ==========================================

def search_profiles_secure(
    filters: Optional[Dict[str, Any]] = None,
    search_term: Optional[str] = None,
    sort_by: str = 'created_at',
    sort_dir: str = 'DESC',
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    """
    Searches profiles with multi-layered SQL injection defense:
    1. Strictly whitelists ORDER BY column against ALLOWED_SORT_COLUMNS
    2. Strictly whitelists sort direction against ALLOWED_SORT_DIRECTIONS
    3. Strictly whitelists filter keys against ALLOWED_FILTER_COLUMNS
    4. Binds ALL values as SQL parameters (?)
    5. Escapes wildcards in search terms for safe LIKE queries with ESCAPE '\\'
    6. Sanitizes integer pagination limits and offsets
    """
    # 1. Validate sorting identifiers against strict whitelists
    safe_sort_col = sanitize_identifier(sort_by, ALLOWED_SORT_COLUMNS, "Sort Column")
    safe_sort_dir = sanitize_identifier(sort_dir.upper(), ALLOWED_SORT_DIRECTIONS, "Sort Direction")

    # 2. Validate pagination
    page = max(1, int(page))
    page_size = max(1, min(100, int(page_size)))
    offset = (page - 1) * page_size

    # 3. Construct parameterized query
    where_clauses = []
    params: List[Any] = []

    if filters:
        for key, val in filters.items():
            if val is None or val == '' or val == 'All':
                continue
            # Validate column name against whitelist
            safe_key = sanitize_identifier(key, ALLOWED_FILTER_COLUMNS, "Filter Field")
            where_clauses.append(f"{safe_key} = ?")
            params.append(val)

    # 4. Search term (safe parameterized LIKE with wildcard escaping)
    if search_term and search_term.strip():
        raw_term = search_term.strip()
        # Audit log if someone tries SQL injection payloads in search
        if check_sql_injection_attempt(raw_term):
            log_activity_secure(
                action='SQLI_PROBE_DETECTED',
                target_entity='profiles',
                details=f"Potential SQL injection pattern in search: {raw_term[:100]}"
            )
        
        escaped_term = f"%{escape_sql_like(raw_term)}%"
        search_subclauses = [
            "name LIKE ? ESCAPE '\\'",
            "city LIKE ? ESCAPE '\\'",
            "district LIKE ? ESCAPE '\\'",
            "profession LIKE ? ESCAPE '\\'",
            "caste LIKE ? ESCAPE '\\'",
            "education LIKE ? ESCAPE '\\'"
        ]
        where_clauses.append(f"({' OR '.join(search_subclauses)})")
        params.extend([escaped_term] * len(search_subclauses))

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Count total matching records
        count_sql = f"SELECT COUNT(*) as total FROM profiles {where_sql}"
        cursor.execute(count_sql, tuple(params))
        total_count = cursor.fetchone()['total']

        # Fetch paginated results (identifiers are strictly whitelisted, parameters are bound)
        query_sql = f"""
            SELECT * FROM profiles
            {where_sql}
            ORDER BY {safe_sort_col} {safe_sort_dir}
            LIMIT ? OFFSET ?
        """
        query_params = tuple(params + [page_size, offset])
        cursor.execute(query_sql, query_params)
        rows = cursor.fetchall()

        return {
            'data': list_from_rows(rows),
            'total': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        }
    finally:
        conn.close()


def get_profile_by_id_secure(profile_id: str) -> Optional[Dict[str, Any]]:
    """Safely retrieves a single profile by ID with decrypted customer PII."""
    clean_id = sanitize_profile_id(profile_id)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM profiles WHERE id = ?", (clean_id,))
        row = cursor.fetchone()
        return dict_from_row(row) if row else None
    finally:
        conn.close()


def create_profile_secure(profile_data: Dict[str, Any]) -> str:
    """
    Safely creates a new profile record with:
    - Input sanitization
    - Profile ID format verification
    - 100% Parameterized INSERT statement
    """
    clean_id = sanitize_profile_id(profile_data.get('id') or f"p-{datetime.now().strftime('%y%m%d%H%M%S')}")
    clean_name = sanitize_text(profile_data.get('name'), max_length=100)
    if not clean_name:
        raise ValueError("Profile name is required.")
    
    clean_email = sanitize_email(profile_data['email']) if profile_data.get('email') else None
    clean_phone = sanitize_phone(profile_data['phone']) if profile_data.get('phone') else None
    clean_address = sanitize_text(profile_data.get('native_address'), max_length=250) if profile_data.get('native_address') else None
    
    # Encrypt sensitive customer PII fields before writing to SQLite
    enc_email = encrypt_customer_data(clean_email) if clean_email else None
    enc_phone = encrypt_customer_data(clean_phone) if clean_phone else None
    enc_address = encrypt_customer_data(clean_address) if clean_address else None

    clean_dict = {
        'id': clean_id,
        'name': clean_name,
        'email': enc_email,
        'phone': enc_phone,
        'age': int(profile_data.get('age', 25)),
        'gender': sanitize_text(profile_data.get('gender', 'Female'), max_length=20),
        'height': sanitize_text(profile_data.get('height'), max_length=20),
        'skin_colour': sanitize_text(profile_data.get('skin_colour'), max_length=30),
        'photo': str(profile_data['photo']).strip()[:15000000] if profile_data.get('photo') else None,
        'aadhaar_front_image': str(profile_data['aadhaar_front_image']).strip()[:15000000] if profile_data.get('aadhaar_front_image') else None,
        'aadhaar_back_image': str(profile_data['aadhaar_back_image']).strip()[:15000000] if profile_data.get('aadhaar_back_image') else None,
        'religion': sanitize_text(profile_data.get('religion', 'Hindu'), max_length=50),
        'caste': sanitize_text(profile_data.get('caste'), max_length=50),
        'mother_tongue': sanitize_text(profile_data.get('mother_tongue'), max_length=50),
        'state': sanitize_text(profile_data.get('state'), max_length=50),
        'city': sanitize_text(profile_data.get('city'), max_length=50),
        'district': sanitize_text(profile_data.get('district'), max_length=50),
        'native_address': enc_address,
        'education': sanitize_text(profile_data.get('education'), max_length=100),
        'education_category': sanitize_text(profile_data.get('education_category'), max_length=50),
        'profession': sanitize_text(profile_data.get('profession'), max_length=100),
        'company': sanitize_text(profile_data.get('company'), max_length=100),
        'annual_income': sanitize_text(profile_data.get('annual_income'), max_length=50),
        'manglik': sanitize_text(profile_data.get('manglik', 'Non-Manglik'), max_length=30),
        'diet': sanitize_text(profile_data.get('diet', 'Vegetarian'), max_length=30),
        'verified': 1 if profile_data.get('verified') else 0,
        'aadhaar_verified': 1 if profile_data.get('aadhaar_verified') else 0,
        'govt_id_verified': 1 if profile_data.get('govt_id_verified') else 0,
        'aadhaar_status': sanitize_text(profile_data.get('aadhaar_status', 'approved' if profile_data.get('aadhaar_verified') else 'pending'), max_length=50),
        'aadhaar_rejection_reason': sanitize_text(profile_data.get('aadhaar_rejection_reason'), max_length=500),
        'match_score': int(profile_data.get('match_score', 85)),
        'status': sanitize_text(profile_data.get('status', 'active'), max_length=20)
    }

    cols = list(clean_dict.keys())
    placeholders = ', '.join(['?'] * len(cols))
    sql = f"INSERT INTO profiles ({', '.join(cols)}) VALUES ({placeholders})"

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, tuple(clean_dict.values()))
        conn.commit()
        return clean_id
    finally:
        conn.close()


def update_profile_secure(profile_id: str, updates: Dict[str, Any]) -> bool:
    """
    Safely updates fields on a profile:
    - Verifies column names against ALLOWED_PROFILE_UPDATE_FIELDS whitelist
    - Sanitizes input values
    - Encrypts sensitive customer PII fields with AES-256-GCM
    - Uses parameterized UPDATE statement
    """
    clean_id = sanitize_profile_id(profile_id)
    if not updates:
        return False

    set_clauses = []
    params = []

    for field, val in updates.items():
        if field not in ALLOWED_PROFILE_UPDATE_FIELDS:
            raise ValueError(f"Security Alert: Field '{field}' is not permitted for update.")
        
        # Sanitize and encrypt based on field type
        if field in ('email',):
            val = sanitize_email(val) if val else None
            val = encrypt_customer_data(val) if val else None
        elif field in ('phone',):
            val = sanitize_phone(val) if val else None
            val = encrypt_customer_data(val) if val else None
        elif field in ('native_address',):
            val = sanitize_text(val, max_length=250) if val else None
            val = encrypt_customer_data(val) if val else None
        elif field in ('photo', 'aadhaar_front_image', 'aadhaar_back_image'):
            # Allow base64 data URIs or standard URLs without truncating
            val = str(val).strip() if val else None
            if val and len(val) > 15000000:
                val = val[:15000000]
        elif field in ('age', 'match_score', 'verified', 'aadhaar_verified', 'govt_id_verified'):
            val = int(val) if val is not None else 0
        else:
            val = sanitize_text(val, max_length=250) if val else None

        set_clauses.append(f"{field} = ?")
        params.append(val)

    now_ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    set_clauses.append("updated_at = ?")
    params.append(now_ts)

    params.append(clean_id)
    sql = f"UPDATE profiles SET {', '.join(set_clauses)} WHERE id = ?"

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, tuple(params))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def delete_profile_secure(profile_id: str) -> bool:
    """Safely deletes a profile using parameterized DELETE."""
    clean_id = sanitize_profile_id(profile_id)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM profiles WHERE id = ?", (clean_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# ==========================================
# AUDIT & SECURITY LOGGING
# ==========================================

def log_activity_secure(
    action: str,
    target_entity: str,
    target_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
    admin_id: Optional[int] = None
):
    """Logs security and administration events with strict parameterization."""
    clean_action = sanitize_text(action, max_length=50)
    clean_entity = sanitize_text(target_entity, max_length=50)
    clean_target_id = sanitize_text(target_id, max_length=50) if target_id else None
    clean_details = sanitize_text(details, max_length=500) if details else None
    clean_ip = sanitize_text(ip_address, max_length=45) if ip_address else None

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO activity_logs (admin_id, action, target_entity, target_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (admin_id, clean_action, clean_entity, clean_target_id, clean_details, clean_ip))
        conn.commit()
    except Exception as e:
        # Avoid crashing primary operations if logging encounters an issue
        print(f"[-] Logging error: {e}")
    finally:
        conn.close()


def get_activity_logs_secure(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves recent security activity logs with parameterized LIMIT."""
    safe_limit = max(1, min(200, int(limit)))
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM activity_logs 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (safe_limit,))
        return [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()


# Helper dict conversion with transparent customer data decryption
def dict_from_row(row, decrypt_pii: bool = True):
    if not row:
        return None
    d = dict(row)
    if decrypt_pii:
        for field in SENSITIVE_CUSTOMER_FIELDS:
            if field in d and d[field]:
                d[field] = decrypt_customer_data(d[field])
    return d


def list_from_rows(rows, decrypt_pii: bool = True):
    if not rows:
        return []
    return [dict_from_row(r, decrypt_pii=decrypt_pii) for r in rows]


def migrate_encrypt_customer_data():
    """
    Retroactive database migration:
    Scans the profiles table for any legacy unencrypted customer PII
    (phone, email, native_address) and encrypts them at rest using AES-256-GCM.
    Ensures that existing records are retrofitted with enterprise encryption.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, phone, email, native_address FROM profiles")
        rows = cursor.fetchall()
        migrated_count = 0
        for r in rows:
            p_id = r['id']
            phone = r['phone']
            email = r['email']
            address = r['native_address']

            updates = []
            params = []

            if phone and not is_encrypted(phone):
                updates.append("phone = ?")
                params.append(encrypt_customer_data(phone))
            if email and not is_encrypted(email):
                updates.append("email = ?")
                params.append(encrypt_customer_data(email))
            if address and not is_encrypted(address):
                updates.append("native_address = ?")
                params.append(encrypt_customer_data(address))

            if updates:
                params.append(p_id)
                cursor.execute(f"UPDATE profiles SET {', '.join(updates)} WHERE id = ?", tuple(params))
                migrated_count += 1

        if migrated_count > 0:
            conn.commit()
            print(f"[+] Security: Retrofitted {migrated_count} customer profile(s) with AES-256-GCM at-rest encryption.")
    except Exception as e:
        print(f"[-] Migration notice: {e}")
    finally:
        conn.close()


# ==========================================
# MEMBERSHIP PLANS & PRICING MANAGEMENT
# ==========================================

ALLOWED_PLAN_UPDATE_FIELDS = {
    'name', 'tagline', 'badge', 'is_popular', 'color', 'contact_credits',
    'price_1m', 'offer_price_1m',
    'price_3m', 'offer_price_3m', 'price_6m', 'offer_price_6m',
    'price_12m', 'offer_price_12m',
    'daily_interests', 'kundali_reports', 'search_boost', 'has_advisor',
    'privacy_shield', 'support_level',
    'features', 'is_active', 'sort_order'
}

def get_all_membership_plans(active_only: bool = False) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if active_only:
            cursor.execute("SELECT * FROM membership_plans WHERE is_active = 1 ORDER BY sort_order ASC, id ASC")
        else:
            cursor.execute("SELECT * FROM membership_plans ORDER BY sort_order ASC, id ASC")
        rows = cursor.fetchall()
        plans = []
        for r in rows:
            d = dict_from_row(r, decrypt_pii=False)
            if d.get('features') and isinstance(d['features'], str):
                try:
                    d['features_parsed'] = json.loads(d['features'])
                except Exception:
                    d['features_parsed'] = []
            else:
                d['features_parsed'] = d.get('features') or []
            plans.append(d)
        return plans
    finally:
        conn.close()


def get_membership_plan_by_id(plan_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM membership_plans WHERE id = ?", (plan_id,))
        row = cursor.fetchone()
        if not row:
            return None
        d = dict_from_row(row, decrypt_pii=False)
        if d.get('features') and isinstance(d['features'], str):
            try:
                d['features_parsed'] = json.loads(d['features'])
            except Exception:
                d['features_parsed'] = []
        else:
            d['features_parsed'] = d.get('features') or []
        return d
    finally:
        conn.close()


def create_membership_plan_db(plan_data: Dict[str, Any]) -> Dict[str, Any]:
    plan_id = sanitize_text(plan_data.get('id', ''), max_length=50).lower().replace(' ', '_')
    if not plan_id:
        raise ValueError("Plan ID is required")
    name = sanitize_text(plan_data.get('name', ''), max_length=100)
    if not name:
        raise ValueError("Plan Name is required")

    features_raw = plan_data.get('features', '[]')
    if not isinstance(features_raw, str):
        features_str = json.dumps(features_raw)
    else:
        features_str = features_raw

    # If plan already exists, update it instead
    existing = get_membership_plan_by_id(plan_id)
    if existing:
        return update_membership_plan_db(plan_id, plan_data)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO membership_plans (
                id, name, tagline, badge, is_popular, color, contact_credits,
                price_1m, offer_price_1m,
                price_3m, offer_price_3m, price_6m, offer_price_6m,
                price_12m, offer_price_12m,
                daily_interests, kundali_reports, search_boost, has_advisor,
                privacy_shield, support_level,
                features, is_active, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            plan_id,
            name,
            sanitize_text(plan_data.get('tagline', ''), max_length=250),
            sanitize_text(plan_data.get('badge', ''), max_length=50) or None,
            1 if plan_data.get('is_popular') else 0,
            sanitize_text(plan_data.get('color', 'amber'), max_length=30),
            int(plan_data.get('contact_credits', 30)),
            int(plan_data.get('price_1m', 0)),
            int(plan_data.get('offer_price_1m', 0)),
            int(plan_data.get('price_3m', 0)),
            int(plan_data.get('offer_price_3m', 0)),
            int(plan_data.get('price_6m', 0)),
            int(plan_data.get('offer_price_6m', 0)),
            int(plan_data.get('price_12m', 0)),
            int(plan_data.get('offer_price_12m', 0)),
            sanitize_text(plan_data.get('daily_interests', 'Unlimited'), max_length=100),
            sanitize_text(plan_data.get('kundali_reports', 'Basic Ashtakoot'), max_length=100),
            sanitize_text(plan_data.get('search_boost', '1x Standard'), max_length=100),
            1 if plan_data.get('has_advisor') else 0,
            sanitize_text(plan_data.get('privacy_shield', 'Standard'), max_length=100),
            sanitize_text(plan_data.get('support_level', 'Priority Support'), max_length=100),
            features_str,
            1 if plan_data.get('is_active', 1) else 0,
            int(plan_data.get('sort_order', 99))
        ))
        conn.commit()
        return get_membership_plan_by_id(plan_id)
    finally:
        conn.close()


def update_membership_plan_db(plan_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    existing = get_membership_plan_by_id(plan_id)
    if not existing:
        return None

    set_clauses = []
    params = []

    for field, val in updates.items():
        if field not in ALLOWED_PLAN_UPDATE_FIELDS:
            continue
        if field == 'features':
            val = json.dumps(val) if not isinstance(val, str) else val
        elif field in ('is_popular', 'is_active', 'has_advisor'):
            val = 1 if val else 0
        elif field in ('contact_credits', 'price_1m', 'offer_price_1m', 'price_3m', 'offer_price_3m', 'price_6m', 'offer_price_6m', 'price_12m', 'offer_price_12m', 'sort_order'):
            val = int(val) if val is not None else 0
        elif field in ('badge', 'daily_interests', 'kundali_reports', 'search_boost', 'privacy_shield', 'support_level'):
            val = sanitize_text(val, max_length=100) if val else None
        else:
            val = sanitize_text(val, max_length=250) if val else None

        set_clauses.append(f"{field} = ?")
        params.append(val)

    if not set_clauses:
        return existing

    set_clauses.append("updated_at = ?")
    params.append(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    params.append(plan_id)

    sql = f"UPDATE membership_plans SET {', '.join(set_clauses)} WHERE id = ?"
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, tuple(params))
        conn.commit()
        return get_membership_plan_by_id(plan_id)
    finally:
        conn.close()


def toggle_membership_plan_db(plan_id: str) -> Optional[Dict[str, Any]]:
    plan = get_membership_plan_by_id(plan_id)
    if not plan:
        return None
    new_state = 0 if plan.get('is_active') == 1 else 1
    return update_membership_plan_db(plan_id, {'is_active': new_state})


def delete_membership_plan_db(plan_id: str) -> bool:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM membership_plans WHERE id = ?", (plan_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


