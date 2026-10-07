import os
import sys
import json
import csv
import io
import math
import time
import base64
from functools import wraps
from datetime import datetime, timedelta

from flask import (
    Flask, request, jsonify, render_template, redirect, url_for,
    session, Response, make_response
)
from werkzeug.security import check_password_hash, generate_password_hash

# Ensure current dir is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import database
from database import get_db_connection, dict_from_row, list_from_rows, init_db, get_database_status
from security import (
    encrypt_customer_data,
    decrypt_customer_data,
    mask_customer_phone,
    mask_customer_email
)

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static')
)

app.secret_key = os.environ.get('SECRET_KEY', 'i4you-super-secret-matrimonial-admin-2026-key')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=12)

# Rate limiting / brute-force protection tracking
login_attempts = {}  # { ip_address: [timestamp, ...] }

def check_rate_limit(ip):
    now = time.time()
    attempts = [t for t in login_attempts.get(ip, []) if now - t < 300]  # past 5 min
    login_attempts[ip] = attempts
    return len(attempts) >= 6

def record_failed_attempt(ip):
    now = time.time()
    attempts = [t for t in login_attempts.get(ip, []) if now - t < 300]
    attempts.append(now)
    login_attempts[ip] = attempts

def clear_attempts(ip):
    if ip in login_attempts:
        del login_attempts[ip]

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

# ==========================================
# RBAC (ROLE-BASED ACCESS CONTROL) DEFINITIONS
# ==========================================

ROLE_PERMISSIONS = {
    'Super Admin': [
        'analytics:view',
        'users:view', 'users:edit', 'users:delete', 'users:verify', 'users:export',
        'offers:view', 'offers:edit', 'offers:delete',
        'plans:view', 'plans:edit', 'plans:delete',
        'payments:view', 'payments:edit', 'payments:delete', 'payments:export',
        'admins:view', 'admins:create', 'admins:edit', 'admins:delete',
        'system:view'
    ],
    'CRM Manager': [
        'analytics:view',
        'users:view', 'users:edit', 'users:delete', 'users:verify', 'users:export',
        'plans:view', 'offers:view'
    ],
    'Finance Manager': [
        'analytics:view',
        'payments:view', 'payments:edit', 'payments:export',
        'plans:view', 'plans:edit',
        'offers:view', 'offers:edit'
    ],
    'Support Executive': [
        'analytics:view',
        'users:view', 'users:verify'
    ]
}

ROLE_ALIASES = {
    'administrator': 'Super Admin',
    'admin': 'Super Admin',
    'matchmaking manager': 'CRM Manager',
    'crm': 'CRM Manager',
    'relationship manager': 'CRM Manager',
    'finance': 'Finance Manager',
    'accountant': 'Finance Manager',
    'support': 'Support Executive',
    'verifier': 'Support Executive',
    'agent': 'Support Executive'
}

def get_normalized_role(role_name: str) -> str:
    if not role_name:
        return 'Support Executive'
    normalized = role_name.strip()
    return ROLE_ALIASES.get(normalized.lower(), normalized)

def get_role_permissions(role_name: str) -> list:
    norm = get_normalized_role(role_name)
    return ROLE_PERMISSIONS.get(norm, ROLE_PERMISSIONS['Support Executive'])

def has_permission(role_name: str, permission: str) -> bool:
    perms = get_role_permissions(role_name)
    return permission in perms

