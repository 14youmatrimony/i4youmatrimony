import socket
import psycopg2
import urllib.parse

# Regions to test
regions = [
    'ap-south-1', # Mumbai
    'ap-southeast-1', # Singapore
    'eu-central-1', # Frankfurt
    'us-east-1', # N. Virginia
    'us-west-1', # N. California
    'eu-west-1', # Ireland
    'ap-northeast-1', # Tokyo
    'ap-southeast-2', # Sydney
]

project_ref = 'ejtkrilhntdbsiavugta'
password = urllib.parse.unquote('%40Thresiamma2')

print(f"Testing Supabase Pooler for project {project_ref}...")

for reg in regions:
    host = f"aws-0-{reg}.pooler.supabase.com"
    try:
        ip = socket.gethostbyname(host)
        # Try connecting on 6543 or 5432
        print(f"Testing {reg} ({host} -> {ip})...")
        try:
            conn = psycopg2.connect(
                dbname='postgres',
                user=f'postgres.{project_ref}',
                password=password,
                host=host,
                port=6543,
                sslmode='require',
                connect_timeout=4
            )
            print(f" SUCCESS! Project is in region: {reg} on port 6543!")
            cur = conn.cursor()
            cur.execute("SELECT current_database(), current_user;")
            print(" Connected as:", cur.fetchone())
            conn.close()
            break
        except Exception as e:
            err_str = str(e)
            if 'Tenant or user not found' in err_str:
                print(f"   [-] Not in {reg} (Tenant not found)")
            else:
                print(f"   [-] {reg} error: {err_str[:120]}")
    except Exception as e:
        print(f"   [-] DNS resolution error for {host}: {e}")
