#!/usr/bin/env python3
"""
WhatsApp Flows Setup Checker & Publisher (Database Version)
============================================================
Uses the permanent token from your database (WhatsAppAccount table)
instead of the .env temporary token.

Run: python check_whatsapp_flows.py
"""

import os
import sys
import json
import requests
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load environment for database connection
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# API Configuration
API_VERSION = "v18.0"
BASE_URL = f"https://graph.facebook.com/{API_VERSION}"


def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def print_status(label, value, success=True):
    icon = "✅" if success else "❌"
    print(f"  {icon} {label}: {value}")


def decrypt_token_simple(encrypted_token):
    """Decrypt token using the same encryption as the app."""
    if not encrypted_token:
        return None
    
    try:
        # Use the same encryption key derivation as the app
        import base64
        from cryptography.fernet import Fernet
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        
        key_str = os.getenv("WHATSAPP_ENCRYPTION_KEY")
        
        if not key_str:
            # Development fallback - generate from SECRET_KEY (same as encryption.py)
            secret = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'sociovia_wa_salt',  # Fixed salt for consistency
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))
        else:
            # Use provided key
            try:
                key = base64.urlsafe_b64decode(key_str.encode())
            except Exception:
                key = base64.urlsafe_b64encode(key_str.encode()[:32].ljust(32, b'0'))
        
        fernet = Fernet(key)
        decrypted = fernet.decrypt(encrypted_token.encode())
        return decrypted.decode()
    except ImportError as e:
        print(f"  ⚠️  Missing cryptography library: {e}")
        print("     Run: pip install cryptography")
        return None
    except Exception as e:
        print(f"  ⚠️  Decryption error: {e}")
        return None



def get_account_from_database():
    """Get WhatsApp account with permanent token from database using direct SQL."""
    print_header("1. Loading Account from Database")
    
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        # Get database URL from env
        db_url = os.getenv("SQLALCHEMY_DATABASE_URI", "")
        if not db_url:
            print_status("Database", "SQLALCHEMY_DATABASE_URI not set in .env!", False)
            return None
        
        # Parse connection string
        # Format: postgresql://user:pass@host:port/dbname
        import re
        match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_url)
        if not match:
            print_status("Database URL", "Could not parse database URL!", False)
            return None
        
        user, password, host, port, dbname = match.groups()
        
        # Connect to database
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=dbname,
            user=user,
            password=password
        )
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get active WhatsApp accounts
        cursor.execute("""
            SELECT id, workspace_id, waba_id, phone_number_id, display_phone_number, 
                   verified_name, token_type, access_token_encrypted, is_active
            FROM whatsapp_accounts 
            WHERE is_active = true
            ORDER BY id DESC
        """)
        
        accounts = cursor.fetchall()
        
        if not accounts:
            print_status("Database", "No active WhatsApp accounts found!", False)
            conn.close()
            return None
        
        print(f"  Found {len(accounts)} active account(s):\n")
        
        for i, acc in enumerate(accounts):
            encrypted_token = acc.get('access_token_encrypted', '')
            token = decrypt_token_simple(encrypted_token) if encrypted_token else None
            token_preview = f"{token[:30]}..." if token and len(token) > 30 else (token or "No token")
            
            print(f"    {i+1}. {acc.get('display_phone_number') or acc.get('phone_number_id')}")
            print(f"       WABA ID: {acc.get('waba_id')}")
            print(f"       Phone Number ID: {acc.get('phone_number_id')}")
            print(f"       Token Type: {acc.get('token_type')}")
            print(f"       Token: {token_preview}")
            print(f"       Verified Name: {acc.get('verified_name')}")
            print()
        
        # Select account
        if len(accounts) == 1:
            selected = accounts[0]
        else:
            choice = input(f"  Select account number (1-{len(accounts)}): ").strip()
            try:
                selected = accounts[int(choice) - 1]
            except (ValueError, IndexError):
                print("  Invalid selection, using first account.")
                selected = accounts[0]
        
        # Decrypt token
        encrypted_token = selected.get('access_token_encrypted', '')
        token = decrypt_token_simple(encrypted_token) if encrypted_token else None
        
        if not token:
            print_status("Token", "Could not decrypt token!", False)
            conn.close()
            return None
        
        print_status("Selected Account", selected.get('display_phone_number') or selected.get('phone_number_id'), True)
        print_status("Token Type", selected.get('token_type'), selected.get('token_type') == "permanent")
        
        conn.close()
        
        return {
            "access_token": token,
            "phone_number_id": selected.get('phone_number_id'),
            "waba_id": selected.get('waba_id'),
            "display_phone_number": selected.get('display_phone_number'),
        }
    
    except ImportError:
        print_status("Database", "psycopg2 not installed. Run: pip install psycopg2-binary", False)
        return None
    except Exception as e:
        print_status("Database Error", str(e), False)
        import traceback
        traceback.print_exc()
        return None


