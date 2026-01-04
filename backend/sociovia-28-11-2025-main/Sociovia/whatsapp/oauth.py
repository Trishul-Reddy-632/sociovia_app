"""
Meta OAuth Integration for WhatsApp Business Account
====================================================
Phase-2 Part-1: Embedded Signup Flow

Handles Meta OAuth flow to connect WhatsApp Business Accounts.
"""

import os
import logging
import secrets
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from flask import session, request

from models import db
from .models import WhatsAppAccount
from .encryption import encrypt_token

logger = logging.getLogger(__name__)

# Meta OAuth Configuration
META_APP_ID = os.getenv("META_APP_ID")
META_APP_SECRET = os.getenv("META_APP_SECRET")
META_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v22.0")
META_OAUTH_BASE = "https://www.facebook.com/v22.0/dialog/oauth"
META_TOKEN_EXCHANGE = f"https://graph.facebook.com/{META_API_VERSION}/oauth/access_token"
META_GRAPH_API = f"https://graph.facebook.com/{META_API_VERSION}"

# Required scopes for WhatsApp Business
REQUIRED_SCOPES = [
    "whatsapp_business_messaging",
    "whatsapp_business_management",
    "business_management",
]


def get_redirect_uri() -> str:
    """Get OAuth callback URL."""
    app_base = os.getenv("APP_BASE_URL", "http://localhost:5000")
    return f"{app_base}/api/whatsapp/connect/callback"


def generate_state() -> str:
    """Generate a random state token for OAuth security."""
    return secrets.token_urlsafe(32)


def get_oauth_url(workspace_id: str, user_id: str) -> Dict[str, Any]:
    """
    Generate Meta OAuth URL for Embedded Signup.
    
    Args:
        workspace_id: Workspace ID to associate account with
        user_id: User ID who is connecting the account
        
    Returns:
        Dict with auth_url and state
    """
    if not META_APP_ID:
        raise ValueError("META_APP_ID environment variable not set")
    
    state = generate_state()
    
    # Store state in session for verification
    session[f"wa_oauth_state_{workspace_id}"] = state
    session[f"wa_oauth_workspace_{state}"] = workspace_id
    session[f"wa_oauth_user_{state}"] = user_id
    
    params = {
        "client_id": META_APP_ID,
        "redirect_uri": get_redirect_uri(),
        "state": state,
        "scope": ",".join(REQUIRED_SCOPES),
        "response_type": "code",
    }
    
    auth_url = f"{META_OAUTH_BASE}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    
    return {
        "auth_url": auth_url,
        "state": state,
    }


def exchange_code_for_token(code: str, state: str) -> Dict[str, Any]:
    """
    Exchange authorization code for access token.
    
    Args:
        code: Authorization code from Meta
        state: State token for verification
        
    Returns:
        Dict with access_token, token_type, expires_in
    """
    if not META_APP_SECRET:
        raise ValueError("META_APP_SECRET environment variable not set")
    
    # Verify state
    workspace_id = session.get(f"wa_oauth_workspace_{state}")
    user_id = session.get(f"wa_oauth_user_{state}")
    
    if not workspace_id or not user_id:
        raise ValueError("Invalid or expired OAuth state")
    
    # Exchange code for token
    params = {
        "client_id": META_APP_ID,
        "client_secret": META_APP_SECRET,
        "redirect_uri": get_redirect_uri(),
        "code": code,
    }
    
    response = requests.get(META_TOKEN_EXCHANGE, params=params, timeout=30)
    response.raise_for_status()
    
    token_data = response.json()
    
    if "error" in token_data:
        raise ValueError(f"Token exchange failed: {token_data['error']}")
    
    access_token = token_data.get("access_token")
    expires_in = token_data.get("expires_in")  # Seconds
    
    if not access_token:
        raise ValueError("No access token in response")
    
    # Calculate expiration
    expires_at = None
    if expires_in:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    return {
        "access_token": access_token,
        "token_type": token_data.get("token_type", "bearer"),
        "expires_in": expires_in,
        "expires_at": expires_at,
        "workspace_id": workspace_id,
        "user_id": user_id,
    }


def fetch_waba_info(access_token: str) -> Dict[str, Any]:
    """
    Fetch WhatsApp Business Account information from Meta.
    
    Args:
        access_token: Meta access token
        
    Returns:
        Dict with waba_id, phone_numbers, business_name
    """
    # Get WABAs for this token
    url = f"{META_GRAPH_API}/me/businesses"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    
    businesses = response.json().get("data", [])
    
    if not businesses:
        raise ValueError("No WhatsApp Business Accounts found")
    
    # Get first WABA (or allow selection later)
    business_id = businesses[0]["id"]
    
    # Get WABA details
    waba_url = f"{META_GRAPH_API}/{business_id}"
    waba_response = requests.get(waba_url, headers=headers, params={"fields": "id,name"}, timeout=30)
    waba_response.raise_for_status()
    waba_data = waba_response.json()
    
    # Get phone numbers
    phone_url = f"{META_GRAPH_API}/{business_id}/owned_phone_numbers"
    phone_response = requests.get(phone_url, headers=headers, timeout=30)
    phone_response.raise_for_status()
    phone_numbers = phone_response.json().get("data", [])
    
    if not phone_numbers:
        raise ValueError("No phone numbers found in WABA")
    
    # Use first phone number
    phone_data = phone_numbers[0]
    
    return {
        "waba_id": business_id,
        "waba_name": waba_data.get("name", "Unknown"),
        "phone_number_id": phone_data.get("id"),
        "display_phone_number": phone_data.get("display_phone_number"),
        "verified_name": phone_data.get("verified_name"),
    }


def save_whatsapp_account(
    workspace_id: str,
    user_id: str,
    access_token: str,
    token_expires_at: Optional[datetime],
    waba_info: Dict[str, Any],
) -> WhatsAppAccount:
    """
    Save or update WhatsApp account in database.
    
    Args:
        workspace_id: Workspace ID
        user_id: User ID who connected
        access_token: Access token (will be encrypted)
        token_expires_at: Token expiration
        waba_info: WABA information from Meta
        
    Returns:
        WhatsAppAccount instance
    """
    # Check if account already exists
    account = WhatsAppAccount.query.filter_by(
        workspace_id=workspace_id,
        waba_id=waba_info["waba_id"],
        phone_number_id=waba_info["phone_number_id"],
    ).first()
    
    if account:
        # Update existing account
        account.set_access_token(access_token, "permanent", token_expires_at)
        account.connected_by_user_id = user_id
        account.display_phone_number = waba_info.get("display_phone_number")
        account.verified_name = waba_info.get("waba_name")
        account.last_synced_at = datetime.now(timezone.utc)
        account.is_active = True
    else:
        # Create new account
        account = WhatsAppAccount(
            workspace_id=workspace_id,
            waba_id=waba_info["waba_id"],
            phone_number_id=waba_info["phone_number_id"],
            display_phone_number=waba_info.get("display_phone_number"),
            verified_name=waba_info.get("waba_name"),
            connected_by_user_id=user_id,
            is_active=True,
        )
        account.set_access_token(access_token, "permanent", token_expires_at)
        account.last_synced_at = datetime.now(timezone.utc)
        db.session.add(account)
    
    db.session.commit()
    
    logger.info(f"Saved WhatsApp account: WABA {waba_info['waba_id']} for workspace {workspace_id}")
    
    return account

