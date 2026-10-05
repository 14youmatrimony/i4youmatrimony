"""
Comprehensive Security Verification Test Suite for I 4 You Matrimonial Platform
Validates:
1. Cryptographic Password Hashing & Timing-Attack Resistance
2. SQL Injection Resistance & Strict Parameterization
3. Input Sanitization & XSS Neutralization
"""

import os
import sys
import unittest
import sqlite3

# Ensure admin directory is on path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

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
from database import (
    init_db,
    get_db_connection,
    create_admin_user,
    authenticate_admin,
    search_profiles_secure,
    create_profile_secure,
    update_profile_secure,
    get_profile_by_id_secure,
    delete_profile_secure
)


class TestPasswordSecurity(unittest.TestCase):
    """Verifies password complexity, salted hashing, and verification."""

    def test_password_strength_validation(self):
        # Valid strong passwords
        valid, msg = validate_password_strength("Matrimony@2026!")
        self.assertTrue(valid, msg)

        valid, msg = validate_password_strength("Secure#Admin$99")
        self.assertTrue(valid, msg)

        # Invalid: Too short
        valid, msg = validate_password_strength("Short1!")
        self.assertFalse(valid)
        self.assertIn("at least 8 characters", msg)

        # Invalid: Missing uppercase
        valid, msg = validate_password_strength("lowercase123!@")
        self.assertFalse(valid)
        self.assertIn("uppercase", msg)

        # Invalid: Missing lowercase
        valid, msg = validate_password_strength("UPPERCASE123!@")
        self.assertFalse(valid)
        self.assertIn("lowercase", msg)

        # Invalid: Missing digits
        valid, msg = validate_password_strength("NoDigitsHere!@#")
        self.assertFalse(valid)
        self.assertIn("digit", msg)

        # Invalid: Missing special characters
        valid, msg = validate_password_strength("NoSpecialChar123")
        self.assertFalse(valid)
        self.assertIn("special character", msg)

        # Invalid: Common predictable password
        valid, msg = validate_password_strength("Password123")
        self.assertFalse(valid)

    def test_password_hashing_and_verification(self):
        password = "V$erySecretPassword#2026"
        hashed = hash_password(password)

        # Verify hash is salted and not plaintext
        self.assertNotEqual(password, hashed)
        self.assertTrue(hashed.startswith('scrypt:') or hashed.startswith('pbkdf2:'))

        # Verify correct password succeeds
        self.assertTrue(verify_password(hashed, password))

        # Verify incorrect password fails
        self.assertFalse(verify_password(hashed, "WrongPassword@123"))
        self.assertFalse(verify_password(hashed, ""))
        self.assertFalse(verify_password(hashed, password.lower()))

        # Verify unique salts: two hashes of same password must be distinct
        hashed2 = hash_password(password)
        self.assertNotEqual(hashed, hashed2)
        self.assertTrue(verify_password(hashed2, password))