def check_token_validity(access_token):
    """Check if the access token is valid."""
    print_header("2. Token Validity Check")
    
    url = f"{BASE_URL}/debug_token?input_token={access_token}&access_token={access_token}"
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        
        if "data" in data:
            token_data = data["data"]
            is_valid = token_data.get("is_valid", False)
            app_id = token_data.get("app_id", "unknown")
            expires_at = token_data.get("expires_at", 0)
            scopes = token_data.get("scopes", [])
            
            print_status("Token Valid", str(is_valid), is_valid)
            print_status("App ID", app_id, True)
            
            if expires_at == 0:
                print_status("Expires", "Never (Permanent Token)", True)
            elif expires_at:
                exp_date = datetime.fromtimestamp(expires_at)
                is_future = exp_date > datetime.now()
                print_status("Expires", str(exp_date), is_future)
            
            if scopes:
                print(f"  📋 Scopes: {', '.join(scopes[:5])}{'...' if len(scopes) > 5 else ''}")
            
            return is_valid
        else:
            error = data.get("error", {}).get("message", "Unknown error")
            print_status("Token Check", f"Failed: {error}", False)
            return False
    except Exception as e:
        print_status("Token Check", f"Error: {e}", False)
        return False


def check_waba_info(access_token, waba_id):
    """Get WABA information including capabilities."""
    print_header("3. WABA Information")
    
    url = f"{BASE_URL}/{waba_id}?fields=id,name,currency,timezone_id,message_template_namespace"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        data = resp.json()
        
        if "error" in data:
            print_status("WABA Info", f"Error: {data['error'].get('message', 'Unknown')}", False)
            return False
        
        print_status("WABA Name", data.get("name", "Unknown"), True)
        print_status("WABA ID", data.get("id", waba_id), True)
        print_status("Currency", data.get("currency", "Unknown"), True)
        
        return True
    except Exception as e:
        print_status("WABA Info", f"Error: {e}", False)
        return False


def list_flows(access_token, waba_id):
    """List all flows in the WABA."""
    print_header("4. Existing Flows on Meta")
    
    url = f"{BASE_URL}/{waba_id}/flows?fields=id,name,status,categories"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        data = resp.json()
        
        if "error" in data:
            error_msg = data['error'].get('message', 'Unknown')
            error_code = data['error'].get('code', 0)
            
            if error_code == 100 or "does not have permission" in error_msg.lower():
                print_status("Flows Capability", "NOT ENABLED for this WABA!", False)
                print("\n  ⚠️  Your WABA doesn't have Flows enabled yet.")
                print("     This feature requires approval from Meta.")
                print("     Contact Meta Business Support to enable Flows.\n")
            else:
                print_status("Flows List", f"Error: {error_msg}", False)
            return []
        
        flows = data.get("data", [])
        
        if not flows:
            print("  📭 No flows found on Meta. Create your first flow!")
        else:
            print(f"  Found {len(flows)} flow(s):\n")
            for flow in flows:
                status = flow.get("status", "UNKNOWN")
                status_icon = "🟢" if status == "PUBLISHED" else "🟡" if status == "DRAFT" else "⚪"
                print(f"    {status_icon} ID: {flow.get('id')}")
                print(f"       Name: {flow.get('name')}")
                print(f"       Status: {status}")
                print(f"       Categories: {flow.get('categories', [])}")
                print()
        
        return flows
    except Exception as e:
        print_status("Flows List", f"Error: {e}", False)
        return []


