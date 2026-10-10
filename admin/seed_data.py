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

    # 3. Seed Promotional Offers & Discounts
    cursor.execute("SELECT COUNT(*) FROM offers")
    if cursor.fetchone()[0] == 0:
        offers_data = [
            (
                'FESTIVE50', 'Diwali Festive Mega Discount', 50, 'All Plans',
                'Special 50% discount on all quarterly and annual matrimonial premium plans.',
                '2026-09-01', '2026-11-30', 500, 142, 1
            ),
            (
                'ROYALVIP30', 'Royal VIP Elite Upgrade Promo', 30, 'Royal VIP 12-Months',
                'Exclusive 30% reduction for Elite matchmaking with dedicated relationship manager.',
                '2026-08-15', '2026-12-31', 200, 89, 1
            ),
            (
                'WELCOME25', 'New Member Welcome Special', 25, 'Gold 3-Months',
                '25% instant discount on first-time profile upgrades for verified users.',
                '2026-07-01', '2026-10-31', 1000, 418, 1
            ),
            (
                'PLATINUM20', 'Platinum 6-Month Saver Pass', 20, 'Platinum 6-Months',
                'Save 20% on our most popular 6-month unlimited contact views and horoscopes.',
                '2026-08-01', '2026-10-15', 350, 214, 1
            ),
            (
                'EARLYBIRD35', 'Super Early Bird Advantage', 35, 'All Plans',
                'Limited 100-redemption code for newly registered verified singles.',
                '2026-09-15', '2026-09-30', 100, 94, 1
            ),
            (
                'EXPIRED10', 'Summer Flash Sale (Archived)', 10, 'Gold 3-Months',
                'Past promotional code for summer matchmaking drives.',
                '2026-05-01', '2026-06-30', 500, 492, 0
            )
        ]
        cursor.executemany("""
            INSERT INTO offers (
                code, title, discount_percent, plan_type, description,
                valid_from, valid_until, max_uses, current_uses, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, offers_data)
        print(f"[+] Seeded {len(offers_data)} promotional offers and discounts.")

    # 4. Seed Payments & Payment History
    cursor.execute("SELECT COUNT(*) FROM payments")
    if cursor.fetchone()[0] == 0:
        payments_data = [
            ('TXN-884920', 'p1', 'Dr. Ananya Kulkarni', 'Platinum 6-Months', 5499.00, 'INR', 'UPI (Google Pay)', 'completed', 'INV-2026-0081', '2026-08-10 11:35:00', 'Applied promo FESTIVE50 (-50%)'),
            ('TXN-885102', 'p2', 'Rohan Mehta', 'Royal VIP 12-Months', 9999.00, 'INR', 'Razorpay (HDFC Credit Card)', 'completed', 'INV-2026-0082', '2026-08-14 14:40:00', 'Applied promo ROYALVIP30 (-30%)'),
            ('TXN-885419', 'p3', 'Sneha Iyer', 'Gold 3-Months', 2499.00, 'INR', 'UPI (PhonePe)', 'completed', 'INV-2026-0083', '2026-08-18 10:10:00', 'Applied promo WELCOME25 (-25%)'),
            ('TXN-885834', 'p4', 'Vikramaditya Rao', 'Royal VIP 12-Months', 14299.00, 'INR', 'Net Banking (ICICI)', 'completed', 'INV-2026-0084', '2026-08-22 17:15:00', 'Full package with Astrology horoscope match'),
            ('TXN-886120', 'p5', 'Priya Deshmukh', 'Platinum 6-Months', 5499.00, 'INR', 'UPI (Paytm)', 'completed', 'INV-2026-0085', '2026-08-25 10:45:00', 'Direct UPI payment'),
            ('TXN-886491', 'p6', 'Arjun Nambiar', 'Royal VIP 12-Months', 9999.00, 'INR', 'Credit Card (Amex)', 'completed', 'INV-2026-0086', '2026-08-29 13:55:00', 'International traveler account activated'),
            ('TXN-886910', 'p7', 'Tanvi Chawla', 'Platinum 6-Months', 4399.00, 'INR', 'UPI (Google Pay)', 'completed', 'INV-2026-0087', '2026-09-02 18:30:00', 'Applied promo PLATINUM20 (-20%)'),
            ('TXN-887105', 'p8', 'Aditya Verma', 'Gold 3-Months', 2999.00, 'INR', 'Net Banking (SBI)', 'pending', 'INV-2026-0088', '2026-09-05 12:00:00', 'Awaiting bank NEFT confirmation'),
            ('TXN-887532', 'p9', 'Meera Bhatt', 'Gold 3-Months', 2249.00, 'INR', 'UPI (BHIM)', 'completed', 'INV-2026-0089', '2026-09-08 16:00:00', 'Applied promo WELCOME25 (-25%)'),
            ('TXN-887890', 'p10', 'Karthik Reddy', 'Royal VIP 12-Months', 14299.00, 'INR', 'Razorpay (Axis Bank)', 'completed', 'INV-2026-0090', '2026-09-11 12:40:00', 'VIP Relationship Manager assigned'),
            ('TXN-888123', 'p11', 'Sunil Joshi', 'Gold 3-Months', 2999.00, 'INR', 'Credit Card (HDFC)', 'refunded', 'INV-2026-0091', '2026-09-12 18:00:00', 'Refund requested due to duplicate payment - Processed'),
            ('TXN-888456', 'p12', 'Pooja Agarwal', 'Platinum 6-Months', 5499.00, 'INR', 'UPI (Google Pay)', 'completed', 'INV-2026-0092', '2026-09-14 15:20:00', 'Instant activation'),
            ('TXN-888789', 'p13', 'Devendra Patil', 'Gold 3-Months', 2999.00, 'INR', 'UPI (PhonePe)', 'failed', 'INV-2026-0093', '2026-09-17 10:45:00', 'UPI transaction timed out by issuing bank'),
            ('TXN-889012', 'p14', 'Simran Kaur', 'Platinum 6-Months', 4399.00, 'INR', 'Razorpay (Kotak NetBanking)', 'completed', 'INV-2026-0094', '2026-09-18 16:40:00', 'Applied promo PLATINUM20 (-20%)'),
            ('TXN-889345', 'p15', 'Nikhil Sharma', 'Royal VIP 12-Months', 9999.00, 'INR', 'UPI (Google Pay)', 'completed', 'INV-2026-0095', '2026-09-20 11:30:00', 'Applied promo ROYALVIP30 (-30%)')
        ]
        cursor.executemany("""
            INSERT INTO payments (
                transaction_id, user_id, user_name, plan_name, amount,
                currency, payment_method, status, invoice_no, payment_date, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, payments_data)
        print(f"[+] Seeded {len(payments_data)} payment transactions with complete history.")

    conn.commit()
    conn.close()
    print("[OK] Database seeding completed successfully!")

if __name__ == '__main__':
    seed()
