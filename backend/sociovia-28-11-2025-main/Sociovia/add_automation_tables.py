"""
WhatsApp Automation Tables Migration
====================================

Creates the following tables:
- whatsapp_automation_rules: Stores automation rule definitions
- whatsapp_automation_logs: Stores automation execution logs
- whatsapp_business_hours: Stores business hours configuration

Run this migration manually or via Alembic.

Usage (manual):
    python -c "from add_automation_tables import upgrade; upgrade()"
    
Usage (in Flask shell):
    from add_automation_tables import upgrade
    upgrade()
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import db
from test import app


def upgrade():
    """Create automation tables."""
    
    # SQL for whatsapp_automation_rules
    automation_rules_sql = """
    CREATE TABLE IF NOT EXISTS whatsapp_automation_rules (
        id SERIAL PRIMARY KEY,
        workspace_id VARCHAR(100) NOT NULL,
        account_id INTEGER NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
        
        name VARCHAR(200) NOT NULL,
        description TEXT,
        
        rule_type VARCHAR(50) NOT NULL,
        trigger_config JSONB DEFAULT '{}',
        
        response_type VARCHAR(50) NOT NULL DEFAULT 'text',
        response_config JSONB NOT NULL DEFAULT '{}',
        
        is_active BOOLEAN DEFAULT TRUE,
        priority INTEGER DEFAULT 100,
        
        cooldown_seconds INTEGER,
        max_triggers_per_day INTEGER,
        
        trigger_count INTEGER DEFAULT 0,
        last_triggered_at TIMESTAMP WITH TIME ZONE,
        
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_automation_rules_workspace 
        ON whatsapp_automation_rules(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_account 
        ON whatsapp_automation_rules(account_id);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_type 
        ON whatsapp_automation_rules(rule_type);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_active 
        ON whatsapp_automation_rules(workspace_id, account_id, is_active, status);
    """
    
    # SQL for whatsapp_automation_logs
    automation_logs_sql = """
    CREATE TABLE IF NOT EXISTS whatsapp_automation_logs (
        id SERIAL PRIMARY KEY,
        workspace_id VARCHAR(100) NOT NULL,
        rule_id INTEGER NOT NULL REFERENCES whatsapp_automation_rules(id) ON DELETE CASCADE,
        conversation_id INTEGER REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
        
        trigger_message_id INTEGER REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
        response_message_id INTEGER REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
        
        trigger_text TEXT,
        matched_keyword VARCHAR(200),
        
        response_success BOOLEAN DEFAULT FALSE,
        error_message TEXT,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_automation_logs_workspace 
        ON whatsapp_automation_logs(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_automation_logs_rule 
        ON whatsapp_automation_logs(rule_id);
    CREATE INDEX IF NOT EXISTS idx_automation_logs_conversation 
        ON whatsapp_automation_logs(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_automation_logs_created 
        ON whatsapp_automation_logs(created_at);
    """
    
    # SQL for whatsapp_business_hours
    business_hours_sql = """
    CREATE TABLE IF NOT EXISTS whatsapp_business_hours (
        id SERIAL PRIMARY KEY,
        workspace_id VARCHAR(100) NOT NULL,
        account_id INTEGER NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
        
        timezone VARCHAR(100) DEFAULT 'UTC',
        is_enabled BOOLEAN DEFAULT FALSE,
        
        schedule JSONB DEFAULT '{}',
        exceptions JSONB DEFAULT '[]',
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(workspace_id, account_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_business_hours_workspace 
        ON whatsapp_business_hours(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_business_hours_account 
        ON whatsapp_business_hours(account_id);
    """
    
    with app.app_context():
        try:
            # Execute migrations
            print("Creating whatsapp_automation_rules table...")
            db.session.execute(db.text(automation_rules_sql))
            print("✓ whatsapp_automation_rules created")
            
            print("Creating whatsapp_automation_logs table...")
            db.session.execute(db.text(automation_logs_sql))
            print("✓ whatsapp_automation_logs created")
            
            print("Creating whatsapp_business_hours table...")
            db.session.execute(db.text(business_hours_sql))
            print("✓ whatsapp_business_hours created")
            
            db.session.commit()
            print("\n✅ All automation tables created successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Migration failed: {e}")
            raise


def downgrade():
    """Drop automation tables."""
    
    drop_sql = """
    DROP TABLE IF EXISTS whatsapp_automation_logs CASCADE;
    DROP TABLE IF EXISTS whatsapp_automation_rules CASCADE;
    DROP TABLE IF EXISTS whatsapp_business_hours CASCADE;
    """
    
    with app.app_context():
        try:
            print("Dropping automation tables...")
            db.session.execute(db.text(drop_sql))
            db.session.commit()
            print("✅ Automation tables dropped successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Downgrade failed: {e}")
            raise


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="WhatsApp Automation Tables Migration")
    parser.add_argument("--downgrade", action="store_true", help="Drop tables instead of creating")
    args = parser.parse_args()
    
    if args.downgrade:
        confirm = input("This will DROP all automation tables. Type 'yes' to confirm: ")
        if confirm.lower() == "yes":
            downgrade()
        else:
            print("Aborted.")
    else:
        upgrade()