def create_sample_flow(access_token, waba_id):
    """Create a sample flow on Meta."""
    print_header("5. Create Sample Flow")
    
    print("  Creating a simple lead capture flow...")
    
    url = f"{BASE_URL}/{waba_id}/flows"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    flow_name = f"lead_capture_{int(__import__('time').time())}"
    
    data = {
        "name": flow_name,
        "categories": ["LEAD_GENERATION"]
    }
    
    try:
        resp = requests.post(url, headers=headers, json=data, timeout=15)
        result = resp.json()
        
        if "error" in result:
            error_msg = result['error'].get('message', 'Unknown')
            print_status("Create Flow", f"Error: {error_msg}", False)
            
            if "permission" in error_msg.lower() or "flows" in error_msg.lower():
                print("\n  ⚠️  Your WABA doesn't have Flows capability enabled.")
                print("     Contact Meta Business Support to request access.\n")
            
            return None
        
        flow_id = result.get("id")
        print_status("Flow Created", f"ID: {flow_id}", True)
        print_status("Flow Name", flow_name, True)
        
        return flow_id
    except Exception as e:
        print_status("Create Flow", f"Error: {e}", False)
        return None


def upload_flow_json(access_token, flow_id):
    """Upload flow JSON to the created flow."""
    print_header("6. Upload Flow JSON")
    
    # Simple flow JSON
    flow_json = {
        "version": "5.0",
        "screens": [
            {
                "id": "WELCOME",
                "title": "Quick Survey",
                "terminal": True,
                "layout": {
                    "type": "SingleColumnLayout",
                    "children": [
                        {"type": "TextHeading", "text": "Welcome! 👋"},
                        {"type": "TextBody", "text": "Please share your details:"},
                        {
                            "type": "TextInput",
                            "name": "full_name",
                            "label": "Your Name",
                            "input-type": "text",
                            "required": True
                        },
                        {
                            "type": "TextInput",
                            "name": "email",
                            "label": "Email",
                            "input-type": "email",
                            "required": True
                        },
                        {
                            "type": "Footer",
                            "label": "Submit",
                            "on-click-action": {
                                "name": "complete",
                                "payload": {
                                    "full_name": "${form.full_name}",
                                    "email": "${form.email}"
                                }
                            }
                        }
                    ]
                }
            }
        ],
        "routing_model": {}
    }
    
    url = f"{BASE_URL}/{flow_id}/assets"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Create the multipart form data
    files = {
        'file': ('flow.json', json.dumps(flow_json), 'application/json')
    }
    data = {
        'name': 'flow.json',
        'asset_type': 'FLOW_JSON'
    }
    
    try:
        resp = requests.post(url, headers=headers, files=files, data=data, timeout=15)
        result = resp.json()
        
        if "error" in result:
            print_status("Upload JSON", f"Error: {result['error'].get('message', 'Unknown')}", False)
            return False
        
        print_status("Flow JSON Uploaded", "Success!", True)
        return True
    except Exception as e:
        print_status("Upload JSON", f"Error: {e}", False)
        return False


def publish_flow(access_token, flow_id):
    """Publish the flow."""
    print_header("7. Publish Flow")
    
    url = f"{BASE_URL}/{flow_id}/publish"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        resp = requests.post(url, headers=headers, timeout=15)
        result = resp.json()
        
        if "error" in result:
            print_status("Publish", f"Error: {result['error'].get('message', 'Unknown')}", False)
            return False
        
        if result.get("success"):
            print_status("Flow Published", "Success! ✨", True)
            print(f"\n  🎉 Your flow is now LIVE on Meta!")
            print(f"     Flow ID: {flow_id}")
            print(f"\n  Use this ID to send the flow to users.")
            return True
        else:
            print_status("Publish", "Unknown response", False)
            return False
    except Exception as e:
        print_status("Publish", f"Error: {e}", False)
        return False


