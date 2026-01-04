"""
Delete orphan WhatsApp account with cascade.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from whatsapp.models import WhatsAppAccount, WhatsAppConversation, WhatsAppMessage
from models import db

with app.app_context():
    # Find the account
    acc = WhatsAppAccount.query.filter_by(id=4).first()
    
    if not acc:
        print("Account ID=4 not found!")
        sys.exit(0)
    
    print(f"Found account: {acc.display_phone_number} (workspace_id={acc.workspace_id})")
    
    # Delete related conversations and messages first
    conversations = WhatsAppConversation.query.filter_by(account_id=4).all()
    print(f"Found {len(conversations)} conversations to delete")
    
    for conv in conversations:
        # Delete messages for this conversation
        msg_count = WhatsAppMessage.query.filter_by(conversation_id=conv.id).delete()
        print(f"  Deleted {msg_count} messages from conversation {conv.id}")
    
    # Delete conversations
    conv_count = WhatsAppConversation.query.filter_by(account_id=4).delete()
    print(f"Deleted {conv_count} conversations")
    
    # Now delete the account
    db.session.delete(acc)
    db.session.commit()
    
    print(f"\n✅ Successfully deleted account ID=4 ({acc.display_phone_number})")
    
    # Verify
    remaining = WhatsAppAccount.query.all()
    print(f"\nRemaining accounts: {len(remaining)}")
    for a in remaining:
        print(f"  ID={a.id} Phone={a.display_phone_number} WS={a.workspace_id}")
