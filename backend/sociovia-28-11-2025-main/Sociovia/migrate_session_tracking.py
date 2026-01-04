"""
Database Migration Script - Add Session Tracking Columns
Run this script to add new columns to existing PostgreSQL tables.
"""

import os
import sys

# Add the parent directory to path so we can import from the project
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from sqlalchemy import text

def run_migration():
    """Add new columns to existing tables."""
    
    migrations = [
        # WhatsAppConversation - Session tracking columns
        "ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMP",
        "ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS last_outbound_at TIMESTAMP",
        "ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP",
        
        # WhatsAppConversation - Manual closing by agent
        "ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS closed_by_agent BOOLEAN DEFAULT false",
        "ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP",
        
        # WhatsAppMessage - Template tracking and sent_at
        "ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS template_name VARCHAR(128)",
        "ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS template_category VARCHAR(32)",
        "ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP",
        
        # WhatsAppAccount - Custom name (user-defined, never overwritten by Meta)
        "ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS custom_name VARCHAR(128)",
        
        # Create MessageStatusEvent table if not exists
        """
        CREATE TABLE IF NOT EXISTS whatsapp_message_status_events (
            id SERIAL PRIMARY KEY,
            wamid VARCHAR(128) NOT NULL,
            status VARCHAR(16) NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            error_code VARCHAR(16),
            error_message TEXT,
            raw_event JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
        """,
        
        # Add indexes for performance
        "CREATE INDEX IF NOT EXISTS ix_status_events_wamid ON whatsapp_message_status_events(wamid)",
        "CREATE INDEX IF NOT EXISTS ix_status_events_timestamp ON whatsapp_message_status_events(timestamp)",
        "CREATE INDEX IF NOT EXISTS ix_status_events_created ON whatsapp_message_status_events(created_at)",
        "CREATE INDEX IF NOT EXISTS ix_messages_template ON whatsapp_messages(template_name)",
        "CREATE INDEX IF NOT EXISTS ix_messages_template_category ON whatsapp_messages(template_category)",
        "CREATE INDEX IF NOT EXISTS ix_conversations_account_last ON whatsapp_conversations(account_id, last_message_at)",
        "CREATE INDEX IF NOT EXISTS ix_conversations_session ON whatsapp_conversations(session_expires_at)",
    ]
    
    with app.app_context():
        for sql in migrations:
            try:
                db.session.execute(text(sql))
                print(f"✅ Executed: {sql[:60]}...")
            except Exception as e:
                print(f"⚠️ Warning: {e}")
        
        db.session.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
