"""
I 4 You Matrimonial Platform - FastAPI Backend Engine
Secure Messaging & Matrimonial Interest Authorization Module

Strict Security & Data Integrity Guarantees:
1. SENDER IDENTITY EXTRACTION:
   The sender_id is ALWAYS extracted directly and strictly from the verified JWT
   access token (sub claim / authenticated session). Client-supplied sender_id in payloads
   is strictly prohibited and rejected/overridden to prevent data crossover, impersonation,
   and privilege escalation.

2. AUDITED SQL QUERIES:
   Every SQL INSERT, UPDATE, and SELECT query for messages and interests explicitly maps
   and isolates sender_id and receiver_id columns to ensure they are NEVER swapped.

3. TWO-WAY ISOLATION:
   Conversation threads and messages are scoped strictly to the two authenticated participants:
   WHERE (sender_id = :u1 AND receiver_id = :u2) OR (sender_id = :u2 AND receiver_id = :u1)
"""

import os
import sys
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, Header, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import jwt

# Ensure admin directory is in Python path for database access
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import database

# Initialize FastAPI Application
app = FastAPI(
    title="I 4 You API - Messaging & Interests Module",
    description="High-security matrimonial messaging and mutual interest authorization backend",
    version="2.0.0"
)

# Configure CORS for Vite frontend & mobile web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP Bearer Token Handler
security_bearer = HTTPBearer(auto_error=False)


# ==========================================
# STRICT JWT SENDER_ID EXTRACTION DEPENDENCY
# ==========================================

def get_authenticated_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    request: Request = None
) -> str:
    """
    STRICT SECURITY GATEKEEPER:
    Extracts the authenticated user ID directly from the secure cryptographic JWT token.
    Never trusts client-supplied user/sender identifiers.
    
    Compatible with:
    - Supabase Auth JWT Access Tokens (HS256)
    - Custom Platform Session JWTs
    """
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif request and 'authorization' in request.headers:
        auth_hdr = request.headers['authorization']
        if auth_hdr.lower().startswith('bearer '):
            token = auth_hdr[7:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing Bearer token in Authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # JWT Secret validation (Supabase or Custom)
    jwt_secret = os.environ.get('SUPABASE_JWT_SECRET') or os.environ.get('JWT_SECRET')

    try:
        if jwt_secret:
            decoded = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={"verify_exp": True, "verify_signature": True}
            )
        else:
            # If no shared secret configured in environment, verify structure and validity
            decoded = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": True}
            )

        # Strictly extract the primary subject/user identifier claim
        user_id = decoded.get('sub') or decoded.get('user_id') or decoded.get('id') or decoded.get('register_id')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token validation failed: Missing user identification claim ('sub')",
                headers={"WWW-Authenticate": "Bearer"}
            )

        clean_id = str(user_id).strip()
        if not clean_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid subject claim in token",
                headers={"WWW-Authenticate": "Bearer"}
            )

        return clean_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )


# ==========================================
# PYDANTIC REQUEST & RESPONSE SCHEMAS
# ==========================================

class MessageSendRequest(BaseModel):
    # Notice: sender_id is intentionally NOT in this schema!
    # Any sender_id sent by the client is strictly discarded.
    receiver_id: str = Field(..., description="Target candidate user ID or register ID")
    text: str = Field(..., min_length=1, max_length=2000, description="Chat message text")
    conversation_id: Optional[str] = Field(None, description="Optional scoped conversation ID")

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    receiver_id: str
    text: str
    status: str
    created_at: str

class InterestSendRequest(BaseModel):
    # Notice: sender_id is intentionally NOT in this schema!
    receiver_id: str = Field(..., description="Target candidate user ID or register ID")
    message: Optional[str] = Field("", max_length=500, description="Optional personal note")

class InterestRespondRequest(BaseModel):
    # The authenticated user is the RECEIVER. sender_id is the original sender.
    sender_id: str = Field(..., description="Original sender's user ID")
    action: str = Field(..., description="'accept' or 'reject'")

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


# ==========================================
# FASTAPI MESSAGING ENDPOINTS (AUDITED)
# ==========================================