def send_flow_to_user(access_token, phone_number_id, flow_id, recipient_phone, is_draft=False):
    """Send the flow to a test number."""
    print_header("8. Send Flow to User")
    
    if is_draft:
        print("  ℹ️  Sending DRAFT flow (testing mode)...")
    
    url = f"{BASE_URL}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Build flow parameters
    flow_params = {
        "flow_message_version": "3",
        "flow_token": f"test_{recipient_phone}_{flow_id}",
        "flow_id": flow_id,
        "flow_cta": "Start Survey",
        "flow_action": "navigate",
        "flow_action_payload": {
            "screen": "WELCOME"
        }
    }
    
    # Add draft mode for unpublished flows
    if is_draft:
        flow_params["mode"] = "draft"
    
    data = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": recipient_phone,
        "type": "interactive",
        "interactive": {
            "type": "flow",
            "header": {
                "type": "text",
                "text": "Quick Survey"
            },
            "body": {
                "text": "Please take a moment to fill out this quick survey!"
            },
            "footer": {
                "text": "Takes only 30 seconds"
            },
            "action": {
                "name": "flow",
                "parameters": flow_params
            }
        }
    }
    
    try:
        resp = requests.post(url, headers=headers, json=data, timeout=15)
        result = resp.json()
        
        if "error" in result:
            error_msg = result['error'].get('message', 'Unknown')
            print_status("Send Flow", f"Error: {error_msg}", False)
            
            if "24 hour" in error_msg.lower() or "window" in error_msg.lower():
                print("\n  ⚠️  The user must message you first to open the 24hr window.")
                print("     Ask them to send 'Hi' to your WhatsApp number, then try again.")
            
            return False
        
        msg_id = result.get("messages", [{}])[0].get("id", "Unknown")
        print_status("Flow Sent", f"Message ID: {msg_id}", True)
        print(f"\n  📱 Flow sent to {recipient_phone}!")
        print("     Check WhatsApp on that phone to see the flow!")
        return True
    except Exception as e:
        print_status("Send Flow", f"Error: {e}", False)
        return False


def main():
    print("\n" + "🔧 " * 20)
    print("  WhatsApp Flows Setup Checker (Database Version)")
    print("🔧 " * 20)
    
    # Step 1: Get account from database
    account_config = get_account_from_database()
    if not account_config:
        print("\n❌ Could not load account from database.")
        print("   Make sure you have a WhatsApp account connected with a permanent token.")
        return
    
    access_token = account_config["access_token"]
    phone_number_id = account_config["phone_number_id"]
    waba_id = account_config["waba_id"]
    
    # Step 2: Check token
    token_valid = check_token_validity(access_token)
    if not token_valid:
        print("\n⚠️  Token validation failed. The token might still work for API calls.")
    
    # Step 3: Check WABA
    check_waba_info(access_token, waba_id)
    
    # Step 4: List flows
    flows = list_flows(access_token, waba_id)
    
    # Ask user what to do next
    print_header("What would you like to do?")
    print("  1. Create and publish a new test flow")
    print("  2. Send an existing flow to a phone number")
    print("  3. Just check configuration (done)")
    print("  4. Exit")
    
    choice = input("\nEnter choice (1-4): ").strip()
    
    if choice == "1":
        flow_id = create_sample_flow(access_token, waba_id)
        if flow_id:
            if upload_flow_json(access_token, flow_id):
                if publish_flow(access_token, flow_id):
                    send_choice = input("\nWould you like to send this flow? (y/n): ").strip().lower()
                    if send_choice == "y":
                        phone = input("Enter phone number (with country code, e.g., 919876543210): ").strip()
                        send_flow_to_user(access_token, phone_number_id, flow_id, phone)
    
    elif choice == "2":
        if not flows:
            print("\n❌ No flows found on Meta. Create one first (option 1).")
        else:
            print("\nAvailable flows:")
            for i, flow in enumerate(flows):
                print(f"  {i+1}. {flow.get('name')} (ID: {flow.get('id')}, Status: {flow.get('status')})")
            
            flow_idx = input("\nEnter flow number: ").strip()
            try:
                selected_flow = flows[int(flow_idx) - 1]
                
                if selected_flow.get("status") != "PUBLISHED":
                    print("\n⚠️  This flow is in DRAFT mode (not published).")
                    print("   For test accounts, you can still try sending it.")
                    confirm = input("   Try sending anyway? (y/n): ").strip().lower()
                    if confirm != "y":
                        print("   Cancelled.")
                    else:
                        phone = input("Enter phone number (with country code, e.g., 919876543210): ").strip()
                        send_flow_to_user(access_token, phone_number_id, selected_flow.get("id"), phone, is_draft=True)
                else:
                    phone = input("Enter phone number (with country code, e.g., 919876543210): ").strip()
                    send_flow_to_user(access_token, phone_number_id, selected_flow.get("id"), phone)
            except (ValueError, IndexError):
                print("Invalid selection.")
    
    elif choice == "3":
        print("\n✅ Configuration check complete!")
    
    print("\n" + "="*60)
    print("  Done! 🎉")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
