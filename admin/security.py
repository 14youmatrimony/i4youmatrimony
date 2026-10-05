"""
Enterprise Security Module for I 4 You Matrimonial Platform
Provides:
1. Cryptographically secure password hashing (scrypt / PBKDF2) & timing-attack resistant verification
2. Protection against SQL Injection (parameterized query utilities, identifier whitelisting, LIKE escaping)
3. Robust input sanitization (HTML/XSS neutralization, control character removal, email & Indian phone normalization)
"""

import os
import re
import html
import base64
import secrets
import hashlib
import unicodedata
from typing import Tuple, Optional, Set, Dict, Any

# Cryptography AEAD AES-256-GCM for Customer Data At-Rest Encryption
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    HAS_AESGCM = True
except ImportError:
    HAS_AESGCM = False

# Try importing werkzeug security functions; provide robust fallback if unavailable
try:
    from werkzeug.security import generate_password_hash as wz_gen_hash
    from werkzeug.security import check_password_hash as wz_check_hash
    HAS_WERKZEUG = True
except ImportError:
    HAS_WERKZEUG = False

# Regex Patterns for Strict Input Validation
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$')
INDIAN_MOBILE_REGEX = re.compile(r'^[6-9]\d{9}$')
IDENTIFIER_REGEX = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')
DANGEROUS_SQL_PATTERNS = re.compile(
    r'(--|\b(UNION\s+ALL|UNION|SELECT|DROP|ALTER|DELETE|UPDATE|INSERT|EXEC|MERGE)\b|/\*|\*/|;)',
    re.IGNORECASE
)
DANGEROUS_HTML_TAGS = re.compile(
    r'<\s*(script|iframe|object|embed|applet|svg|link|meta|style|base|form|input|button)[^>]*>.*?</\s*\1\s*>',
    re.IGNORECASE | re.DOTALL
)
EVENT_HANDLER_REGEX = re.compile(r'on[a-zA-Z]+\s*=\s*(?:["\'][^"\']*["\']|[^\s>]+)', re.IGNORECASE)
JAVASCRIPT_URI_REGEX = re.compile(r'javascript\s*:\s*', re.IGNORECASE)
HTML_TAG_STRIPPER = re.compile(r'<[^>]+>')

# Password Policy Configuration
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
PBKDF2_ITERATIONS = 600000  # OWASP recommendation for PBKDF2-HMAC-SHA256