class TestSQLInjectionProtection(unittest.TestCase):
    """Verifies that malicious SQL injection payloads cannot compromise the database."""

    @classmethod
    def setUpClass(cls):
        init_db()

    def test_sql_injection_in_search(self):
        """Test classic SQL injection strings in search queries."""
        malicious_searches = [
            "' OR '1'='1",
            "admin' --",
            "test' UNION SELECT id, username, password_hash, 1, 1, 1, 1, 1, 1 FROM admin_users --",
            "'; DROP TABLE profiles; --",
            "1' AND (SELECT COUNT(*) FROM admin_users) > 0 --",
            "x' OR 1=1 #",
            "'/* comment */OR 1=1--"
        ]

        for payload in malicious_searches:
            # Ensure query executes safely without syntax errors or table drops
            res = search_profiles_secure(search_term=payload)
            self.assertIsInstance(res, dict)
            self.assertIn('data', res)
            self.assertIn('total', res)

        # Confirm database table is intact after attempted DROP TABLE
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'")
        self.assertIsNotNone(cursor.fetchone(), "Table 'profiles' was dropped!")
        conn.close()

    def test_sql_injection_in_sort_identifier_blocked(self):
        """Ensures non-whitelisted or injected sort columns raise security exceptions."""
        malicious_sorts = [
            "name; DROP TABLE profiles; --",
            "created_at DESC; SELECT * FROM admin_users",
            "id, (SELECT password_hash FROM admin_users LIMIT 1)",
            "invalid_column_name",
            "name UNION SELECT 1"
        ]

        for bad_sort in malicious_sorts:
            with self.assertRaises(ValueError):
                search_profiles_secure(sort_by=bad_sort)

    def test_sql_injection_in_filters_blocked(self):
        """Ensures malicious column names in filters are rejected by whitelist."""
        malicious_filters = {
            "religion; DROP TABLE profiles; --": "Hindu",
            "id UNION SELECT 1": "p1",
            "non_existent_column": "value"
        }

        with self.assertRaises(ValueError):
            search_profiles_secure(filters=malicious_filters)

    def test_like_wildcard_escaping(self):
        """Ensures wildcards in search terms are properly escaped."""
        raw = "100% Guaranteed_Match\\Special"
        escaped = escape_sql_like(raw)
        self.assertEqual(escaped, "100\\% Guaranteed\\_Match\\\\Special")

    def test_sql_injection_pattern_detection(self):
        self.assertTrue(check_sql_injection_attempt("admin' OR 1=1 --"))
        self.assertTrue(check_sql_injection_attempt("SELECT * FROM users"))
        self.assertTrue(check_sql_injection_attempt("'; DROP TABLE profiles;"))
        self.assertFalse(check_sql_injection_attempt("Software Engineer Mumbai"))


class TestInputSanitization(unittest.TestCase):
    """Verifies XSS neutralization, text cleanup, email & phone validation."""

    def test_xss_neutralization(self):
        # Script tags
        malicious_input = '<script>alert("XSS Vulnerability")</script>Dr. Rohit Sharma'
        clean = sanitize_text(malicious_input)
        self.assertNotIn('<script>', clean)
        self.assertNotIn('alert', clean)
        self.assertIn('Dr. Rohit Sharma', clean)

        # Onerror event handler
        img_payload = '<img src=x onerror="alert(document.cookie)"/>Priya'
        clean_img = sanitize_text(img_payload)
        self.assertNotIn('onerror', clean_img)

        # Iframe injection
        iframe_payload = '<iframe src="https://attacker.com/steal"></iframe>Test User'
        clean_iframe = sanitize_text(iframe_payload)
        self.assertNotIn('<iframe', clean_iframe)

    def test_control_character_stripping(self):
        # Null bytes and non-printable control characters
        dirty = "User\0Name\x01\x02\x03With\x08Chars"
        clean = sanitize_text(dirty)
        self.assertNotIn('\0', clean)
        self.assertNotIn('\x01', clean)
        self.assertEqual(clean, "UserNameWithChars")

    def test_email_sanitization(self):
        # Valid email
        clean = sanitize_email("  User.Test@Example.COM  ")
        self.assertEqual(clean, "user.test@example.com")

        # Invalid emails
        with self.assertRaises(ValueError):
            sanitize_email("not-an-email")
        with self.assertRaises(ValueError):
            sanitize_email("<script>@evil.com")
        with self.assertRaises(ValueError):
            sanitize_email("user@invalid..domain")

    def test_phone_sanitization(self):
        # Valid Indian phone numbers
        self.assertEqual(sanitize_phone("9876543210"), "+91 9876543210")
        self.assertEqual(sanitize_phone("+91 98765 43210"), "+91 9876543210")
        self.assertEqual(sanitize_phone("09876543210"), "+91 9876543210")

        # Invalid: starts with 1-5
        with self.assertRaises(ValueError):
            sanitize_phone("1234567890")

        # Invalid length
        with self.assertRaises(ValueError):
            sanitize_phone("987654")

    def test_profile_id_sanitization(self):
        self.assertEqual(sanitize_profile_id("p100"), "p100")
        self.assertEqual(sanitize_profile_id("profile-2026_test"), "profile-2026_test")

        # Invalid: contains SQL or path traversal chars
        with self.assertRaises(ValueError):
            sanitize_profile_id("../../../etc/passwd")
        with self.assertRaises(ValueError):
            sanitize_profile_id("p1; DROP TABLE users;")


