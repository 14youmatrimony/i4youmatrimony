import os
import sys
from dotenv import load_dotenv

load_dotenv('.env')
load_dotenv('admin/.env')

db_url = os.environ.get('DATABASE_URL')
print('Database URL configured:', bool(db_url))
if db_url:
    print('Target host:', db_url.split('@')[-1] if '@' in db_url else 'N/A')

import psycopg2
try:
    conn = psycopg2.connect(db_url, connect_timeout=10)
    print('SUCCESS: Connected to Supabase PostgreSQL!')
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
    tables = cur.fetchall()
    print('Existing public tables in Supabase:', [t[0] for t in tables])
    conn.close()
except Exception as e:
    print('FAILED to connect to PostgreSQL:', type(e), e)
