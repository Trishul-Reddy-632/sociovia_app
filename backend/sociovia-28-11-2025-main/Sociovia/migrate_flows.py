"""
Migration Script: Create WhatsApp Flows Table
==============================================

Run this script to add the whatsapp_flows table to your database.

Usage:
    python migrate_flows.py
"""

import psycopg2
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Database connection - try multiple possible variable names
DATABASE_URL = os.getenv('SQLALCHEMY_DATABASE_URI') or os.getenv('DATABASE_URL')

# SQL for creating the table
CREATE_TABLE_SQL = """
-- WhatsApp Flows table
CREATE TABLE IF NOT EXISTS whatsapp_flows (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
    
    -- Flow identity
    name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL,
    
    -- Versioning
    flow_version INTEGER DEFAULT 1 NOT NULL,
    parent_flow_id INTEGER NULL REFERENCES whatsapp_flows(id) ON DELETE SET NULL,
    
    -- Flow content
    flow_json JSONB NOT NULL,
    schema_version VARCHAR(16) DEFAULT '5.0' NOT NULL,
    entry_screen_id VARCHAR(64) NOT NULL,
    
    -- Meta sync
    meta_flow_id VARCHAR(64),
    status VARCHAR(16) DEFAULT 'DRAFT' NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT uq_flow_name_version UNIQUE(account_id, name, flow_version),
    CONSTRAINT chk_flow_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'DEPRECATED'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS ix_whatsapp_flows_account ON whatsapp_flows(account_id);
CREATE INDEX IF NOT EXISTS ix_whatsapp_flows_status ON whatsapp_flows(status);
CREATE INDEX IF NOT EXISTS ix_whatsapp_flows_parent ON whatsapp_flows(parent_flow_id);
CREATE INDEX IF NOT EXISTS ix_whatsapp_flows_meta_id ON whatsapp_flows(meta_flow_id);
CREATE INDEX IF NOT EXISTS ix_whatsapp_flows_name ON whatsapp_flows(name);

-- Comment on table
COMMENT ON TABLE whatsapp_flows IS 'WhatsApp Flows for interactive data collection';
COMMENT ON COLUMN whatsapp_flows.flow_json IS 'Full WhatsApp Flow JSON structure';
COMMENT ON COLUMN whatsapp_flows.entry_screen_id IS 'ID of the first screen to show';
COMMENT ON COLUMN whatsapp_flows.meta_flow_id IS 'Flow ID from Meta after publishing';
"""

def run_migration():
    """Execute the migration."""
    print("=" * 60)
    print("WhatsApp Flows Migration")
    print("=" * 60)
    
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not found in environment variables")
        return False
    
    try:
        # Connect to database
        print(f"\nConnecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check if table already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'whatsapp_flows'
            );
        """)
        exists = cursor.fetchone()[0]
        
        if exists:
            print("Table 'whatsapp_flows' already exists.")
            print("Skipping creation. Run with --force to recreate.")
        else:
            print("Creating 'whatsapp_flows' table...")
            cursor.execute(CREATE_TABLE_SQL)
            conn.commit()
            print("✅ Table created successfully!")
        
        # Verify table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'whatsapp_flows'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        
        print("\n📋 Table Structure:")
        print("-" * 50)
        for col in columns:
            print(f"  {col[0]:<20} {col[1]:<15} {'NULL' if col[2] == 'YES' else 'NOT NULL'}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        return False


if __name__ == "__main__":
    run_migration()