# ==========================================
# 1. SECURE PASSWORD HASHING & VERIFICATION
# ==========================================

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Enforces strict password complexity:
    - 8 to 128 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    """
    if not password or not isinstance(password, str):
        return False, "Password cannot be empty."
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long."
    if len(password) > MAX_PASSWORD_LENGTH:
        return False, f"Password must not exceed {MAX_PASSWORD_LENGTH} characters."
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter (A-Z)."
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter (a-z)."
    if not re.search(r'\d', password):
        return False, "Password must contain at least one numeric digit (0-9)."
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>/?`~]', password):
        return False, "Password must contain at least one special character (e.g. !@#$%^&*)."
    
    # Check for trivially common passwords
    common_weak_passwords = {
        'password', 'password123', 'admin123', 'admin@123', 'welcome123', 
        'qwerty123', '12345678', '123456789', 'matrimony123'
    }
    if password.lower() in common_weak_passwords:
        return False, "Password is too common and predictable. Please choose a stronger password."

    return True, "Password meets all complexity requirements."


def hash_password(password: str) -> str:
    """
    Hashes a password using scrypt (preferred) or PBKDF2-HMAC-SHA256 with cryptographically
    secure random salt. Never stores plaintext passwords.
    """
    if not password:
        raise ValueError("Password cannot be empty.")
    
    if HAS_WERKZEUG:
        # Uses Werkzeug's secure hashing with automatic random salt
        return wz_gen_hash(password, method='scrypt')
    else:
        # Fallback to standard library PBKDF2-HMAC-SHA256 with 600,000 iterations
        salt = secrets.token_hex(16)
        kdf = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            PBKDF2_ITERATIONS
        )
        return f"pbkdf2:sha256:{PBKDF2_ITERATIONS}${salt}${kdf.hex()}"


def verify_password(password_hash: str, candidate_password: str) -> bool:
    """
    Timing-attack resistant verification of a candidate password against a stored hash.
    Uses constant-time comparison to prevent timing side-channel attacks.
    """
    if not password_hash or not candidate_password:
        return False
    
    if HAS_WERKZEUG and (password_hash.startswith('scrypt:') or password_hash.startswith('pbkdf2:')):
        try:
            return wz_check_hash(password_hash, candidate_password)
        except Exception:
            pass

    # Custom PBKDF2 fallback verification with constant-time comparison
    if password_hash.startswith("pbkdf2:sha256:"):
        try:
            parts = password_hash.split('$')
            if len(parts) == 3:
                header, salt, expected_hex = parts
                iterations = int(header.split(':')[2])
                actual_kdf = hashlib.pbkdf2_hmac(
                    'sha256',
                    candidate_password.encode('utf-8'),
                    salt.encode('utf-8'),
                    iterations
                )
                return secrets.compare_digest(actual_kdf.hex(), expected_hex)
        except Exception:
            return False

    return False


# ==========================================
# 2. SQL INJECTION PROTECTION UTILITIES
# ==========================================

def sanitize_identifier(name: str, allowed_set: Set[str], entity_type: str = "Identifier") -> str:
    """
    Protects against SQL injection in table and column identifiers.
    Validates that the identifier strictly matches alphanumeric format and is present in allowed_set.
    """
    if not name or not isinstance(name, str):
        raise ValueError(f"{entity_type} cannot be empty.")
    
    clean_name = name.strip()
    if not IDENTIFIER_REGEX.match(clean_name):
        raise ValueError(f"Security Alert: Invalid {entity_type} format '{clean_name}'.")
    
    if clean_name.lower() not in {s.lower() for s in allowed_set}:
        raise ValueError(f"Security Alert: {entity_type} '{clean_name}' is not in the permitted whitelist.")
    
    # Return matching casing from whitelist
    for item in allowed_set:
        if item.lower() == clean_name.lower():
            return item
    return clean_name


def escape_sql_like(term: str) -> str:
    """
    Escapes wildcard characters (%) and (_) and escape character (\\)
    to prevent LIKE wildcard injection in SQL queries.
    Use with: WHERE column LIKE ? ESCAPE '\\'
    """
    if not term:
        return ""
    # Escape backslash first, then % and _
    escaped = term.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
    return escaped


def check_sql_injection_attempt(query_str: str) -> bool:
    """
    Scans a string for suspicious SQL injection keywords and syntax.
    Useful for audit logging and preemptive defense.
    """
    if not query_str or not isinstance(query_str, str):
        return False
    return bool(DANGEROUS_SQL_PATTERNS.search(query_str))


# ==========================================
# 3. INPUT SANITIZATION & VALIDATION
# ==========================================

def sanitize_text(text: Optional[str], max_length: int = 500, allow_multiline: bool = False) -> str:
    """
    Sanitizes free-form text inputs:
    - Strips NULL bytes and control characters
    - Normalizes Unicode to NFC
    - Neutralizes HTML tags and scripts
    - Truncates to maximum allowed length
    """
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)

    # 1. Strip NULL bytes and control characters
    text = text.replace('\0', '')
    
    # 2. Normalize Unicode
    text = unicodedata.normalize('NFC', text)

    # 3. Filter non-printable characters (preserve newlines if multiline is allowed)
    cleaned_chars = []
    for ch in text:
        cat = unicodedata.category(ch)
        if cat.startswith('C'):
            # Control character
            if allow_multiline and ch in ('\n', '\r', '\t'):
                cleaned_chars.append(ch)
        else:
            cleaned_chars.append(ch)
    text = ''.join(cleaned_chars)

    # 4. Remove malicious script, iframe, active content tags
    text = DANGEROUS_HTML_TAGS.sub('', text)

    # 5. Remove inline event handlers (onerror=, onload=, onclick=, etc.)
    text = EVENT_HANDLER_REGEX.sub('', text)

    # 6. Remove javascript: pseudo-protocol
    text = JAVASCRIPT_URI_REGEX.sub('', text)

    # 7. Strip HTML tags from plain text inputs
    text = HTML_TAG_STRIPPER.sub('', text)

    # 8. HTML escape to safely neutralize any residual characters
    text = html.escape(text.strip(), quote=True)

    # 9. Truncate
    if len(text) > max_length:
        text = text[:max_length]

    return text


def sanitize_email(email: Optional[str]) -> str:
    """
    Sanitizes and strictly validates an email address.
    Returns normalized lowercase email or raises ValueError.
    """
    if not email or not isinstance(email, str):
        raise ValueError("Email address is required.")
    
    clean_email = email.strip().lower()
    clean_email = clean_email.replace('\0', '')
    
    if len(clean_email) > 254:
        raise ValueError("Email address exceeds maximum length of 254 characters.")
    
    if '..' in clean_email or clean_email.startswith('.') or clean_email.endswith('.'):
        raise ValueError("Invalid email address format.")

    if not EMAIL_REGEX.match(clean_email):
        raise ValueError("Invalid email address format.")
    
    return clean_email


def sanitize_phone(phone: Optional[str]) -> str:
    """
    Sanitizes and strictly validates an Indian mobile number.
    Extracts 10 digits and verifies it starts with 6, 7, 8, or 9.
    Returns normalized format: '+91 XXXXXXXXXX'
    """
    if not phone or not isinstance(phone, str):
        raise ValueError("Phone number is required.")
    
    # Extract only digits
    digits = re.sub(r'\D', '', phone)
    
    # Handle country code if included (e.g. 919876543210 -> 9876543210)
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    
    if not INDIAN_MOBILE_REGEX.match(digits):
        raise ValueError("Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.")
    
    return f"+91 {digits}"


def sanitize_profile_id(profile_id: Optional[str]) -> str:
    """
    Sanitizes a Matrimony Profile ID (e.g. 'p1', 'p-104', 'IY-2026-99').
    Must be alphanumeric with optional dashes and underscores.
    """
    if not profile_id or not isinstance(profile_id, str):
        raise ValueError("Profile ID is required.")
    
    clean_id = profile_id.strip()
    if not re.match(r'^[a-zA-Z0-9_\-]+$', clean_id) or len(clean_id) > 50:
        raise ValueError("Invalid Profile ID format. Only alphanumeric characters, dashes, and underscores allowed.")
    
    return clean_id


def sanitize_aadhaar(aadhaar: Optional[str], mask: bool = True) -> str:
    """
    Validates a 12-digit Indian Aadhaar number.
    If mask=True, masks the first 8 digits (e.g. 'XXXX-XXXX-1234') for privacy and security.
    """
    if not aadhaar:
        return ""
    digits = re.sub(r'\D', '', str(aadhaar))
    if len(digits) != 12:
        raise ValueError("Aadhaar number must contain exactly 12 digits.")
    
    if mask:
        return f"XXXX-XXXX-{digits[-4:]}"
    return digits


# ==========================================
# 4. CUSTOMER DATA ENCRYPTION (AES-256-GCM)
# ==========================================

_CUSTOMER_KEY_CACHE = None

def get_or_create_customer_key() -> bytes:
    """
    Retrieves or initializes a 256-bit (32 bytes) master encryption key.
    Checks environment variable CUSTOMER_DATA_KEY first (base64 encoded).
    Otherwise reads from or generates admin/customer_key.bin.
    """
    global _CUSTOMER_KEY_CACHE
    if _CUSTOMER_KEY_CACHE is not None:
        return _CUSTOMER_KEY_CACHE

    env_key = os.environ.get('CUSTOMER_DATA_KEY')
    if env_key:
        try:
            key_bytes = base64.b64decode(env_key)
            if len(key_bytes) == 32:
                _CUSTOMER_KEY_CACHE = key_bytes
                return key_bytes
        except Exception:
            pass

    key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'customer_key.bin')
    if os.path.exists(key_path):
        try:
            with open(key_path, 'rb') as f:
                key_bytes = f.read()
                if len(key_bytes) == 32:
                    _CUSTOMER_KEY_CACHE = key_bytes
                    return key_bytes
        except Exception:
            pass

    # Generate cryptographically secure 256-bit random key
    new_key = secrets.token_bytes(32)
    try:
        with open(key_path, 'wb') as f:
            f.write(new_key)
        try:
            os.chmod(key_path, 0o600)
        except Exception:
            pass
    except Exception as e:
        print(f"[-] Warning: Could not write customer_key.bin: {e}")

    _CUSTOMER_KEY_CACHE = new_key
    return new_key


def encrypt_customer_data(plaintext: Optional[str]) -> Optional[str]:
    """
    Encrypts sensitive customer Personally Identifiable Information (PII)
    (phone, email, native address) using AES-256-GCM authenticated encryption.
    Uses a fresh 96-bit (12 bytes) cryptographic nonce per encryption.
    Returns: 'enc:v1:<base64(nonce + tag + ciphertext)>'
    """
    if plaintext is None or plaintext == '':
        return plaintext
    if not isinstance(plaintext, str):
        plaintext = str(plaintext)

    # Do not double-encrypt if already ciphertext
    if plaintext.startswith('enc:v1:'):
        return plaintext

    if not HAS_AESGCM:
        return plaintext

    key = get_or_create_customer_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit random IV as per NIST SP 800-38D
    
    # Authenticated encryption (ciphertext includes GCM 128-bit authentication tag)
    encrypted_bytes = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
    payload = nonce + encrypted_bytes
    encoded = base64.urlsafe_b64encode(payload).decode('ascii')
    return f"enc:v1:{encoded}"


def decrypt_customer_data(ciphertext: Optional[str]) -> Optional[str]:
    """
    Decrypts AES-256-GCM customer data ciphertext.
    If the input is not encrypted (e.g. legacy plaintext or None),
    gracefully returns the original value.
    Guarantees timing-attack resistant integrity verification via GCM authentication tag.
    """
    if ciphertext is None or ciphertext == '':
        return ciphertext
    if not isinstance(ciphertext, str):
        return ciphertext

    # Legacy or unencrypted string
    if not ciphertext.startswith('enc:v1:'):
        return ciphertext

    if not HAS_AESGCM:
        return "[ENCRYPTED DATA: MISSING CRYPTO MODULE]"

    raw_b64 = ciphertext[len('enc:v1:'):]
    try:
        payload = base64.urlsafe_b64decode(raw_b64.encode('ascii'))
        if len(payload) < 28:  # 12-byte nonce + at least 16-byte GCM tag
            raise ValueError("Invalid encrypted payload size")
        
        nonce = payload[:12]
        encrypted_data = payload[12:]
        
        key = get_or_create_customer_key()
        aesgcm = AESGCM(key)
        decrypted_bytes = aesgcm.decrypt(nonce, encrypted_data, None)
        return decrypted_bytes.decode('utf-8')
    except Exception:
        # Tampered or corrupted data
        return "[ENCRYPTED: TAMPER/DECRYPT ERROR]"


def is_encrypted(value: Optional[str]) -> bool:
    """Returns True if the value is an AES-256 encrypted string."""
    return bool(value and isinstance(value, str) and value.startswith('enc:v1:'))


def mask_customer_phone(phone: Optional[str]) -> str:
    """Masks phone number for safe display (e.g. '+91 98*** ***90')."""
    if not phone:
        return ""
    decrypted = decrypt_customer_data(phone) or ""
    digits = re.sub(r'\D', '', decrypted)
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    if len(digits) == 10:
        return f"+91 {digits[:2]}*** ***{digits[-2:]}"
    elif len(digits) > 4:
        return f"{digits[:2]}*** ***{digits[-2:]}"
    return decrypted[:3] + "****" if len(decrypted) > 3 else "****"


def mask_customer_email(email: Optional[str]) -> str:
    """Masks email address for safe display (e.g. 'd***@example.com')."""
    if not email:
        return ""
    decrypted = decrypt_customer_data(email) or ""
    if '@' in decrypted:
        user, domain = decrypted.split('@', 1)
        masked_user = user[0] + '***' if user else '***'
        return f"{masked_user}@{domain}"
    return decrypted[:2] + "***"