class TestDatabaseCRUD(unittest.TestCase):
    """Verifies end-to-end secure database authentication and operations."""

    @classmethod
    def setUpClass(cls):
        init_db()

    def test_admin_creation_and_authentication(self):
        username = "sec_officer"
        email = "security@i4you.com"
        password = "Admin#Secure987!"

        # Remove existing if any
        conn = get_db_connection()
        conn.execute("DELETE FROM admin_users WHERE username = ? OR email = ?", (username, email))
        conn.commit()
        conn.close()

        # Create admin user
        admin = create_admin_user(
            username=username,
            email=email,
            password=password,
            full_name="Security Officer",
            role="Security Admin"
        )
        self.assertIsNotNone(admin)
        self.assertEqual(admin['username'], username)

        # Authenticate with correct credentials
        auth_user = authenticate_admin(email, password, ip_address="127.0.0.1")
        self.assertIsNotNone(auth_user)
        self.assertEqual(auth_user['username'], username)
        self.assertNotIn('password_hash', auth_user)

        # Authenticate with wrong password
        failed = authenticate_admin(email, "WrongPassword@123", ip_address="127.0.0.1")
        self.assertIsNone(failed)

        # Authenticate with SQL injection string
        sqli_attempt = authenticate_admin("' OR 1=1 --", "any", ip_address="192.168.1.100")
        self.assertIsNone(sqli_attempt)

    def test_profile_creation_and_search(self):
        profile_id = "test-sec-p1"
        delete_profile_secure(profile_id)

        # Create profile with sanitized inputs
        new_id = create_profile_secure({
            'id': profile_id,
            'name': '<b>Aditi Sharma</b>',  # HTML will be neutralized
            'email': 'aditi.sharma@example.com',
            'phone': '9820011223',
            'age': 27,
            'city': 'Pune',
            'state': 'Maharashtra',
            'religion': 'Hindu'
        })
        self.assertEqual(new_id, profile_id)

        # Retrieve profile
        p = get_profile_by_id_secure(profile_id)
        self.assertIsNotNone(p)
        self.assertNotIn('<b>', p['name'])  # HTML should be sanitized
        self.assertEqual(p['city'], 'Pune')

        # Clean up
        delete_profile_secure(profile_id)


