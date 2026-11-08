import sys
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from database import get_db_connection, init_db

def seed():
    print("[*] Initializing database tables...")
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Seed RBAC Admin & Staff Users
    rbac_users = [
        ('admin', 'admin@i4you.com', 'Admin@12345', 'Arun Thomas', 'Super Admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'),
        ('crm', 'crm@i4you.com', 'Crm@12345', 'Priya Nair', 'CRM Manager', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'),
        ('finance', 'finance@i4you.com', 'Finance@12345', 'Kavita Iyer', 'Finance Manager', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'),
        ('support', 'support@i4you.com', 'Support@12345', 'Arun Kumar', 'Support Executive', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200')
    ]
    for username, email, pwd, name, role, avatar in rbac_users:
        cursor.execute("SELECT id FROM admin_users WHERE email = ? OR username = ?", (email, username))
        existing_admin = cursor.fetchone()
        if not existing_admin:
            pass_hash = generate_password_hash(pwd)
            cursor.execute("""
                INSERT INTO admin_users (username, email, password_hash, full_name, role, avatar)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (username, email, pass_hash, name, role, avatar))
            print(f"[+] Seeded RBAC user: {email} | Role: {role} (Password: {pwd})")
        else:
            # Ensure correct role is assigned
            cursor.execute("UPDATE admin_users SET role = ? WHERE email = ?", (role, email))

    # 2. Candidate Profiles (Strictly real registered profiles, all demo profiles removed)
    profiles_data = []
    # Seeded demo profiles permanently removed.

    # 3. Seed Promotional Offers & Discounts (Exclusively created by Super Admin)
    # No hardcoded dummy offers seeded.

    # 4. Seed Payments & Payment History (Real transactions only)
    # No hardcoded dummy payments seeded.

    conn.commit()
    conn.close()
    print("[OK] Database seeding completed successfully!")

if __name__ == '__main__':
    seed()
