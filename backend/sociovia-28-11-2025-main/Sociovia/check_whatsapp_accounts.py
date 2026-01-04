"""
Check WhatsApp accounts in database to see workspace linking.
Run this from the backend folder:
  python check_whatsapp_accounts.py
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from whatsapp.models import WhatsAppAccount, WhatsAppConversation, WhatsAppMessage
from models import db

with app.app_context():
    print("\n" + "="*70)
    print("WhatsApp Accounts in Database")
    print("="*70)
    
    accounts = WhatsAppAccount.query.all()
    
    if not accounts:
        print("\n❌ No WhatsApp accounts found in database!")
    else:
        print(f"\nFound {len(accounts)} WhatsApp account(s):\n")
        for acc in accounts:
            print(f"  ID: {acc.id}")
            print(f"  Phone: {acc.display_phone_number}")
            print(f"  WABA ID: {acc.waba_id}")
            print(f"  Phone Number ID: {acc.phone_number_id}")
            print(f"  Workspace ID: {acc.workspace_id or 'NOT SET (❌ Problem!)'}")
            print(f"  Is Active: {acc.is_active}")
            print(f"  Verified Name: {acc.verified_name}")
            print(f"  Custom Name: {acc.custom_name}")
            print(f"  Created At: {acc.created_at}")
            print("-" * 50)
    
    print("\n" + "="*70)
    print("Conversations by Account")
    print("="*70)
    
    for acc in accounts:
        conv_count = WhatsAppConversation.query.filter_by(account_id=acc.id).count()
        msg_count = db.session.query(WhatsAppMessage).join(
            WhatsAppConversation
        ).filter(
            WhatsAppConversation.account_id == acc.id
        ).count()
        print(f"\nAccount {acc.display_phone_number} (ID: {acc.id}, Workspace: {acc.workspace_id}):")
        print(f"  - Conversations: {conv_count}")
        print(f"  - Messages: {msg_count}")
    
    print("\n" + "="*70)
    print("DIAGNOSIS")
    print("="*70)
    
    # Check for accounts without workspace_id
    no_workspace = [a for a in accounts if not a.workspace_id]
    if no_workspace:
        print("\n⚠️  PROBLEM: Some accounts have no workspace_id set!")
        print("   This means they will show up for ALL workspaces.")
        for a in no_workspace:
            print(f"   - {a.display_phone_number} (ID: {a.id})")
        print("\n   FIX: Delete these accounts and reconnect them from a specific workspace.")
    else:
        print("\n✅ All accounts have workspace_id set.")
        
        # Show workspace breakdown
        print("\n   Workspace breakdown:")
        workspace_accounts = {}
        for a in accounts:
            ws = a.workspace_id
            if ws not in workspace_accounts:
                workspace_accounts[ws] = []
            workspace_accounts[ws].append(a)
        
        for ws, accs in workspace_accounts.items():
            print(f"   - Workspace {ws}: {len(accs)} account(s)")
            for a in accs:
                print(f"       • {a.display_phone_number}")
    
    print("\n")