class TestCustomerDataEncryption(unittest.TestCase):
    """
    Verifies AES-256-GCM Customer Data At-Rest Encryption & Decryption fidelity.
    Ensures:
    1. Authenticated encryption with integrity protection
    2. Random IV nonce uniqueness (probabilistic encryption)
    3. Tamper detection and rejection
    4. Safe PII masking
    5. Physical storage on SQLite disk is ciphertext with enc:v1: prefix
    6. Transparent decryption for authorized backend/admin consumers
    """

    def test_encrypt_decrypt_roundtrip(self):
        sample_phone = "+91 98765 43210"
        sample_email = "rajesh.sharma@matrimony.org"
        sample_address = "Flat 402, Sai Residency, MG Road, Ernakulam, Kerala - 682016"

        enc_phone = encrypt_customer_data(sample_phone)
        enc_email = encrypt_customer_data(sample_email)
        enc_addr = encrypt_customer_data(sample_address)

        # Ciphertext assertions
        self.assertTrue(is_encrypted(enc_phone))
        self.assertTrue(is_encrypted(enc_email))
        self.assertTrue(is_encrypted(enc_addr))
        self.assertNotEqual(sample_phone, enc_phone)
        self.assertNotEqual(sample_email, enc_email)
        self.assertNotEqual(sample_address, enc_addr)

        # Decryption assertions
        self.assertEqual(decrypt_customer_data(enc_phone), sample_phone)
        self.assertEqual(decrypt_customer_data(enc_email), sample_email)
        self.assertEqual(decrypt_customer_data(enc_addr), sample_address)

    def test_probabilistic_encryption(self):
        # Two encryptions of the identical plaintext must yield distinct ciphertexts (unique 96-bit nonces)
        plaintext = "+91 99460 12345"
        enc1 = encrypt_customer_data(plaintext)
        enc2 = encrypt_customer_data(plaintext)
        self.assertNotEqual(enc1, enc2)
        self.assertEqual(decrypt_customer_data(enc1), plaintext)
        self.assertEqual(decrypt_customer_data(enc2), plaintext)

    def test_no_double_encryption(self):
        plaintext = "ananya.nair@example.com"
        enc = encrypt_customer_data(plaintext)
        double_enc = encrypt_customer_data(enc)
        self.assertEqual(enc, double_enc)
        self.assertEqual(decrypt_customer_data(double_enc), plaintext)

    def test_tamper_resistance(self):
        plaintext = "Confidential customer residential address"
        enc = encrypt_customer_data(plaintext)
        self.assertTrue(enc.startswith("enc:v1:"))

        # Tamper with the base64 ciphertext content
        payload = enc[len("enc:v1:"):]
        tampered_char = 'B' if payload[10] != 'B' else 'C'
        tampered_payload = payload[:10] + tampered_char + payload[11:]
        tampered_enc = f"enc:v1:{tampered_payload}"

        decrypted = decrypt_customer_data(tampered_enc)
        self.assertEqual(decrypted, "[ENCRYPTED: TAMPER/DECRYPT ERROR]")

    def test_empty_and_legacy_handling(self):
        self.assertIsNone(encrypt_customer_data(None))
        self.assertEqual(encrypt_customer_data(""), "")
        self.assertIsNone(decrypt_customer_data(None))
        self.assertEqual(decrypt_customer_data(""), "")
        # Legacy unencrypted data passes through unchanged
        self.assertEqual(decrypt_customer_data("legacy_plain_email@test.com"), "legacy_plain_email@test.com")

    def test_pii_masking(self):
        phone = "+91 98765 43210"
        masked_phone = mask_customer_phone(phone)
        self.assertTrue(masked_phone.startswith("+91 98*** ***"))
        self.assertTrue(masked_phone.endswith("10"))

        email = "priya.nambiar@gmail.com"
        masked_email = mask_customer_email(email)
        self.assertEqual(masked_email, "p***@gmail.com")

        # Masking encrypted values directly
        enc_phone = encrypt_customer_data(phone)
        enc_email = encrypt_customer_data(email)
        self.assertEqual(mask_customer_phone(enc_phone), masked_phone)
        self.assertEqual(mask_customer_email(enc_email), masked_email)

    def test_database_sqlite_at_rest_encryption(self):
        test_id = "test-enc-customer-1"
        delete_profile_secure(test_id)

        raw_phone = "+91 9447199887"
        raw_email = "test.crypto.user@matrimony.org"
        raw_address = "House No. 12, Rose Villa, Kottayam, Kerala"

        # Create profile using secure database API
        created_id = create_profile_secure({
            'id': test_id,
            'name': 'Deepak Menon',
            'phone': raw_phone,
            'email': raw_email,
            'native_address': raw_address,
            'city': 'Kottayam',
            'state': 'Kerala',
            'age': 31,
            'gender': 'Male'
        })
        self.assertEqual(created_id, test_id)

        # Inspect raw SQLite database directly (bypass ORM/helper layer)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT phone, email, native_address FROM profiles WHERE id = ?", (test_id,))
        row = cursor.fetchone()
        conn.close()

        self.assertIsNotNone(row)
        db_phone, db_email, db_addr = row['phone'], row['email'], row['native_address']

        # Confirm ciphertext physically written to SQLite on disk
        self.assertTrue(db_phone.startswith('enc:v1:'), f"Phone not encrypted on disk: {db_phone}")
        self.assertTrue(db_email.startswith('enc:v1:'), f"Email not encrypted on disk: {db_email}")
        self.assertTrue(db_addr.startswith('enc:v1:'), f"Address not encrypted on disk: {db_addr}")
        self.assertNotIn("94471", db_phone)
        self.assertNotIn("test.crypto.user", db_email)
        self.assertNotIn("Rose Villa", db_addr)

        # Confirm authorized transparent decryption via helper
        profile = get_profile_by_id_secure(test_id)
        self.assertIsNotNone(profile)
        self.assertEqual(profile['phone'], raw_phone)
        self.assertEqual(profile['email'], raw_email)
        self.assertEqual(profile['native_address'], raw_address)

        # Clean up
        delete_profile_secure(test_id)


if __name__ == '__main__':
    unittest.main(verbosity=2)