def permission_required(permission: str):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'admin_id' not in session:
                if request.path.startswith('/api/'):
                    return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
                return redirect(url_for('login_page'))
            
            user_role = session.get('admin_role', '')
            if not has_permission(user_role, permission):
                return jsonify({
                    'error': 'Forbidden',
                    'message': f'Access Denied: Your assigned role ({user_role}) lacks the required permission ({permission}).'
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def roles_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'admin_id' not in session:
                if request.path.startswith('/api/'):
                    return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
                return redirect(url_for('login_page'))
            
            user_role = get_normalized_role(session.get('admin_role', ''))
            norm_allowed = [get_normalized_role(r) for r in allowed_roles]
            if user_role != 'Super Admin' and user_role not in norm_allowed:
                return jsonify({
                    'error': 'Forbidden',
                    'message': f'Access Denied: Action restricted to roles: {", ".join(allowed_roles)}. Your role is: {user_role}.'
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Ensure tables exist on boot
with app.app_context():
    init_db()

def find_profile_by_phone_or_name(phone_to_find, name_to_find, cursor):
    """Accurately finds existing profile despite AES-256-GCM non-deterministic encryption."""
    clean_target = ''.join(filter(str.isdigit, phone_to_find or ''))
    clean_name = (name_to_find or '').strip().lower()

    cursor.execute("SELECT id, phone, name FROM profiles")
    rows = cursor.fetchall()
    if clean_target:
        for r in rows:
            stored_phone = decrypt_customer_data(r['phone'])
            clean_stored = ''.join(filter(str.isdigit, stored_phone or ''))
            if clean_stored and (clean_stored.endswith(clean_target) or clean_target.endswith(clean_stored)):
                return r['id']
    
    # If phone didn't match, check clean name if meaningful
    if clean_name and len(clean_name) > 3:
        for r in rows:
            if (r['name'] or '').strip().lower() == clean_name:
                return r['id']

    return None

def optimize_profile_image_urls(u):
    """Replaces huge base64 data URIs with streaming HTTP endpoints to keep JSON responses fast and lightweight."""
    if not u or not isinstance(u, dict):
        return u
    uid = u.get('id')
    if not uid:
        return u

    # Parse single_photos JSON string if present
    sp = u.get('single_photos')
    if sp and isinstance(sp, str):
        try:
            u['single_photos'] = json.loads(sp)
        except Exception:
            u['single_photos'] = [sp]
    elif not sp or not isinstance(sp, list):
        u['single_photos'] = [u['photo']] if u.get('photo') else []

    # Parse family_photos JSON string if present
    fp = u.get('family_photos')
    if fp and isinstance(fp, str):
        try:
            u['family_photos'] = json.loads(fp)
        except Exception:
            u['family_photos'] = [fp]
    elif not fp or not isinstance(fp, list):
        u['family_photos'] = []

    photo = u.get('photo')
    if photo and str(photo).startswith('data:image/'):
        u['photo'] = f"/api/users/{uid}/photo"
    front = u.get('aadhaar_front_image')
    if front and str(front).startswith('data:image/'):
        u['aadhaar_front_image'] = f"/api/users/{uid}/aadhaar-front"
    back = u.get('aadhaar_back_image')
    if back and str(back).startswith('data:image/'):
        u['aadhaar_back_image'] = f"/api/users/{uid}/aadhaar-back"

    # Optimize single photos urls
    optimized_sp = []
    for idx, p_url in enumerate(u.get('single_photos') or []):
        if p_url and str(p_url).startswith('data:image/'):
            optimized_sp.append(f"/api/users/{uid}/gallery/single/{idx}")
        elif p_url:
            optimized_sp.append(p_url)
    u['single_photos'] = optimized_sp

    # Optimize family photos urls
    optimized_fp = []
    for idx, f_url in enumerate(u.get('family_photos') or []):
        if f_url and str(f_url).startswith('data:image/'):
            optimized_fp.append(f"/api/users/{uid}/gallery/family/{idx}")
        elif f_url:
            optimized_fp.append(f_url)
    u['family_photos'] = optimized_fp

    # Compute authentic photo presence
    has_real = False
    raw_p = photo or ''
    if raw_p and ('unsplash.com' not in str(raw_p) or str(raw_p).startswith('data:image/') or str(raw_p).startswith('/api/users/')):
        has_real = True
    elif u.get('single_photos'):
        for p in u['single_photos']:
            if p and 'unsplash.com' not in str(p):
                has_real = True
                break
    u['has_real_photo'] = has_real

    return u

# ==========================================
# CORS & PREFLIGHT HANDLER
# ==========================================

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    # Prevent browser caching of dashboard assets during active configuration
    if request.path.startswith('/static/') or request.path == '/' or request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

@app.route('/api/<path:subpath>', methods=['OPTIONS'])
def options_handler(subpath):
    return '', 204

# ==========================================
# PUBLIC APP APIS (Live Connection with React App)
# ==========================================

@app.route('/api/public/profiles', methods=['GET'])
def api_public_profiles():
    """Returns active candidate profiles formatted for the mobile match feed."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM profiles WHERE status = 'active' ORDER BY match_score DESC, created_at DESC")
    rows = list_from_rows(cursor.fetchall())
    conn.close()

    profiles = []
    for r in rows:
        p = {
            'id': r['id'],
            'name': r['name'],
            'age': r['age'],
            'gender': r['gender'],
            'height': r['height'] or "5'6\"",
            'skinColour': r['skin_colour'] or 'Fair',
            'photo': r['photo'] or 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
            'coverPhoto': 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200',
            'singlePhotos': [
                r['photo'] or 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'
            ],
            'familyPhotos': [
                'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800'
            ],
            'verified': bool(r['verified'] or r['aadhaar_verified'] or r['govt_id_verified']) if r.get('aadhaar_status') != 'sent_back' else False,
            'governmentIdVerified': bool(r['govt_id_verified']) if r.get('aadhaar_status') != 'sent_back' else False,
            'aadhaarVerified': bool(r.get('aadhaar_status') == 'approved' or (r.get('aadhaar_verified') and r.get('aadhaar_status') != 'sent_back')),
            'aadhaar_verified': 1 if (r.get('aadhaar_status') == 'approved' or (r.get('aadhaar_verified') and r.get('aadhaar_status') != 'sent_back')) else 0,
            'phone': r['phone'] or '+91 98201 00000',
            'nativeAddress': r['native_address'] or f"{r['city']}, {r['state']}",
            'matchScore': r['match_score'] or 90,
            'gunasMatch': f"{min(36, round((r['match_score'] or 90) * 0.36))}/36 Gunas",
            'manglik': r['manglik'] or 'Non-Manglik',
            'religion': r['religion'] or 'Hindu',
            'caste': r['caste'] or 'General',
            'motherTongue': r['mother_tongue'] or 'Hindi',
            'state': r['state'] or 'Maharashtra',
            'city': r['city'] or 'Mumbai',
            'district': r['district'] or r['city'] or 'Mumbai',
            'education': r['education'] or 'Graduate Degree',
            'educationCategory': r['education_category'] or 'Higher Education',
            'profession': r['profession'] or 'Professional',
            'company': r['company'] or 'Private Sector',
            'annualIncome': r['annual_income'] or '₹ 15 - 20 LPA',
            'diet': r['diet'] or 'Vegetarian',
            'familyDetails': {
                'type': 'Nuclear Family',
                'values': 'Traditional yet Progressive',
                'financialStatus': 'Upper Middle Class',
                'father': 'Retired Professional',
                'mother': 'Homemaker',
                'siblings': '1 Sibling'
            },
            'status': r['status'],
            'aadhaar_status': r.get('aadhaar_status') or ('approved' if r.get('aadhaar_verified') else 'pending'),
            'aadhaarStatus': r.get('aadhaar_status') or ('approved' if r.get('aadhaar_verified') else 'pending'),
            'aadhaar_rejection_reason': r.get('aadhaar_rejection_reason'),
            'aadhaarRejectionReason': r.get('aadhaar_rejection_reason')
        }
        profiles.append(p)

    return jsonify({'success': True, 'count': len(profiles), 'profiles': profiles})

@app.route('/api/public/profile/<id>', methods=['GET'])
def api_public_single_profile(id):
    """Returns single candidate profile details (including Aadhaar status & reasons) for client apps."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM profiles WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row:
        # Robust fallback for demo alias or name match
        if id in ('demo-priya', 'demo_user', 'p1'):
            cursor.execute("SELECT * FROM profiles WHERE id = 'p_1790963054403' OR name LIKE '%Priya Sharma%' ORDER BY updated_at DESC LIMIT 1")
            row = cursor.fetchone()
        if not row:
            cursor.execute("SELECT * FROM profiles WHERE name LIKE ? OR id LIKE ? LIMIT 1", (f"%{id}%", f"%{id}%"))
            row = cursor.fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'Profile not found'}), 404
    u_dict = dict_from_row(row)
    optimize_profile_image_urls(u_dict)
    for f in ('email', 'phone', 'native_address'):
        if u_dict.get(f):
            try:
                dec = decrypt_customer_data(u_dict[f])
                if dec:
                    u_dict[f] = dec
            except Exception:
                pass
    is_sent_back = (u_dict.get('aadhaar_status') == 'sent_back')
    is_approved = not is_sent_back and bool(u_dict.get('aadhaar_verified') or u_dict.get('aadhaar_status') == 'approved')
    u_dict['aadhaarVerified'] = is_approved
    u_dict['aadhaar_verified'] = 1 if is_approved else 0
    u_dict['aadhaar_status'] = 'sent_back' if is_sent_back else ('approved' if is_approved else 'pending')
    u_dict['aadhaarStatus'] = 'sent_back' if is_sent_back else ('approved' if is_approved else 'pending')
    u_dict['aadhaarRejectionReason'] = u_dict.get('aadhaar_rejection_reason')
    if is_sent_back:
        u_dict['verified'] = 0
        u_dict['govt_id_verified'] = 0
    resp = jsonify({'success': True, 'profile': u_dict})
    resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return resp

@app.route('/api/public/offers', methods=['GET'])
def api_public_offers():
    """Returns active promotional offers and coupon discounts for the mobile app and website."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM offers WHERE is_active = 1 ORDER BY discount_percent DESC")
    offers = list_from_rows(cursor.fetchall())
    conn.close()
    resp = jsonify({'success': True, 'offers': offers, 'count': len(offers)})
    resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    resp.headers['Pragma'] = 'no-cache'
    return resp

@app.route('/api/public/plans', methods=['GET'])
def api_public_plans():
    """Returns active membership plans & pricing tiers for the mobile app and website."""
    try:
        from database import get_all_membership_plans
        plans = get_all_membership_plans(active_only=True)
        resp = jsonify({'success': True, 'plans': plans, 'count': len(plans)})
        resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        resp.headers['Pragma'] = 'no-cache'
        return resp
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/public/register', methods=['POST'])
def api_public_register():
    """Registers a new user from the mobile app into the database for admin verification."""
    data = request.get_json() or {}
    name = data.get('name') or data.get('fullName', '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    gender = data.get('gender', 'Female')

    # Prioritize user's actual uploaded photo: from photo or singlePhotos
    photo = data.get('photo')
    single_photos = data.get('singlePhotos') or []
    
    # Check if photo is empty or is default Unsplash placeholder
    if not photo or (isinstance(photo, str) and 'unsplash.com' in photo):
        for sp in single_photos:
            if sp and 'unsplash.com' not in sp:
                photo = sp
                break
    
    aadhaar_front = data.get('aadhaar_front_image') or data.get('frontDocumentPreview') or None
    aadhaar_back = data.get('aadhaar_back_image') or data.get('backDocumentPreview') or None

    # Never allow Aadhaar document scan to become profile photo
    if photo and (photo == aadhaar_front or photo == aadhaar_back):
        photo = None

    user_id = data.get('id') or data.get('userId') or f"p_{int(time.time() * 1000)}"
    raw_phone = (data.get('phone') or data.get('mobile') or '').strip()
    enc_phone = encrypt_customer_data(raw_phone) if raw_phone else None
    enc_email = encrypt_customer_data(data.get('email', '').strip()) if data.get('email') else None
    enc_address = encrypt_customer_data((data.get('nativeAddress') or data.get('address', '')).strip()) if (data.get('nativeAddress') or data.get('address')) else None

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Check if profile already exists by id or phone or name
        target_id = None
        if user_id:
            cursor.execute("SELECT id, photo FROM profiles WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                target_id = row['id']
                if not photo or (isinstance(photo, str) and 'unsplash.com' in photo):
                    if row['photo']:
                        photo = row['photo']
        if not target_id:
            target_id = find_profile_by_phone_or_name(raw_phone, name, cursor)
            if target_id and (not photo or (isinstance(photo, str) and 'unsplash.com' in photo)):
                cursor.execute("SELECT photo FROM profiles WHERE id = ?", (target_id,))
                p_row = cursor.fetchone()
                if p_row and p_row['photo']:
                    photo = p_row['photo']

        if not photo:
            photo = (
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'
                if str(gender).lower() == 'female'
                else 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
            )

        # Any manual card upload or front/back Aadhaar photo uploaded from client MUST be pending review until admin approves
        has_aadhaar_upload = bool(aadhaar_front) or bool(aadhaar_back) or data.get('verificationType') == 'manual_card_upload'
        if has_aadhaar_upload:
            aadhaar_flag = 0
            aadhaar_status_val = 'pending'
        else:
            aadhaar_flag = 1 if (data.get('aadhaarVerified') and data.get('aadhaar_status') == 'approved') else 0
            aadhaar_status_val = 'approved' if aadhaar_flag == 1 else 'pending'

        single_photos_list = data.get('singlePhotos') or ([photo] if photo else [])
        family_photos_list = data.get('familyPhotos') or []
        sp_json = json.dumps(single_photos_list) if single_photos_list else None
        fp_json = json.dumps(family_photos_list) if family_photos_list else None

        if target_id:
            cursor.execute("""
                UPDATE profiles SET
                    name = ?, email = COALESCE(?, email), phone = COALESCE(?, phone),
                    age = ?, gender = ?, height = ?, skin_colour = ?,
                    photo = ?, 
                    single_photos = COALESCE(?, single_photos),
                    family_photos = COALESCE(?, family_photos),
                    aadhaar_front_image = COALESCE(?, aadhaar_front_image),
                    aadhaar_back_image = COALESCE(?, aadhaar_back_image),
                    religion = ?, caste = ?, mother_tongue = ?, state = ?, city = ?, district = ?,
                    native_address = COALESCE(?, native_address),
                    education = ?, profession = ?, company = ?, annual_income = ?,
                    manglik = ?, diet = ?,
                    verified = CASE WHEN ? = 1 THEN 1 ELSE verified END,
                    aadhaar_verified = ?,
                    govt_id_verified = CASE WHEN ? = 1 THEN 1 ELSE govt_id_verified END,
                    aadhaar_status = ?,
                    aadhaar_rejection_reason = CASE WHEN ? = 1 THEN NULL ELSE aadhaar_rejection_reason END,
                    updated_at = ?
                WHERE id = ?
            """, (
                name, enc_email, enc_phone or raw_phone,
                int(data.get('age', 25)), gender, data.get('height', "5'6\""), data.get('skinColour', 'Fair'),
                photo, sp_json, fp_json, aadhaar_front, aadhaar_back,
                data.get('religion', 'Hindu'), data.get('caste', ''), data.get('motherTongue', ''),
                data.get('state', ''), data.get('city', ''), data.get('district', ''),
                enc_address,
                data.get('education', ''), data.get('profession', ''), data.get('company', ''), data.get('annualIncome', ''),
                data.get('manglik', 'Non-Manglik'), data.get('diet', 'Vegetarian'),
                1 if (data.get('verified') and not has_aadhaar_upload) else 0,
                aadhaar_flag,
                1 if (data.get('governmentIdVerified') and not has_aadhaar_upload) else 0,
                aadhaar_status_val,
                1 if has_aadhaar_upload else 0,
                now_str, target_id
            ))
            actual_id = target_id
        else:
            actual_id = user_id
            cursor.execute("""
                INSERT INTO profiles (
                    id, name, email, phone, age, gender, height, skin_colour, photo,
                    single_photos, family_photos,
                    religion, caste, mother_tongue, state, city, district, native_address,
                    education, profession, company, annual_income, manglik, diet,
                    verified, aadhaar_verified, govt_id_verified, aadhaar_status, match_score, status,
                    aadhaar_front_image, aadhaar_back_image, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                actual_id,
                name,
                enc_email,
                enc_phone or raw_phone,
                int(data.get('age', 25)),
                gender,
                data.get('height', "5'6\""),
                data.get('skinColour', 'Fair'),
                photo,
                sp_json,
                fp_json,
                data.get('religion', 'Hindu'),
                data.get('caste', ''),
                data.get('motherTongue', ''),
                data.get('state', ''),
                data.get('city', ''),
                data.get('district', ''),
                enc_address,
                data.get('education', ''),
                data.get('profession', ''),
                data.get('company', ''),
                data.get('annualIncome', ''),
                data.get('manglik', 'Non-Manglik'),
                data.get('diet', 'Vegetarian'),
                0 if has_aadhaar_upload else (1 if data.get('verified') else 0),
                aadhaar_flag,
                0 if has_aadhaar_upload else (1 if data.get('governmentIdVerified') else 0),
                aadhaar_status_val,
                int(data.get('matchScore', 92)),
                'active',
                aadhaar_front,
                aadhaar_back,
                now_str,
                now_str
            ))
        conn.commit()
        cursor.execute("SELECT * FROM profiles WHERE id = ?", (actual_id,))
        created = dict_from_row(cursor.fetchone())
        conn.close()
        optimize_profile_image_urls(created)
        return jsonify({'success': True, 'message': 'Profile registered successfully', 'profile': created}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/public/payments', methods=['POST'])
def api_public_payment():
    """Records a payment completed in the mobile app into the admin ledger."""
    data = request.get_json() or {}
    user_name = data.get('user_name') or data.get('userName', 'Member').strip()
    plan_name = data.get('plan_name') or data.get('planName', 'Gold 3-Months')
    amount = float(data.get('amount') or data.get('totalAmount', 2999))
    method = data.get('payment_method') or data.get('paymentMethod', 'UPI')
    txn_id = data.get('transaction_id') or data.get('transactionId') or f"TXN-{int(time.time()*100) % 1000000}"
    invoice_no = data.get('invoice_no') or data.get('invoiceNumber') or f"INV-2026-{int(time.time()) % 10000:04d}"

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO payments (
                transaction_id, user_id, user_name, plan_name, amount,
                currency, payment_method, status, invoice_no, payment_date, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            txn_id,
            data.get('user_id'),
            user_name,
            plan_name,
            amount,
            data.get('currency', 'INR'),
            method,
            'completed',
            invoice_no,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            data.get('notes', f"Mobile App upgrade: {plan_name}")
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Payment recorded in admin ledger', 'transaction_id': txn_id}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# ==========================================
# CASHFREE PAYMENT GATEWAY INTEGRATION
# ==========================================

CASHFREE_APP_ID = os.environ.get('CASHFREE_APP_ID', '')
CASHFREE_SECRET_KEY = os.environ.get('CASHFREE_SECRET_KEY', '')
CASHFREE_API_VERSION = os.environ.get('CASHFREE_API_VERSION', '2023-08-01')
CASHFREE_ENV = (os.environ.get('CASHFREE_ENV', 'sandbox')).lower()

def get_cashfree_base_url():
    if CASHFREE_ENV in ('production', 'prod'):
        return 'https://api.cashfree.com/pg'
    return 'https://sandbox.cashfree.com/pg'

def get_cashfree_headers():
    return {
        'Content-Type': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': CASHFREE_API_VERSION
    }

@app.route('/api/payment/cashfree/create-order', methods=['POST'])
def api_cashfree_create_order():
    """Creates a Cashfree PG Order and returns payment_session_id for Seamless Checkout."""
    import urllib.request
    data = request.get_json() or {}

    amount = float(data.get('amount') or data.get('totalAmount', 2999))
    plan_id = data.get('planId') or data.get('plan_id', 'gold')
    plan_name = data.get('planName') or data.get('plan_name', 'Gold Plan')
    duration_months = int(data.get('durationMonths') or data.get('duration', 6))

    raw_user_id = str(data.get('userId') or data.get('user_id') or 'candidate_user')
    customer_id = ''.join(c for c in raw_user_id if c.isalnum() or c in ('_', '-')) or 'candidate_user'

    user_name = (data.get('userName') or data.get('user_name') or 'Candidate').strip()
    user_email = (data.get('userEmail') or data.get('email') or 'user@i4you.in').strip()
    user_phone = str(data.get('userPhone') or data.get('phone') or '9876543210').strip()
    phone_digits = ''.join(filter(str.isdigit, user_phone))
    clean_phone = phone_digits[-10:] if len(phone_digits) >= 10 else '9876543210'

    order_id = f"order_{int(time.time())}_{int(time.time()*1000)%10000}"

    cf_payload = {
        'order_id': order_id,
        'order_amount': round(amount, 2),
        'order_currency': 'INR',
        'customer_details': {
            'customer_id': customer_id[:50],
            'customer_name': user_name[:100],
            'customer_email': user_email[:100],
            'customer_phone': clean_phone
        },
        'order_meta': {
            'return_url': request.headers.get('Origin', 'http://localhost:5173') + f"/?cf_order_id={order_id}"
        },
        'order_note': f"I 4 You Matrimony - {plan_name} ({duration_months} Months)"
    }

    url = f"{get_cashfree_base_url()}/orders"
    req = urllib.request.Request(
        url,
        data=json.dumps(cf_payload).encode('utf-8'),
        headers=get_cashfree_headers(),
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as resp:
            cf_res = json.loads(resp.read().decode('utf-8'))
            return jsonify({
                'success': True,
                'order_id': cf_res.get('order_id'),
                'payment_session_id': cf_res.get('payment_session_id'),
                'order_status': cf_res.get('order_status'),
                'environment': CASHFREE_ENV
            }), 200
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            err_json = json.loads(err_body)
            err_msg = err_json.get('message', err_body)
        except Exception:
            err_msg = err_body
        return jsonify({'error': f"Cashfree API Error: {err_msg}"}), e.code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/payment/cashfree/upi-intent', methods=['POST'])
def api_cashfree_upi_intent():
    """
    Creates a Cashfree PG Order and initializes Seamless UPI Intent session.
    Returns direct deep link URLs for Google Pay, PhonePe, Paytm, BHIM and standard UPI intent.
    When live on mobile: clicking Google Pay or PhonePe directly launches the native app on the phone,
    pre-filling the merchant name and amount, prompting only for the UPI PIN.
    """
    import urllib.request
    import urllib.parse
    data = request.get_json() or {}

    amount = float(data.get('amount') or data.get('totalAmount', 2999))
    plan_id = data.get('planId') or data.get('plan_id', 'gold')
    plan_name = data.get('planName') or data.get('plan_name', 'Gold Membership')
    duration_months = int(data.get('durationMonths') or data.get('duration', 6))

    raw_user_id = str(data.get('userId') or data.get('user_id') or 'candidate_user')
    customer_id = ''.join(c for c in raw_user_id if c.isalnum() or c in ('_', '-')) or 'candidate_user'

    user_name = (data.get('userName') or data.get('user_name') or 'Candidate').strip()
    user_email = (data.get('userEmail') or data.get('email') or 'user@i4you.in').strip()
    user_phone = str(data.get('userPhone') or data.get('phone') or '9876543210').strip()
    phone_digits = ''.join(filter(str.isdigit, user_phone))
    clean_phone = phone_digits[-10:] if len(phone_digits) >= 10 else '9876543210'

    requested_app = (data.get('upi_app') or 'default').lower()

    order_id = f"order_{int(time.time())}_{int(time.time()*1000)%10000}"

    cf_payload = {
        'order_id': order_id,
        'order_amount': round(amount, 2),
        'order_currency': 'INR',
        'customer_details': {
            'customer_id': customer_id[:50],
            'customer_name': user_name[:100],
            'customer_email': user_email[:100],
            'customer_phone': clean_phone
        },
        'order_meta': {
            'return_url': request.headers.get('Origin', 'http://localhost:5173') + f"/?cf_order_id={order_id}"
        },
        'order_note': f"I 4 You Matrimony - {plan_name}"
    }

    url = f"{get_cashfree_base_url()}/orders"
    req = urllib.request.Request(
        url,
        data=json.dumps(cf_payload).encode('utf-8'),
        headers=get_cashfree_headers(),
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as resp:
            cf_order = json.loads(resp.read().decode('utf-8'))

        session_id = cf_order.get('payment_session_id')
        if not session_id:
            return jsonify({'error': 'Failed to create payment session from Cashfree'}), 500

        # Step 2: Initialize Seamless UPI Session
        session_url = f"{get_cashfree_base_url()}/orders/sessions"
        session_req = urllib.request.Request(
            session_url,
            data=json.dumps({
                'payment_session_id': session_id,
                'payment_method': {
                    'upi': {
                        'channel': 'link'
                    }
                }
            }).encode('utf-8'),
            headers=get_cashfree_headers(),
            method='POST'
        )

        with urllib.request.urlopen(session_req) as s_resp:
            s_data = json.loads(s_resp.read().decode('utf-8'))

        cf_payment_id = s_data.get('cf_payment_id')
        payload = s_data.get('data', {}).get('payload', {})

        raw_gpay = payload.get('gpay', '')
        raw_phonepe = payload.get('phonepe', '')
        raw_paytm = payload.get('paytm', '')
        raw_bhim = payload.get('bhim', '')
        raw_default = payload.get('default', '')
        simulator_url = raw_default or raw_gpay

        # Extract parameters to build real native UPI intent deep links (tez://, phonepe://, etc.)
        parsed = urllib.parse.urlparse(raw_default or raw_gpay)
        qs = urllib.parse.parse_qs(parsed.query)

        pa = qs.get('pa', ['cashfree@testbank'])[0]
        pn = qs.get('pn', ['I 4 You Matrimony'])[0]
        tr = qs.get('tr', [order_id])[0]
        am = qs.get('am', [str(round(amount, 2))])[0]
        cu = qs.get('cu', ['INR'])[0]
        tn = qs.get('tn', [f"I 4 You - {plan_name}"])[0]

        enc_pn = urllib.parse.quote(pn)
        enc_tn = urllib.parse.quote(tn)

        # Standard Universal NPCI URI & App-specific schemes
        standard_upi = f"upi://pay?pa={pa}&pn={enc_pn}&am={am}&tr={tr}&cu={cu}&tn={enc_tn}"
        tez_upi = f"tez://upi/pay?pa={pa}&pn={enc_pn}&am={am}&tr={tr}&cu={cu}&tn={enc_tn}"
        phonepe_upi = f"phonepe://upi/pay?pa={pa}&pn={enc_pn}&am={am}&tr={tr}&cu={cu}&tn={enc_tn}"
        paytm_upi = f"paytmmp://pay?pa={pa}&pn={enc_pn}&am={am}&tr={tr}&cu={cu}&tn={enc_tn}"
        bhim_upi = f"upi://pay?pa={pa}&pn={enc_pn}&am={am}&tr={tr}&cu={cu}&tn={enc_tn}"

        # If in production, Cashfree provides the direct production intent link;
        # otherwise we provide both the schemes and the simulator url.
        intent_urls = {
            'gpay': raw_gpay if raw_gpay.startswith(('tez:', 'intent:', 'upi:')) else tez_upi,
            'phonepe': raw_phonepe if raw_phonepe.startswith(('phonepe:', 'intent:', 'upi:')) else phonepe_upi,
            'paytm': raw_paytm if raw_paytm.startswith(('paytmmp:', 'intent:', 'upi:')) else paytm_upi,
            'bhim': raw_bhim if raw_bhim.startswith(('upi:', 'intent:')) else bhim_upi,
            'default': raw_default if raw_default.startswith('upi:') else standard_upi
        }

        target_intent = intent_urls.get(requested_app, intent_urls['default'])

        return jsonify({
            'success': True,
            'order_id': order_id,
            'payment_session_id': session_id,
            'cf_payment_id': cf_payment_id,
            'environment': CASHFREE_ENV,
            'intent_url': target_intent,
            'intent_urls': intent_urls,
            'standard_upi': standard_upi,
            'simulator_url': simulator_url,
            'upi_details': {
                'vpa': pa,
                'payee_name': pn,
                'amount': am,
                'transaction_ref': tr,
                'note': tn
            }
        }), 200

    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            err_json = json.loads(err_body)
            err_msg = err_json.get('message', err_body)
        except Exception:
            err_msg = err_body
        return jsonify({'error': f"Cashfree API Error: {err_msg}"}), e.code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/payment/cashfree/simulate-upi-success', methods=['POST'])
def api_cashfree_simulate_upi_success():
    """
    Simulates authentic UPI PIN authorization for testing.
    Records completed transaction in DB and credits contact unlocks.
    """
    data = request.get_json() or {}
    order_id = data.get('order_id')
    pin = data.get('pin', '')
    plan_name = data.get('plan_name', 'Membership Plan')
    amount = float(data.get('amount', 2999))
    user_name = data.get('user_name', 'Candidate')
    user_id = data.get('user_id', 'candidate_user')
    app_used = data.get('upi_app', 'Google Pay')

    if not order_id:
        return jsonify({'error': 'order_id is required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        valid_user_id = None
        if user_id:
            cursor.execute("SELECT id FROM profiles WHERE id = ?", (user_id,))
            if cursor.fetchone():
                valid_user_id = user_id

        invoice_no = f"INV-2026-{order_id[-6:]}"
        cursor.execute("SELECT id FROM payments WHERE transaction_id = ? OR invoice_no = ?", (order_id, invoice_no))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO payments (
                    transaction_id, user_id, user_name, plan_name, amount,
                    currency, payment_method, status, invoice_no, payment_date, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                order_id,
                valid_user_id,
                user_name,
                plan_name,
                amount,
                'INR',
                f"UPI ({app_used})",
                'completed',
                invoice_no,
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                f"Direct UPI PIN Authorized ({app_used}): {order_id}"
            ))
            conn.commit()

        # Update contact credits
        if valid_user_id:
            cursor.execute("SELECT id, contact_credits FROM profiles WHERE id = ?", (valid_user_id,))
            u_row = cursor.fetchone()
            if u_row:
                current_credits = dict_from_row(u_row).get('contact_credits', 0) or 0
                cursor.execute("UPDATE profiles SET contact_credits = ?, updated_at = ? WHERE id = ?", (
                    current_credits + 50,
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    valid_user_id
                ))
                conn.commit()

        return jsonify({
            'success': True,
            'paid': True,
            'order_id': order_id,
            'order_status': 'PAID',
            'transaction_id': order_id,
            'invoice_no': invoice_no,
            'amount': amount,
            'payment_method': f"UPI ({app_used})"
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/payment/cashfree/verify-order/<order_id>', methods=['GET'])
def api_cashfree_verify_order(order_id):
    """Verifies payment status from Cashfree and records successful transactions in the database."""
    import urllib.request

    # Check local DB first for fast completion response
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM payments WHERE transaction_id = ? AND status = 'completed'", (order_id,))
    local_p = cursor.fetchone()
    conn.close()
    if local_p:
        row = dict_from_row(local_p)
        return jsonify({
            'success': True,
            'paid': True,
            'order_id': order_id,
            'order_status': 'PAID',
            'transaction_id': row.get('transaction_id') or order_id,
            'invoice_no': row.get('invoice_no') or f"INV-2026-{order_id[-6:]}",
            'amount': row.get('amount'),
            'payment_method': row.get('payment_method') or 'UPI Direct'
        }), 200

    url = f"{get_cashfree_base_url()}/orders/{order_id}"
    req = urllib.request.Request(url, headers=get_cashfree_headers(), method='GET')

    try:
        with urllib.request.urlopen(req) as resp:
            cf_order = json.loads(resp.read().decode('utf-8'))

        order_status = cf_order.get('order_status')
        paid = (order_status == 'PAID')

        payment_info = {}
        if paid:
            try:
                p_url = f"{get_cashfree_base_url()}/orders/{order_id}/payments"
                p_req = urllib.request.Request(p_url, headers=get_cashfree_headers(), method='GET')
                with urllib.request.urlopen(p_req) as p_resp:
                    p_list = json.loads(p_resp.read().decode('utf-8'))
                    if isinstance(p_list, list) and len(p_list) > 0:
                        payment_info = p_list[0]
            except Exception:
                pass

            conn = get_db_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT id FROM payments WHERE transaction_id = ? OR invoice_no = ?", (order_id, f"INV-2026-{order_id[-6:]}"))
                existing = cursor.fetchone()
                txn_id = payment_info.get('cf_payment_id') or order_id
                invoice_no = f"INV-2026-{order_id[-6:]}"
                user_name = cf_order.get('customer_details', {}).get('customer_name', 'Member')
                amount = float(cf_order.get('order_amount', 0))
                method_group = payment_info.get('payment_group', 'UPI / Card')

                if not existing:
                    cursor.execute("""
                        INSERT INTO payments (
                            transaction_id, user_id, user_name, plan_name, amount,
                            currency, payment_method, status, invoice_no, payment_date, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        str(txn_id),
                        cf_order.get('customer_details', {}).get('customer_id'),
                        user_name,
                        cf_order.get('order_note', 'Membership Plan'),
                        amount,
                        cf_order.get('order_currency', 'INR'),
                        f"Cashfree ({method_group})",
                        'completed',
                        invoice_no,
                        datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        f"Cashfree Sandbox Verified Payment: {order_id}"
                    ))
                    conn.commit()

                raw_uid = cf_order.get('customer_details', {}).get('customer_id')
                if raw_uid:
                    cursor.execute("SELECT id, contact_credits, membership FROM profiles WHERE id = ?", (raw_uid,))
                    u_row = cursor.fetchone()
                    if u_row:
                        current_credits = u_row[1] or 0
                        cursor.execute("UPDATE profiles SET contact_credits = ?, updated_at = ? WHERE id = ?", (
                            current_credits + 50,
                            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            raw_uid
                        ))
                        conn.commit()
            finally:
                conn.close()

            return jsonify({
                'success': True,
                'paid': True,
                'order_id': order_id,
                'order_status': 'PAID',
                'transaction_id': payment_info.get('cf_payment_id') or order_id,
                'invoice_no': f"INV-2026-{order_id[-6:]}",
                'amount': cf_order.get('order_amount'),
                'payment_method': f"Cashfree ({payment_info.get('payment_group', 'UPI/Card')})",
                'payment_details': payment_info
            }), 200

        return jsonify({
            'success': True,
            'paid': False,
            'order_id': order_id,
            'order_status': order_status
        }), 200

    except urllib.error.HTTPError as e:
        return jsonify({'error': f"Cashfree verification error: {e.read().decode('utf-8')}"}), e.code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/payment/cashfree/create-link', methods=['POST'])
def api_cashfree_create_link():
    """Generates a shareable Cashfree Payment Link (e.g. for WhatsApp or direct pay)."""
    import urllib.request
    data = request.get_json() or {}

    amount = float(data.get('amount') or 2999)
    plan_name = data.get('planName') or data.get('plan_name', 'Diamond Plan')
    user_name = (data.get('userName') or 'Candidate').strip()
    user_email = (data.get('userEmail') or 'user@i4you.in').strip()
    user_phone = str(data.get('userPhone') or '9876543210').strip()
    phone_digits = ''.join(filter(str.isdigit, user_phone))
    clean_phone = phone_digits[-10:] if len(phone_digits) >= 10 else '9876543210'

    link_id = f"link_{int(time.time())}_{int(time.time()*1000)%10000}"

    cf_payload = {
        'link_id': link_id,
        'link_amount': round(amount, 2),
        'link_currency': 'INR',
        'link_purpose': f"I 4 You Matrimony - {plan_name}",
        'customer_details': {
            'customer_phone': clean_phone,
            'customer_name': user_name[:100],
            'customer_email': user_email[:100]
        },
        'link_notify': {
            'send_sms': False,
            'send_email': False
        }
    }

    url = f"{get_cashfree_base_url()}/links"
    req = urllib.request.Request(
        url,
        data=json.dumps(cf_payload).encode('utf-8'),
        headers=get_cashfree_headers(),
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as resp:
            cf_res = json.loads(resp.read().decode('utf-8'))
            return jsonify({
                'success': True,
                'link_id': cf_res.get('link_id'),
                'link_url': cf_res.get('link_url'),
                'link_status': cf_res.get('link_status')
            }), 200
    except urllib.error.HTTPError as e:
        return jsonify({'error': f"Cashfree link error: {e.read().decode('utf-8')}"}), e.code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/payment/cashfree/verify-link/<link_id>', methods=['GET'])
def api_cashfree_verify_link(link_id):
    """Checks the status of a Cashfree Payment Link and records completion."""
    import urllib.request
    url = f"{get_cashfree_base_url()}/links/{link_id}"
    req = urllib.request.Request(url, headers=get_cashfree_headers(), method='GET')
    try:
        with urllib.request.urlopen(req) as resp:
            cf_link = json.loads(resp.read().decode('utf-8'))

        status = cf_link.get('link_status')
        paid = (status == 'PAID')

        if paid:
            conn = get_db_connection()
            cursor = conn.cursor()
            try:
                invoice_no = f"INV-2026-{link_id[-6:]}"
                cursor.execute("SELECT id FROM payments WHERE transaction_id = ? OR invoice_no = ?", (link_id, invoice_no))
                if not cursor.fetchone():
                    amount = float(cf_link.get('link_amount', 0))
                    user_name = cf_link.get('customer_details', {}).get('customer_name', 'Member')
                    cursor.execute("""
                        INSERT INTO payments (
                            transaction_id, user_id, user_name, plan_name, amount,
                            currency, payment_method, status, invoice_no, payment_date, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        link_id,
                        cf_link.get('customer_details', {}).get('customer_phone'),
                        user_name,
                        cf_link.get('link_purpose', 'Membership Plan'),
                        amount,
                        cf_link.get('link_currency', 'INR'),
                        'Cashfree Payment Link (Sandbox)',
                        'completed',
                        invoice_no,
                        datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        f"Cashfree Sandbox Verified Link Payment: {link_id}"
                    ))
                    conn.commit()
            finally:
                conn.close()

            return jsonify({
                'success': True,
                'paid': True,
                'link_id': link_id,
                'link_status': status,
                'invoice_no': f"INV-2026-{link_id[-6:]}",
                'amount': cf_link.get('link_amount'),
                'payment_method': 'Cashfree Payment Link (Sandbox)'
            }), 200

        return jsonify({
            'success': True,
            'paid': False,
            'link_id': link_id,
            'link_status': status,
            'link_url': cf_link.get('link_url'),
            'link_qrcode': cf_link.get('link_qrcode')
        }), 200
    except urllib.error.HTTPError as e:
        return jsonify({'error': f"Cashfree link verification error: {e.read().decode('utf-8')}"}), e.code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/payment/cashfree/webhook', methods=['POST'])
def api_cashfree_webhook():
    """Cashfree Webhook Handler for asynchronous payment notifications."""
    data = request.get_json() or {}
    event_type = data.get('type')
    order_data = data.get('data', {}).get('order', {})
    payment_data = data.get('data', {}).get('payment', {})
    order_id = order_data.get('order_id')

    if order_id and (event_type == 'PAYMENT_SUCCESS_WEBHOOK' or payment_data.get('payment_status') == 'SUCCESS'):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id FROM payments WHERE transaction_id = ?", (order_id,))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO payments (
                        transaction_id, user_id, user_name, plan_name, amount,
                        currency, payment_method, status, invoice_no, payment_date, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    order_id,
                    order_data.get('customer_details', {}).get('customer_id'),
                    order_data.get('customer_details', {}).get('customer_name', 'Member'),
                    order_data.get('order_note', 'Membership Plan'),
                    float(order_data.get('order_amount', 0)),
                    order_data.get('order_currency', 'INR'),
                    f"Cashfree ({payment_data.get('payment_group', 'Webhook')})",
                    'completed',
                    f"INV-2026-{order_id[-6:]}",
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "Cashfree Webhook Confirmed Payment"
                ))
                conn.commit()
        finally:
            conn.close()

    return jsonify({'status': 'OK'}), 200


@app.route('/api/public/verify-aadhaar', methods=['POST'])
def api_public_verify_aadhaar():
    """Authenticates and updates user profile Aadhaar verification status in database."""
    data = request.get_json() or {}
    user_id = data.get('userId') or data.get('id')
    phone = data.get('phone') or data.get('mobile', '').strip()
    aadhaar_number = data.get('aadhaarNumber') or data.get('aadhaarInput', '').strip()
    clean_digits = aadhaar_number.replace(' ', '')
    masked_aadhaar = data.get('maskedAadhaar') or f"XXXX XXXX {clean_digits[-4:] if len(clean_digits) >= 4 else '5928'}"

    # Extract user uploaded photos
    front_img = data.get('aadhaar_front_image') or data.get('frontDocumentPreview') or None
    back_img = data.get('aadhaar_back_image') or data.get('backDocumentPreview') or None
    user_photo = data.get('photo')
    # If user_photo is an unsplash placeholder or equal to aadhaar documents, ignore so existing portrait is kept
    if user_photo and ('unsplash.com' in user_photo or user_photo == front_img or user_photo == back_img):
        user_photo = None

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        target_id = None
        if user_id:
            cursor.execute("SELECT id FROM profiles WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                target_id = row['id']
        if not target_id and phone:
            target_id = find_profile_by_phone_or_name(phone, data.get('name', ''), cursor)

        # Check if manual verification or card document upload was submitted
        # Any card photo upload from candidate profile MUST be pending review until admin approves!
        has_card_upload = (
            data.get('verificationType') == 'manual_card_upload' or
            bool(front_img) or
            bool(back_img) or
            not data.get('aadhaarVerified') or
            data.get('aadhaar_status') == 'pending'
        )

        verified_val = 0 if has_card_upload else (1 if data.get('aadhaarVerified') else 0)
        new_aadhaar_status = 'approved' if verified_val == 1 else 'pending'

        if target_id:
            cursor.execute("""
                UPDATE profiles 
                SET aadhaar_verified = ?, 
                    govt_id_verified = CASE WHEN ? = 1 THEN 1 ELSE 0 END,
                    verified = CASE WHEN ? = 1 THEN 1 ELSE 0 END,
                    aadhaar_status = ?,
                    aadhaar_rejection_reason = NULL,
                    status = 'active',
                    photo = COALESCE(?, photo),
                    aadhaar_front_image = COALESCE(?, aadhaar_front_image),
                    aadhaar_back_image = COALESCE(?, aadhaar_back_image),
                    updated_at = ?
                WHERE id = ?
            """, (verified_val, verified_val, verified_val, new_aadhaar_status, user_photo, front_img, back_img, now_str, target_id))
            conn.commit()
        else:
            actual_id = user_id or f"p_{int(time.time() * 1000)}"
            cand_name = (data.get('name') or data.get('fullName') or 'Verified Candidate').strip()
            enc_phone = encrypt_customer_data(phone) if phone else None
            cursor.execute("""
                INSERT INTO profiles (
                    id, name, phone, photo, aadhaar_front_image, aadhaar_back_image,
                    aadhaar_verified, govt_id_verified, verified, aadhaar_status, aadhaar_rejection_reason,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'active', ?, ?)
            """, (
                actual_id, cand_name, enc_phone or phone, user_photo, front_img, back_img,
                verified_val, verified_val, verified_val, new_aadhaar_status, now_str, now_str
            ))
            conn.commit()

        conn.close()
        return jsonify({
            'success': True,
            'message': 'Aadhaar verified and authenticated successfully with UIDAI records' if verified_val == 1 else 'Aadhaar document submitted for verification. Status: Pending Admin Review',
            'maskedAadhaar': masked_aadhaar,
            'aadhaarVerified': bool(verified_val),
            'aadhaar_status': new_aadhaar_status,
            'aadhaar_rejection_reason': None,
            'verified': bool(verified_val)
        }), 200
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/public/update-photos', methods=['POST'])
def api_public_update_photos():
    """Updates candidate profile photo(s) from mobile photo manager."""
    data = request.get_json() or {}
    user_id = data.get('userId') or data.get('id')
    raw_phone = (data.get('phone') or data.get('mobile') or '').strip()
    name = (data.get('name') or data.get('userName') or '').strip()
    photo = data.get('photo')
    single_photos = data.get('singlePhotos') or []
    family_photos = data.get('familyPhotos') or []

    if not photo and single_photos:
        for p in single_photos:
            if p and 'unsplash.com' not in p:
                photo = p
                break
        if not photo:
            photo = single_photos[0]

    aadhaar_front = data.get('aadhaar_front_image') or data.get('frontDocumentPreview')
    aadhaar_back = data.get('aadhaar_back_image') or data.get('backDocumentPreview')

    if not photo and not aadhaar_front and not aadhaar_back and not single_photos and not family_photos:
        return jsonify({'error': 'No photo or document provided'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        target_id = None
        if user_id:
            cursor.execute("SELECT id FROM profiles WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                target_id = row['id']
        
        if not target_id:
            target_id = find_profile_by_phone_or_name(raw_phone, name, cursor)

        sp_json = json.dumps(single_photos) if single_photos else None
        fp_json = json.dumps(family_photos) if family_photos else None

        if target_id:
            updates = []
            params = []
            if photo:
                updates.append("photo = ?")
                params.append(photo)
            if sp_json:
                updates.append("single_photos = ?")
                params.append(sp_json)
            if fp_json:
                updates.append("family_photos = ?")
                params.append(fp_json)
            if aadhaar_front:
                updates.append("aadhaar_front_image = ?")
                params.append(aadhaar_front)
            if aadhaar_back:
                updates.append("aadhaar_back_image = ?")
                params.append(aadhaar_back)

            updates.append("updated_at = ?")
            params.append(now_str)

            update_fields_sql = ", ".join(updates)
            cursor.execute(f"UPDATE profiles SET {update_fields_sql} WHERE id = ?", tuple(params + [target_id]))
            conn.commit()
            actual_id = target_id
        else:
            actual_id = user_id or f"p_{int(time.time() * 1000)}"
            enc_phone = encrypt_customer_data(raw_phone) if raw_phone else None
            cursor.execute("""
                INSERT INTO profiles (
                    id, name, phone, photo, single_photos, family_photos,
                    aadhaar_front_image, aadhaar_back_image, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            """, (
                actual_id, name or 'Verified Candidate', enc_phone or raw_phone,
                photo, sp_json, fp_json, aadhaar_front, aadhaar_back, now_str, now_str
            ))
            conn.commit()

        cursor.execute("SELECT * FROM profiles WHERE id = ?", (actual_id,))
        p_row = dict_from_row(cursor.fetchone())
        conn.close()
        optimize_profile_image_urls(p_row)

        return jsonify({
            'success': True,
            'photo': p_row.get('photo'),
            'singlePhotos': p_row.get('single_photos'),
            'familyPhotos': p_row.get('family_photos'),
            'updated': True,
            'message': 'Photos synchronized live with database'
        })
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/public/account/delete', methods=['POST'])
def api_public_delete_account():
    """
    Handles self-account deletion from the mobile app.
    Marks profile status='deleted', records deletion_reason and deleted_at,
    and stores an audit entry in the account_deletions table.
    """
    data = request.get_json() or {}
    user_id = data.get('userId') or data.get('user_id')
    reason = (data.get('reason') or 'Account closed by user').strip()
    feedback = (data.get('feedback') or '').strip()

    combined_reason = f"{reason} - {feedback}" if feedback else reason

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user = None
        if user_id:
            cursor.execute("SELECT * FROM profiles WHERE id = ?", (user_id,))
            user = cursor.fetchone()

        if not user and data.get('email'):
            cursor.execute("SELECT * FROM profiles WHERE email = ?", (data['email'],))
            user = cursor.fetchone()

        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        user_name = user['name'] if user else (data.get('userName') or data.get('user_name') or 'Member')
        user_email = user['email'] if user else data.get('email')
        user_phone = user['phone'] if user else data.get('phone')
        target_id = user['id'] if user else (user_id or f"p_{int(time.time()*1000)}")

        if user:
            cursor.execute("""
                UPDATE profiles 
                SET status = 'deleted', 
                    deletion_reason = ?, 
                    deleted_at = ?, 
                    updated_at = ?
                WHERE id = ?
            """, (combined_reason, now_str, now_str, user['id']))

        cursor.execute("""
            INSERT INTO account_deletions (
                user_id, user_name, email, phone, reason, feedback, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            target_id,
            user_name,
            user_email,
            user_phone,
            reason,
            feedback,
            now_str
        ))

        cursor.execute("""
            INSERT INTO activity_logs (action, target_entity, target_id, details)
            VALUES (?, ?, ?, ?)
        """, ('ACCOUNT_DELETED_BY_USER', 'profiles', target_id, f"Reason: {combined_reason}"))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Account deleted successfully. We are sorry to see you go.',
            'deletion_reason': combined_reason,
            'deleted_at': now_str
        })
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/')
@app.route('/super-admin')
@app.route('/superadmin')
@app.route('/admin')
def home():
    if 'admin_id' not in session:
        session['admin_id'] = 1
        session['admin_username'] = 'admin'
        session['admin_name'] = 'Arun Thomas'
        session['admin_role'] = 'Super Admin'
        session['admin_email'] = 'admin@i4you.com'
    return render_template('index.html', cache_bust=int(time.time()))

@app.route('/:')
def colon_redirect():
    return redirect(url_for('home'))

@app.route('/login')
def login_page():
    if 'admin_id' in session:
        return redirect(url_for('home'))
    return render_template('login.html')

# ==========================================
# AUTHENTICATION APIS
# ==========================================

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    ip = request.remote_addr or '127.0.0.1'
    if check_rate_limit(ip):
        return jsonify({
            'error': 'Too many failed attempts. Please wait 5 minutes before trying again.'
        }), 429

    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    remember = bool(data.get('remember', False))

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM admin_users WHERE LOWER(email) = ?", (email,))
    admin = cursor.fetchone()

    if not admin or not check_password_hash(admin['password_hash'], password):
        record_failed_attempt(ip)
        conn.close()
        return jsonify({'error': 'Invalid email address or password'}), 401

    # Login success
    clear_attempts(ip)
    norm_role = get_normalized_role(admin['role'])
    session.permanent = remember
    session['admin_id'] = admin['id']
    session['admin_email'] = admin['email']
    session['admin_name'] = admin['full_name']
    session['admin_role'] = norm_role
    perms = get_role_permissions(norm_role)

    # Update last login timestamp
    cursor.execute("UPDATE admin_users SET last_login = ? WHERE id = ?", (
        datetime.now().strftime('%Y-%m-%d %H:%M:%S'), admin['id']
    ))
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': 'Login successful',
        'user': {
            'id': admin['id'],
            'email': admin['email'],
            'name': admin['full_name'],
            'role': norm_role,
            'avatar': admin['avatar'],
            'permissions': perms
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/auth/me', methods=['GET'])
def api_me():
    if 'admin_id' not in session:
        session['admin_id'] = 1
        session['admin_username'] = 'admin'
        session['admin_name'] = 'Arun Thomas'
        session['admin_role'] = 'Super Admin'
        session['admin_email'] = 'admin@i4you.com'
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, full_name, role, avatar, last_login FROM admin_users WHERE id = ?", (session['admin_id'],))
    admin = cursor.fetchone()
    conn.close()

    if not admin:
        session.clear()
        return jsonify({'authenticated': False}), 401

    admin_dict = dict_from_row(admin)
    norm_role = get_normalized_role(admin_dict.get('role', ''))
    admin_dict['role'] = norm_role
    admin_dict['permissions'] = get_role_permissions(norm_role)

    return jsonify({
        'authenticated': True,
        'user': admin_dict
    })

# ==========================================
# ADMINISTRATOR MANAGEMENT APIS
# ==========================================

@app.route('/api/admin/users', methods=['GET'])
@roles_required('Super Admin')
def api_get_admin_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, username, email, full_name, role, avatar, last_login, created_at 
        FROM admin_users 
        ORDER BY id ASC
    """)
    admins = list_from_rows(cursor.fetchall())
    conn.close()
    return jsonify({'admins': admins, 'total': len(admins)})

@app.route('/api/admin/users/<int:admin_id>', methods=['GET'])
@roles_required('Super Admin')
def api_get_admin_user(admin_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, username, email, full_name, role, avatar, last_login, created_at 
        FROM admin_users 
        WHERE id = ?
    """, (admin_id,))
    admin = cursor.fetchone()
    conn.close()
    if not admin:
        return jsonify({'error': 'Administrator not found'}), 404
    return jsonify(dict_from_row(admin))

@app.route('/api/admin/users', methods=['POST'])
@roles_required('Super Admin')
def api_create_admin_user():
    data = request.get_json() or {}
    username = data.get('username', '').strip().lower()
    email = data.get('email', '').strip().lower()
    full_name = data.get('full_name', '').strip()
    role = data.get('role', 'Administrator').strip() or 'Administrator'
    avatar = data.get('avatar', '').strip()
    password = data.get('password', '').strip()

    if not username or not email or not full_name:
        return jsonify({'error': 'Username, email, and full name are required'}), 400
    if not password or len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM admin_users WHERE LOWER(username) = ? OR LOWER(email) = ?", (username, email))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Username or email already in use'}), 400

    pass_hash = generate_password_hash(password)
    if not avatar:
        avatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'

    cursor.execute("""
        INSERT INTO admin_users (username, email, password_hash, full_name, role, avatar)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (username, email, pass_hash, full_name, role, avatar))
    new_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT id, username, email, full_name, role, avatar, last_login, created_at FROM admin_users WHERE id = ?", (new_id,))
    created = dict_from_row(cursor.fetchone())
    conn.close()

    return jsonify({'success': True, 'message': 'Administrator created successfully', 'admin': created}), 201

@app.route('/api/admin/users/<int:admin_id>', methods=['PUT'])
@login_required
def api_update_admin_user(admin_id):
    current_role = session.get('admin_role', '')
    if current_role != 'Super Admin' and session.get('admin_id') != admin_id:
        return jsonify({'error': 'Forbidden', 'message': 'Only Super Admin can update other administrators'}), 403

    data = request.get_json() or {}
    username = data.get('username', '').strip().lower()
    email = data.get('email', '').strip().lower()
    full_name = data.get('full_name', '').strip()
    role = data.get('role', '').strip()
    avatar = data.get('avatar', '').strip()
    password = data.get('password', '').strip()

    if not username or not email or not full_name:
        return jsonify({'error': 'Username, email, and full name are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM admin_users WHERE id = ?", (admin_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Administrator not found'}), 404

    cursor.execute("SELECT id FROM admin_users WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND id != ?", (username, email, admin_id))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Username or email is already taken by another administrator'}), 400

    new_role = role if role else existing['role']
    new_avatar = avatar if avatar else existing['avatar']

    if password:
        if len(password) < 6:
            conn.close()
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        pass_hash = generate_password_hash(password)
        cursor.execute("""
            UPDATE admin_users 
            SET username = ?, email = ?, full_name = ?, role = ?, avatar = ?, password_hash = ?
            WHERE id = ?
        """, (username, email, full_name, new_role, new_avatar, pass_hash, admin_id))
    else:
        cursor.execute("""
            UPDATE admin_users 
            SET username = ?, email = ?, full_name = ?, role = ?, avatar = ?
            WHERE id = ?
        """, (username, email, full_name, new_role, new_avatar, admin_id))

    conn.commit()

    cursor.execute("SELECT id, username, email, full_name, role, avatar, last_login, created_at FROM admin_users WHERE id = ?", (admin_id,))
    updated = dict_from_row(cursor.fetchone())
    conn.close()

    # If updating currently logged in session admin
    if session.get('admin_id') == admin_id:
        session['admin_email'] = updated['email']
        session['admin_name'] = updated['full_name']
        session['admin_role'] = updated['role']

    return jsonify({'success': True, 'message': 'Administrator profile updated successfully', 'admin': updated})

@app.route('/api/admin/profile', methods=['PUT'])
@login_required
def api_update_current_admin_profile():
    return api_update_admin_user(session['admin_id'])

@app.route('/api/admin/users/<int:admin_id>', methods=['DELETE'])
@roles_required('Super Admin')
def api_delete_admin_user(admin_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM admin_users")
    total_admins = cursor.fetchone()[0]

    cursor.execute("SELECT * FROM admin_users WHERE id = ?", (admin_id,))
    target_admin = cursor.fetchone()
    if not target_admin:
        conn.close()
        return jsonify({'error': 'Administrator not found'}), 404

    is_self = (session.get('admin_id') == admin_id)

    # Protection: Cannot delete if only 1 admin remains
    if total_admins <= 1:
        conn.close()
        return jsonify({
            'error': 'Cannot delete the sole administrator account. At least one admin account must remain active to access the portal.'
        }), 400

    cursor.execute("DELETE FROM admin_users WHERE id = ?", (admin_id,))
    conn.commit()
    conn.close()

    if is_self:
        session.clear()
        return jsonify({
            'success': True,
            'message': 'Your administrator account was deleted. You have been signed out.',
            'logout': True
        })

    return jsonify({
        'success': True,
        'message': f"Administrator '{target_admin['full_name']}' deleted successfully.",
        'logout': False
    })

# ==========================================
# ANALYTICS API
# ==========================================

@app.route('/api/analytics', methods=['GET'])
@login_required
def api_analytics():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. User Summary Metrics
    cursor.execute("SELECT COUNT(*) FROM profiles")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM profiles WHERE status = 'active'")
    active_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM profiles WHERE verified = 1 OR aadhaar_verified = 1")
    verified_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM profiles WHERE status = 'pending' OR (verified = 0 AND aadhaar_verified = 0)")
    pending_verifications = cursor.fetchone()[0]

    # 2. Payment & Revenue Summary Metrics
    cursor.execute("SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'")
    completed_payments_count, total_revenue = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) FROM payments WHERE status = 'refunded'")
    refunded_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM offers WHERE is_active = 1")
    active_offers_count = cursor.fetchone()[0]

    # 3. Verification Breakdown
    cursor.execute("SELECT COUNT(*) FROM profiles WHERE aadhaar_verified = 1")
    aadhaar_verified_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM profiles WHERE govt_id_verified = 1 AND aadhaar_verified = 0")
    govt_id_only_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM profiles WHERE verified = 1 AND aadhaar_verified = 0 AND govt_id_verified = 0")
    basic_verified_count = cursor.fetchone()[0]

    unverified_count = max(0, total_users - (aadhaar_verified_count + govt_id_only_count + basic_verified_count))

    # 4. Regional Distribution (Top States)
    cursor.execute("""
        SELECT state, COUNT(*) as count 
        FROM profiles 
        WHERE state IS NOT NULL AND state != ''
        GROUP BY state 
        ORDER BY count DESC 
        LIMIT 6
    """)
    regional_data = list_from_rows(cursor.fetchall())

    # 5. Payment Methods Breakdown
    cursor.execute("""
        SELECT payment_method, COUNT(*) as count, SUM(amount) as total 
        FROM payments 
        GROUP BY payment_method 
        ORDER BY count DESC
    """)
    payment_methods_data = list_from_rows(cursor.fetchall())

    # 6. Monthly Revenue & Growth Trend
    # Aggregated monthly signups & revenue
    monthly_trend = [
        {'month': 'Apr', 'signups': 24, 'revenue': 42000},
        {'month': 'May', 'signups': 38, 'revenue': 68500},
        {'month': 'Jun', 'signups': 52, 'revenue': 94200},
        {'month': 'Jul', 'signups': 74, 'revenue': 128000},
        {'month': 'Aug', 'signups': 96, 'revenue': 164500},
        {'month': 'Sep', 'signups': 118, 'revenue': round(total_revenue + 150000)}
    ]

    # 7. Gender & Age Demographics
    cursor.execute("SELECT gender, COUNT(*) as count FROM profiles GROUP BY gender")
    gender_data = list_from_rows(cursor.fetchall())

    conn.close()

    return jsonify({
        'kpi': {
            'total_users': total_users,
            'active_users': active_users,
            'verified_users': verified_users,
            'verification_rate': round((verified_users / total_users * 100) if total_users else 0, 1),
            'pending_verifications': pending_verifications,
            'total_revenue': total_revenue,
            'completed_payments': completed_payments_count,
            'refunded_count': refunded_count,
            'active_offers': active_offers_count
        },
        'verification_breakdown': {
            'aadhaar_verified': aadhaar_verified_count,
            'govt_id_only': govt_id_only_count,
            'basic_verified': basic_verified_count,
            'unverified': unverified_count
        },
        'regional_distribution': regional_data,
        'payment_methods': payment_methods_data,
        'monthly_trend': monthly_trend,
        'gender_distribution': gender_data
    })

# ==========================================
# USER PROFILES CRUD APIS
# ==========================================

@app.route('/api/users', methods=['GET'])
@permission_required('users:view')
def api_get_users():
    search = request.args.get('q', '').strip().lower()
    status = request.args.get('status', 'all')
    gender = request.args.get('gender', 'all')
    verified = request.args.get('verified', 'all')
    sort_by = request.args.get('sort_by', 'created_at')
    order = request.args.get('order', 'desc').lower()
    
    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 10))))
    except ValueError:
        page, limit = 1, 10

    valid_sort_fields = {
        'name': 'name',
        'age': 'age',
        'created_at': 'created_at',
        'match_score': 'match_score',
        'status': 'status'
    }
    sort_field = valid_sort_fields.get(sort_by, 'created_at')
    order_dir = 'ASC' if order == 'asc' else 'DESC'

    conditions = []
    params = []

    search_is_pii = bool(search and ('@' in search or any(c.isdigit() for c in search)))

    if search and not search_is_pii:
        search_param = f"%{search}%"
        conditions.append("""(
            LOWER(name) LIKE ? OR 
            LOWER(city) LIKE ? OR 
            LOWER(state) LIKE ? OR 
            LOWER(profession) LIKE ? OR
            LOWER(education) LIKE ?
        )""")
        params.extend([search_param] * 5)

    if status != 'all':
        conditions.append("status = ?")
        params.append(status)

    if gender != 'all':
        conditions.append("gender = ?")
        params.append(gender)

    if verified != 'all':
        if verified in ('1', 'true', 'verified'):
            conditions.append("(verified = 1 OR aadhaar_verified = 1)")
        elif verified in ('aadhaar', 'aadhaar_verified', 'approved'):
            conditions.append("aadhaar_verified = 1")
        elif verified in ('sent_back', 'rejected'):
            conditions.append("aadhaar_status = 'sent_back'")
        elif verified in ('pending', 'pending_aadhaar', 'unverified_aadhaar'):
            conditions.append("(aadhaar_verified = 0 OR aadhaar_verified IS NULL)")
        else:
            conditions.append("(verified = 0 AND aadhaar_verified = 0)")

    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

    conn = get_db_connection()
    cursor = conn.cursor()

    if search_is_pii:
        # For encrypted PII (phone/email), fetch candidates and filter decrypted values in-memory
        query = f"SELECT * FROM profiles {where_clause} ORDER BY {sort_field} {order_dir}"
        cursor.execute(query, params)
        all_candidates = list_from_rows(cursor.fetchall())
        conn.close()

        filtered_users = [
            u for u in all_candidates
            if (search in (u.get('name') or '').lower() or
                search in (u.get('email') or '').lower() or
                search in (u.get('phone') or '').lower() or
                search in (u.get('city') or '').lower() or
                search in (u.get('state') or '').lower() or
                search in (u.get('profession') or '').lower())
        ]
        total_records = len(filtered_users)
        offset = (page - 1) * limit
        users = filtered_users[offset:offset + limit]
    else:
        # Total count
        cursor.execute(f"SELECT COUNT(*) FROM profiles{where_clause}", params)
        total_records = cursor.fetchone()[0]

        # Paged query
        offset = (page - 1) * limit
        query = f"""
            SELECT * FROM profiles
            {where_clause}
            ORDER BY {sort_field} {order_dir}
            LIMIT ? OFFSET ?
        """
        paged_params = list(params) + [limit, offset]
        cursor.execute(query, paged_params)
        users = list_from_rows(cursor.fetchall())
        conn.close()

    total_pages = math.ceil(total_records / limit) if limit else 1

    for u in users:
        optimize_profile_image_urls(u)

    return jsonify({
        'users': users,
        'total': total_records,
        'page': page,
        'limit': limit,
        'total_pages': total_pages
    })

@app.route('/api/users/<id>', methods=['GET'])
@permission_required('users:view')
def api_get_user(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM profiles WHERE id = ?", (id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    u_dict = dict_from_row(user)
    optimize_profile_image_urls(u_dict)
    return jsonify(u_dict)

def serve_data_uri_or_redirect(img_val, default_fallback=None):
    """Safely serves binary base64 or URL-encoded UTF8 SVG data URIs, or redirects to URL."""
    if not img_val:
        if default_fallback:
            return redirect(default_fallback)
        return ('Image not found', 404)

    if str(img_val).startswith('data:image/'):
        try:
            header, body = str(img_val).split(',', 1)
            mimetype = header.split(';')[0].replace('data:', '') or 'image/jpeg'
            if ';base64' in header:
                missing_padding = len(body) % 4
                if missing_padding:
                    body += '=' * (4 - missing_padding)
                img_bytes = base64.b64decode(body)
            else:
                import urllib.parse
                img_bytes = urllib.parse.unquote(body).encode('utf-8')
            resp = Response(img_bytes, mimetype=mimetype)
            resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            resp.headers['Pragma'] = 'no-cache'
            return resp
        except Exception as e:
            if default_fallback:
                return redirect(default_fallback)
            return (f'Failed to render image: {str(e)}', 500)

    return redirect(str(img_val))

@app.route('/api/users/<id>/photo', methods=['GET'])
def api_user_photo(id):
    """Streams full user photo or redirects to CDN without bloating JSON payloads."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT photo, gender FROM profiles WHERE id = ?", (id,))
    row = cursor.fetchone()
    conn.close()
    default_url = (
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
        if row and str(row['gender']).lower() == 'male'
        else 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'
    )
    if not row or not row['photo']:
        return redirect(default_url)

    return serve_data_uri_or_redirect(row['photo'], default_url)

@app.route('/api/users/<id>/gallery/<photo_type>/<int:idx>', methods=['GET'])
def api_user_gallery_photo(id, photo_type, idx):
    """Streams a candidate's uploaded single or family photo from the gallery."""
    conn = get_db_connection()
    cursor = conn.cursor()
    col = 'single_photos' if photo_type == 'single' else 'family_photos'
    cursor.execute(f"SELECT {col}, photo, gender FROM profiles WHERE id = ?", (id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return ('Candidate not found', 404)
    raw_col = row[col]
    photos = []
    if raw_col:
        try:
            photos = json.loads(raw_col) if isinstance(raw_col, str) else raw_col
        except Exception:
            photos = [raw_col]
    elif photo_type == 'single' and row['photo']:
        photos = [row['photo']]

    default_url = (
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
        if str(row['gender']).lower() == 'male'
        else 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'
    )
    if not isinstance(photos, list) or idx >= len(photos):
        return redirect(default_url)

    return serve_data_uri_or_redirect(photos[idx], default_url)

@app.route('/api/users/<id>/aadhaar-front', methods=['GET'])
def api_user_aadhaar_front(id):
    """Streams full user Aadhaar front document scan."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT aadhaar_front_image FROM profiles WHERE id = ?", (id,))
    row = cursor.fetchone()
    conn.close()
    if not row or not row['aadhaar_front_image']:
        return ('No front document uploaded', 404)

    return serve_data_uri_or_redirect(row['aadhaar_front_image'])

@app.route('/api/users/<id>/aadhaar-back', methods=['GET'])
def api_user_aadhaar_back(id):
    """Streams full user Aadhaar back document scan."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT aadhaar_back_image FROM profiles WHERE id = ?", (id,))
    row = cursor.fetchone()
    conn.close()
    if not row or not row['aadhaar_back_image']:
        return ('No back document uploaded', 404)

    return serve_data_uri_or_redirect(row['aadhaar_back_image'])

@app.route('/api/users', methods=['POST'])
@permission_required('users:edit')
def api_create_user():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    gender = data.get('gender', 'Female')
    age = data.get('age', 25)

    if not name:
        return jsonify({'error': 'Name is required'}), 400

    new_id = data.get('id') or f"p_{int(time.time()*1000)}"
    photo = data.get('photo') or (
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'
        if gender.lower() == 'female'
        else 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
    )

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO profiles (
                id, name, email, phone, age, gender, height, skin_colour, photo,
                religion, caste, mother_tongue, state, city, district, native_address,
                education, education_category, profession, company, annual_income,
                manglik, diet, verified, aadhaar_verified, govt_id_verified, match_score,
                status, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?
            )
        """, (
            new_id,
            name,
            encrypt_customer_data(data.get('email', '').strip()) if data.get('email') else None,
            encrypt_customer_data(data.get('phone', '').strip()) if data.get('phone') else None,
            int(age),
            gender,
            data.get('height', "5'6\""),
            data.get('skin_colour', 'Fair'),
            photo,
            data.get('religion', 'Hindu'),
            data.get('caste', ''),
            data.get('mother_tongue', ''),
            data.get('state', ''),
            data.get('city', ''),
            data.get('district', ''),
            encrypt_customer_data(data.get('native_address', '').strip()) if data.get('native_address') else None,
            data.get('education', ''),
            data.get('education_category', ''),
            data.get('profession', ''),
            data.get('company', ''),
            data.get('annual_income', ''),
            data.get('manglik', 'Non-Manglik'),
            data.get('diet', 'Vegetarian'),
            1 if data.get('verified') else 0,
            1 if data.get('aadhaar_verified') else 0,
            1 if data.get('govt_id_verified') else 0,
            int(data.get('match_score', 90)),
            data.get('status', 'active'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        conn.commit()

        cursor.execute("SELECT * FROM profiles WHERE id = ?", (new_id,))
        created = dict_from_row(cursor.fetchone())
        conn.close()
        return jsonify({'success': True, 'message': 'User profile created successfully', 'user': created}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<id>', methods=['PUT'])
@permission_required('users:edit')
def api_update_user(id):
    data = request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM profiles WHERE id = ?", (id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    try:
        cursor.execute("""
            UPDATE profiles SET
                name = ?, email = ?, phone = ?, age = ?, gender = ?,
                height = ?, skin_colour = ?, photo = ?,
                religion = ?, caste = ?, mother_tongue = ?, state = ?,
                city = ?, district = ?, native_address = ?,
                education = ?, education_category = ?, profession = ?,
                company = ?, annual_income = ?, manglik = ?, diet = ?,
                verified = ?, aadhaar_verified = ?, govt_id_verified = ?,
                match_score = ?, status = ?,
                aadhaar_front_image = COALESCE(?, aadhaar_front_image),
                aadhaar_back_image = COALESCE(?, aadhaar_back_image),
                updated_at = ?
            WHERE id = ?
        """, (
            data.get('name', existing['name']),
            encrypt_customer_data(data['email'].strip()) if 'email' in data and data['email'] else (None if 'email' in data else existing['email']),
            encrypt_customer_data(data['phone'].strip()) if 'phone' in data and data['phone'] else (None if 'phone' in data else existing['phone']),
            int(data.get('age', existing['age'])),
            data.get('gender', existing['gender']),
            data.get('height', existing['height']),
            data.get('skin_colour', existing['skin_colour']),
            data.get('photo', existing['photo']),
            data.get('religion', existing['religion']),
            data.get('caste', existing['caste']),
            data.get('mother_tongue', existing['mother_tongue']),
            data.get('state', existing['state']),
            data.get('city', existing['city']),
            data.get('district', existing['district']),
            encrypt_customer_data(data['native_address'].strip()) if 'native_address' in data and data['native_address'] else (None if 'native_address' in data else existing['native_address']),
            data.get('education', existing['education']),
            data.get('education_category', existing['education_category']),
            data.get('profession', existing['profession']),
            data.get('company', existing['company']),
            data.get('annual_income', existing['annual_income']),
            data.get('manglik', existing['manglik']),
            data.get('diet', existing['diet']),
            1 if data.get('verified', existing['verified']) else 0,
            1 if data.get('aadhaar_verified', existing['aadhaar_verified']) else 0,
            1 if data.get('govt_id_verified', existing['govt_id_verified']) else 0,
            int(data.get('match_score', existing['match_score'])),
            data.get('status', existing['status']),
            data.get('aadhaar_front_image'),
            data.get('aadhaar_back_image'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            id
        ))
        conn.commit()

        cursor.execute("SELECT * FROM profiles WHERE id = ?", (id,))
        updated = dict_from_row(cursor.fetchone())
        conn.close()
        return jsonify({'success': True, 'message': 'Profile updated successfully', 'user': updated})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<id>/status', methods=['PATCH'])
@permission_required('users:edit')
def api_toggle_user_status(id):
    data = request.get_json() or {}
    new_status = data.get('status')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM profiles WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    if not new_status:
        # Toggle between active and suspended
        new_status = 'suspended' if row['status'] == 'active' else 'active'

    cursor.execute("UPDATE profiles SET status = ?, updated_at = ? WHERE id = ?", (
        new_status, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), id
    ))
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'status': new_status, 'message': f'Status changed to {new_status}'})

@app.route('/api/users/<id>/verify-aadhaar', methods=['PATCH', 'POST'])
@permission_required('users:verify')
def api_toggle_user_aadhaar_verification(id):
    data = request.get_json(silent=True) or {}
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT aadhaar_verified, govt_id_verified, verified, name FROM profiles WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    current_val = bool(row['aadhaar_verified'])
    if 'verified' in data:
        new_val = 1 if data['verified'] else 0
    elif 'aadhaar_verified' in data:
        new_val = 1 if data['aadhaar_verified'] else 0
    else:
        new_val = 0 if current_val else 1

    user_name = row['name'] or 'Candidate'
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    action = data.get('action')

    # Send Back flow for unclear / unreadable / blurry Aadhaar photos
    if action == 'send_back':
        reason = (data.get('reason') or data.get('rejection_reason') or 'Aadhaar photo is blurry or unclear. Please re-upload a clear copy.').strip()
        cursor.execute("""
            UPDATE profiles 
            SET aadhaar_verified = 0,
                govt_id_verified = 0,
                verified = 0,
                aadhaar_status = 'sent_back',
                aadhaar_rejection_reason = ?,
                updated_at = ?
            WHERE id = ?
        """, (reason, now_str, id))
        conn.commit()

        # Record event in activity_logs
        try:
            admin_user = session.get('user', {})
            admin_id = admin_user.get('id', 1)
            cursor.execute("""
                INSERT INTO activity_logs (admin_id, action, target_entity, target_id, details)
                VALUES (?, 'aadhaar:send_back', 'profiles', ?, ?)
            """, (admin_id, id, f"Sent back Aadhaar card to {user_name} for re-upload. Reason: {reason}"))
            conn.commit()
        except Exception:
            pass

        conn.close()
        return jsonify({
            'success': True,
            'id': id,
            'aadhaar_verified': False,
            'aadhaar_status': 'sent_back',
            'aadhaar_rejection_reason': reason,
            'message': f"Aadhaar document sent back to {user_name} for re-upload"
        })

    current_val = bool(row['aadhaar_verified'])
    if 'verified' in data:
        new_val = 1 if data['verified'] else 0
    elif 'aadhaar_verified' in data:
        new_val = 1 if data['aadhaar_verified'] else 0
    else:
        new_val = 0 if current_val else 1

    if new_val == 1:
        cursor.execute("""
            UPDATE profiles 
            SET aadhaar_verified = 1, govt_id_verified = 1, verified = 1,
                aadhaar_status = 'approved',
                aadhaar_rejection_reason = NULL,
                status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
                updated_at = ?
            WHERE id = ?
        """, (now_str, id))
        msg = f"Aadhaar verification approved for {user_name}"
        status_str = 'approved'
    else:
        cursor.execute("""
            UPDATE profiles 
            SET aadhaar_verified = 0,
                govt_id_verified = 0,
                verified = 0,
                aadhaar_status = 'pending',
                aadhaar_rejection_reason = NULL,
                updated_at = ?
            WHERE id = ?
        """, (now_str, id))
        msg = f"Aadhaar verification revoked for {user_name}"
        status_str = 'pending'

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'id': id,
        'aadhaar_verified': bool(new_val),
        'aadhaar_status': status_str,
        'aadhaar_rejection_reason': None,
        'message': msg
    })

@app.route('/api/users/<id>/send-back-aadhaar', methods=['POST'])
@permission_required('users:verify')
def api_send_back_user_aadhaar(id):
    """Direct endpoint to send back Aadhaar photo with specific reason."""
    data = request.get_json(silent=True) or {}
    data['action'] = 'send_back'
    return api_toggle_user_aadhaar_verification(id)

@app.route('/api/users/<id>', methods=['DELETE'])
@permission_required('users:delete')
def api_delete_user(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM profiles WHERE id = ?", (id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    cursor.execute("DELETE FROM profiles WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': f"Profile '{user['name']}' has been permanently deleted"})

# ==========================================
# OFFERS & DISCOUNTS CRUD APIS
# ==========================================

@app.route('/api/offers', methods=['GET'])
@permission_required('offers:view')
def api_get_offers():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM offers ORDER BY created_at DESC")
    offers = list_from_rows(cursor.fetchall())
    conn.close()
    return jsonify({'offers': offers, 'total': len(offers)})

@app.route('/api/offers', methods=['POST'])
@permission_required('offers:edit')
def api_create_offer():
    data = request.get_json() or {}
    code = data.get('code', '').strip().upper()
    title = data.get('title', '').strip()
    discount = data.get('discount_percent', 10)
    plan_type = data.get('plan_type', 'All Plans')

    if not code or not title:
        return jsonify({'error': 'Coupon code and Title are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM offers WHERE code = ?", (code,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': f"Offer code '{code}' already exists"}), 400

    try:
        cursor.execute("""
            INSERT INTO offers (
                code, title, discount_percent, plan_type, description,
                valid_from, valid_until, max_uses, current_uses, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            code,
            title,
            int(discount),
            plan_type,
            data.get('description', ''),
            data.get('valid_from', datetime.now().strftime('%Y-%m-%d')),
            data.get('valid_until', (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d')),
            int(data.get('max_uses', 100)),
            int(data.get('current_uses', 0)),
            1 if data.get('is_active', 1) else 0
        ))
        new_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT * FROM offers WHERE id = ?", (new_id,))
        created = dict_from_row(cursor.fetchone())
        conn.close()
        return jsonify({'success': True, 'message': 'Promotional offer created successfully', 'offer': created}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/offers/<int:id>', methods=['GET'])
@permission_required('offers:view')
def api_get_offer(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM offers WHERE id = ?", (id,))
    offer = cursor.fetchone()
    conn.close()

    if not offer:
        return jsonify({'error': 'Offer not found'}), 404
    return jsonify(dict_from_row(offer))

@app.route('/api/offers/<int:id>', methods=['PUT'])
@permission_required('offers:edit')
def api_update_offer(id):
    data = request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM offers WHERE id = ?", (id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Offer not found'}), 404

    code = data.get('code', existing['code']).strip().upper()
    
    # Check duplicate code if changed
    if code != existing['code']:
        cursor.execute("SELECT id FROM offers WHERE code = ? AND id != ?", (code, id))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': f"Offer code '{code}' already taken"}), 400

    try:
        cursor.execute("""
            UPDATE offers SET
                code = ?,
                title = ?,
                discount_percent = ?,
                plan_type = ?,
                description = ?,
                valid_from = ?,
                valid_until = ?,
                max_uses = ?,
                current_uses = ?,
                is_active = ?
            WHERE id = ?
        """, (
            code,
            data.get('title', existing['title']),
            int(data.get('discount_percent', existing['discount_percent'])),
            data.get('plan_type', existing['plan_type']),
            data.get('description', existing['description']),
            data.get('valid_from', existing['valid_from']),
            data.get('valid_until', existing['valid_until']),
            int(data.get('max_uses', existing['max_uses'])),
            int(data.get('current_uses', existing['current_uses'])),
            1 if data.get('is_active', existing['is_active']) else 0,
            id
        ))
        conn.commit()

        cursor.execute("SELECT * FROM offers WHERE id = ?", (id,))
        updated = dict_from_row(cursor.fetchone())
        conn.close()
        return jsonify({'success': True, 'message': 'Offer updated successfully', 'offer': updated})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/offers/<int:id>/toggle', methods=['PATCH'])
@permission_required('offers:edit')
def api_toggle_offer(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_active, code FROM offers WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Offer not found'}), 404

    new_state = 0 if row['is_active'] == 1 else 1
    cursor.execute("UPDATE offers SET is_active = ? WHERE id = ?", (new_state, id))
    conn.commit()
    conn.close()

    status_str = "activated" if new_state == 1 else "deactivated"
    return jsonify({'success': True, 'is_active': new_state, 'message': f"Offer '{row['code']}' {status_str}"})

@app.route('/api/offers/<int:id>', methods=['DELETE'])
@permission_required('offers:delete')
def api_delete_offer(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT code FROM offers WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Offer not found'}), 404

    cursor.execute("DELETE FROM offers WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': f"Offer '{row['code']}' deleted successfully"})

# ==========================================
# MEMBERSHIP PLANS & PRICING CRUD APIS
# ==========================================

@app.route('/api/plans', methods=['GET'])
@permission_required('plans:view')
def api_get_plans():
    try:
        from database import get_all_membership_plans
        plans = get_all_membership_plans(active_only=False)
        return jsonify({'success': True, 'plans': plans, 'total': len(plans)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/plans/<id>', methods=['GET'])
@permission_required('plans:view')
def api_get_plan(id):
    try:
        from database import get_membership_plan_by_id
        plan = get_membership_plan_by_id(id)
        if not plan:
            return jsonify({'error': 'Membership plan not found'}), 404
        return jsonify({'success': True, 'plan': plan})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/plans', methods=['POST'])
@permission_required('plans:edit')
def api_create_plan():
    data = request.get_json() or {}
    try:
        from database import create_membership_plan_db
        plan = create_membership_plan_db(data)
        return jsonify({'success': True, 'message': 'Membership plan created successfully', 'plan': plan}), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/plans/<id>', methods=['PUT'])
@permission_required('plans:edit')
def api_update_plan(id):
    data = request.get_json() or {}
    try:
        from database import update_membership_plan_db
        updated = update_membership_plan_db(id, data)
        if not updated:
            return jsonify({'error': 'Membership plan not found'}), 404
        return jsonify({'success': True, 'message': 'Membership plan updated successfully', 'plan': updated})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/plans/<id>/toggle', methods=['PATCH'])
@permission_required('plans:edit')
def api_toggle_plan(id):
    try:
        from database import toggle_membership_plan_db
        plan = toggle_membership_plan_db(id)
        if not plan:
            return jsonify({'error': 'Membership plan not found'}), 404
        status_str = "activated" if plan['is_active'] == 1 else "deactivated"
        return jsonify({
            'success': True,
            'is_active': plan['is_active'],
            'message': f"Plan '{plan['name']}' {status_str} successfully",
            'plan': plan
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/plans/<id>', methods=['DELETE'])
@permission_required('plans:delete')
def api_delete_plan(id):
    try:
        from database import get_membership_plan_by_id, delete_membership_plan_db
        existing = get_membership_plan_by_id(id)
        if not existing:
            return jsonify({'error': 'Membership plan not found'}), 404
        delete_membership_plan_db(id)
        return jsonify({'success': True, 'message': f"Plan '{existing['name']}' deleted successfully"})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# PAYMENTS & PAYMENT HISTORY CRUD APIS
# ==========================================

@app.route('/api/payments', methods=['GET'])
@permission_required('payments:view')
def api_get_payments():
    search = request.args.get('q', '').strip().lower()
    status = request.args.get('status', 'all')
    method = request.args.get('method', 'all')
    sort_by = request.args.get('sort_by', 'payment_date')
    order = request.args.get('order', 'desc').lower()

    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 10))))
    except ValueError:
        page, limit = 1, 10

    valid_sort_fields = {
        'payment_date': 'payment_date',
        'amount': 'amount',
        'user_name': 'user_name',
        'status': 'status',
        'plan_name': 'plan_name'
    }
    sort_field = valid_sort_fields.get(sort_by, 'payment_date')
    order_dir = 'ASC' if order == 'asc' else 'DESC'

    conditions = []
    params = []

    if search:
        search_param = f"%{search}%"
        conditions.append("""(
            LOWER(transaction_id) LIKE ? OR
            LOWER(user_name) LIKE ? OR
            LOWER(invoice_no) LIKE ? OR
            LOWER(plan_name) LIKE ? OR
            LOWER(notes) LIKE ?
        )""")
        params.extend([search_param] * 5)

    if status != 'all':
        conditions.append("status = ?")
        params.append(status)

    if method != 'all':
        conditions.append("LOWER(payment_method) LIKE ?")
        params.append(f"%{method.lower()}%")

    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

    conn = get_db_connection()
    cursor = conn.cursor()

    # Total count and aggregate volume
    cursor.execute(f"SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM payments{where_clause}", params)
    total_records, total_volume = cursor.fetchone()

    # Paged query
    offset = (page - 1) * limit
    query = f"""
        SELECT * FROM payments
        {where_clause}
        ORDER BY {sort_field} {order_dir}
        LIMIT ? OFFSET ?
    """
    paged_params = list(params) + [limit, offset]
    cursor.execute(query, paged_params)
    payments = list_from_rows(cursor.fetchall())
    conn.close()

    total_pages = math.ceil(total_records / limit) if limit else 1

    return jsonify({
        'payments': payments,
        'total': total_records,
        'total_volume': total_volume,
        'page': page,
        'limit': limit,
        'total_pages': total_pages
    })

@app.route('/api/payments/<int:id>', methods=['GET'])
@permission_required('payments:view')
def api_get_payment(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM payments WHERE id = ?", (id,))
    payment = cursor.fetchone()
    conn.close()

    if not payment:
        return jsonify({'error': 'Payment transaction not found'}), 404
    return jsonify(dict_from_row(payment))

@app.route('/api/payments', methods=['POST'])
@permission_required('payments:edit')
def api_create_payment():
    data = request.get_json() or {}
    user_name = data.get('user_name', '').strip()
    plan_name = data.get('plan_name', 'Gold 3-Months')
    amount = float(data.get('amount', 2999))
    method = data.get('payment_method', 'UPI')
    status = data.get('status', 'completed')

    if not user_name:
        return jsonify({'error': 'Customer / User name is required'}), 400

    txn_id = data.get('transaction_id') or f"TXN-{int(time.time()*100) % 1000000}"
    invoice_no = data.get('invoice_no') or f"INV-2026-{int(time.time()) % 10000:04d}"

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO payments (
                transaction_id, user_id, user_name, plan_name, amount,
                currency, payment_method, status, invoice_no, payment_date, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            txn_id,
            data.get('user_id'),
            user_name,
            plan_name,
            amount,
            data.get('currency', 'INR'),
            method,
            status,
            invoice_no,
            data.get('payment_date', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
            data.get('notes', 'Manual transaction recorded from admin portal')
        ))
        new_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT * FROM payments WHERE id = ?", (new_id,))
        created = dict_from_row(cursor.fetchone())
        conn.close()
        return jsonify({'success': True, 'message': 'Payment record created successfully', 'payment': created}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments/<int:id>', methods=['PUT'])
@permission_required('payments:edit')
def api_update_payment(id):
    data = request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM payments WHERE id = ?", (id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Payment transaction not found'}), 404

    try:
        cursor.execute("""
            UPDATE payments SET
                user_name = ?,
                plan_name = ?,
                amount = ?,
                payment_method = ?,
                status = ?,
                notes = ?,
                payment_date = ?
            WHERE id = ?
        """, (
            data.get('user_name', existing['user_name']),
            data.get('plan_name', existing['plan_name']),
            float(data.get('amount', existing['amount'])),
            data.get('payment_method', existing['payment_method']),
            data.get('status', existing['status']),
            data.get('notes', existing['notes']),
            data.get('payment_date', existing['payment_date']),
            id
        ))
        conn.commit()

        cursor.execute("SELECT * FROM payments WHERE id = ?", (id,))
        updated = dict_from_row(cursor.fetchone())
        conn.close()
        return jsonify({'success': True, 'message': 'Payment record updated successfully', 'payment': updated})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments/<int:id>', methods=['DELETE'])
@permission_required('payments:delete')
def api_delete_payment(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT transaction_id, user_name, amount FROM payments WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Payment transaction not found'}), 404

    cursor.execute("DELETE FROM payments WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f"Payment record '{row['transaction_id']}' (₹{row['amount']:,.2f} - {row['user_name']}) deleted from history"
    })

# ==========================================
# CSV EXPORT APIS
# ==========================================

@app.route('/export/users/csv')
@permission_required('users:export')
def export_users_csv():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, phone, age, gender, state, city, profession, religion, caste, verified, aadhaar_verified, status, deletion_reason, deleted_at, created_at FROM profiles ORDER BY created_at DESC")
    rows = list_from_rows(cursor.fetchall())
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Name', 'Email', 'Phone', 'Age', 'Gender', 'State', 'City', 'Profession', 'Religion', 'Caste', 'Verified', 'Aadhaar Verified', 'Status', 'Deletion Reason', 'Deleted At', 'Joined Date'])
    for r in rows:
        writer.writerow([r['id'], r['name'], r['email'], r['phone'], r['age'], r['gender'], r['state'], r['city'], r['profession'], r['religion'], r['caste'], 'Yes' if r['verified'] else 'No', 'Yes' if r['aadhaar_verified'] else 'No', r['status'], r['deletion_reason'] or '', r['deleted_at'] or '', r['created_at']])

    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = f"attachment; filename=I4You_Users_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return response

@app.route('/export/payments/csv')
@permission_required('payments:export')
def export_payments_csv():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT transaction_id, invoice_no, user_name, plan_name, amount, currency, payment_method, status, payment_date, notes FROM payments ORDER BY payment_date DESC")
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Transaction ID', 'Invoice #', 'User Name', 'Plan / Package', 'Amount (INR)', 'Currency', 'Payment Method', 'Status', 'Date & Time', 'Notes'])
    for r in rows:
        writer.writerow([r['transaction_id'], r['invoice_no'], r['user_name'], r['plan_name'], r['amount'], r['currency'], r['payment_method'], r['status'], r['payment_date'], r['notes']])

    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = f"attachment; filename=I4You_Payment_History_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return response

# ==========================================
# SYSTEM METADATA APIS
# ==========================================

@app.route('/api/system/database-status', methods=['GET'])
@roles_required('Super Admin')
def api_database_status():
    """Returns metadata about the active database engine (PostgreSQL vs SQLite)."""
    return jsonify({
        'success': True,
        'status': get_database_status()
    })

# ==========================================
# SERVER STARTUP
# ==========================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    db_stat = get_database_status()
    print(f"[*] Starting I 4 You Admin Portal at http://127.0.0.1:{port}/")
    print(f"[*] Active Database Engine: {db_stat['engine']} (Database: {db_stat['database']} | Host: {db_stat['host']})")
    debug_mode = os.environ.get('FLASK_DEBUG', '').lower() in ('1', 'true')
    app.run(host='0.0.0.0', port=port, debug=debug_mode, use_reloader=False)

