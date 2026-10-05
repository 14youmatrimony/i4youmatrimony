import psycopg2
import urllib.parse

project_ref = 'ejtkrilhntdbsiavugta'
password = urllib.parse.unquote('%40Thresiamma2')
host = "aws-0-ap-northeast-1.pooler.supabase.com"

# Test port 5432 (Session mode)
for port in [5432, 6543]:
    try:
        print(f"\n--- Testing port {port} on {host} ---")
        conn = psycopg2.connect(
            dbname='postgres',
            user=f'postgres.{project_ref}',
            password=password,
            host=host,
            port=port,
            sslmode='require',
            connect_timeout=6
        )
        print(f"CONNECTED successfully on port {port}!")
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
        tables = [t[0] for t in cur.fetchall()]
        print("Existing public tables:", tables)
        if 'profiles' in tables:
            cur.execute("SELECT COUNT(*) FROM profiles;")
            count = cur.fetchone()[0]
            print(f"Rows currently in Supabase 'profiles' table: {count}")
            cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles';")
            cols = cur.fetchall()
            print("Columns in 'profiles' table:", cols)
        conn.close()
    except Exception as e:
        print(f"Error on port {port}:", e)