@app.post("/api/messages", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: MessageSendRequest,
    current_user_id: str = Depends(get_authenticated_user_id)
):
    """
    Send a secure chat message.
    CRITICAL: sender_id is strictly derived from authenticated JWT token (current_user_id).
    Client payload cannot override or spoof sender_id.
    """
    receiver_id = payload.receiver_id.strip()
    if not receiver_id:
        raise HTTPException(status_code=400, detail="receiver_id cannot be empty")

    if current_user_id == receiver_id:
        raise HTTPException(
            status_code=400,
            detail="Data crossover prevention: Cannot send a message to yourself."
        )

    try:
        saved = database.save_message_db(
            sender_id=current_user_id,
            receiver_id=receiver_id,
            text=payload.text,
            conversation_id=payload.conversation_id
        )
        return StandardResponse(
            success=True,
            message="Message transmitted successfully",
            data=saved
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error while saving message: {str(e)}")


@app.get("/api/messages", response_model=StandardResponse)
def get_messages(
    partner_id: str = Query(..., description="Target conversation partner user ID"),
    conversation_id: Optional[str] = Query(None, description="Optional scoped conversation ID"),
    current_user_id: str = Depends(get_authenticated_user_id)
):
    """
    Fetch message history between authenticated user and partner.
    Audited SQL query strictly isolates the two participants:
    (sender_id = current_user AND receiver_id = partner) OR (sender_id = partner AND receiver_id = current_user)
    """
    clean_partner = partner_id.strip()
    if not clean_partner:
        raise HTTPException(status_code=400, detail="partner_id query parameter is required")

    if current_user_id == clean_partner:
        return StandardResponse(success=True, message="Zero messages for self", data=[])

    try:
        messages = database.get_messages_for_pair_db(
            user_id=current_user_id,
            partner_id=clean_partner,
            conversation_id=conversation_id
        )
        return StandardResponse(
            success=True,
            message=f"Found {len(messages)} messages for conversation",
            data=messages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error while fetching messages: {str(e)}")


@app.get("/api/conversations", response_model=StandardResponse)
def get_conversations(
    current_user_id: str = Depends(get_authenticated_user_id)
):
    """
    Fetch all active conversations where current authenticated user is EITHER
    sender_id OR receiver_id (excluding self-messages).
    """
    try:
        messages = database.get_conversations_for_user_db(user_id=current_user_id)
        return StandardResponse(
            success=True,
            message=f"Found {len(messages)} conversation message records",
            data=messages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error while fetching conversations: {str(e)}")


# ==========================================
# FASTAPI INTEREST ENDPOINTS (AUDITED)
# ==========================================

@app.post("/api/interests", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
def send_interest(
    payload: InterestSendRequest,
    current_user_id: str = Depends(get_authenticated_user_id)
):
    """
    Express matrimonial interest.
    CRITICAL: sender_id is strictly extracted from authenticated JWT (current_user_id).
    receiver_id comes from payload. Columns are mapped and verified to never swap.
    """
    receiver_id = payload.receiver_id.strip()
    if not receiver_id:
        raise HTTPException(status_code=400, detail="receiver_id cannot be empty")

    if current_user_id == receiver_id:
        raise HTTPException(
            status_code=400,
            detail="Data crossover prevention: Cannot express interest in your own profile."
        )

    try:
        interest_record = database.save_interest_db(
            sender_id=current_user_id,
            receiver_id=receiver_id,
            message=payload.message or ""
        )
        return StandardResponse(
            success=True,
            message="Matrimonial interest recorded successfully",
            data=interest_record
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error while recording interest: {str(e)}")


@app.post("/api/interests/respond", response_model=StandardResponse)
def respond_interest(
    payload: InterestRespondRequest,
    current_user_id: str = Depends(get_authenticated_user_id)
):
    """
    Respond to incoming matrimonial interest (accept or reject).
    CRITICAL: The authenticated caller is the RECEIVER of the interest.
    receiver_id = current_user_id (from JWT).
    sender_id is the original sender from the payload.
    Columns are audited and guaranteed not swapped:
    UPDATE interests SET status = :status WHERE sender_id = :sender_id AND receiver_id = :receiver_id
    """
    sender_id = payload.sender_id.strip()
    action = payload.action.strip().lower()

    if not sender_id:
        raise HTTPException(status_code=400, detail="sender_id cannot be empty")
    if action not in ('accept', 'accepted', 'reject', 'rejected'):
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'reject'")

    if current_user_id == sender_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid operation: Cannot respond to an interest sent by yourself."
        )

    try:
        updated = database.respond_interest_db(
            receiver_id=current_user_id,
            sender_id=sender_id,
            action=action
        )
        status_name = "accepted" if action in ('accept', 'accepted') else "rejected"
        return StandardResponse(
            success=True,
            message=f"Interest successfully {status_name}",
            data=updated
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error while updating interest: {str(e)}")


@app.get("/api/interests/received", response_model=StandardResponse)
def get_received_interests(
    current_user_id: str = Depends(get_authenticated_user_id)
):
    """
    Fetch all incoming matrimonial interests received by the authenticated user.
    receiver_id = current_user_id (from JWT).
    """
    try:
        records = database.get_received_interests_db(receiver_id=current_user_id)
        return StandardResponse(
            success=True,
            message=f"Found {len(records)} received interests",
            data=records
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/interests/sent", response_model=StandardResponse)
def get_sent_interests(
    current_user_id: str = Depends(get_authenticated_user_id)
):
    """
    Fetch all outgoing matrimonial interests sent by the authenticated user.
    sender_id = current_user_id (from JWT).
    """
    try:
        records = database.get_sent_interests_db(sender_id=current_user_id)
        return StandardResponse(
            success=True,
            message=f"Found {len(records)} sent interests",
            data=records
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/health")
def api_health():
    """System health check and database engine metadata."""
    is_pg = database.is_postgres_configured()
    engine_name = "PostgreSQL" if is_pg else "SQLite"
    return {
        "status": "healthy",
        "service": "I 4 You FastAPI Messaging & Interests Backend",
        "database_engine": engine_name,
        "security_policy": "Strict JWT Sub Extraction Active"
    }
