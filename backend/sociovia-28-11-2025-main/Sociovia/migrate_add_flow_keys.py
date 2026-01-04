"""
Migration: Add Flow Encryption Keys to WhatsApp Accounts
=========================================================

Adds flow_private_key and flow_public_key columns to whatsapp_accounts table
for storing RSA encryption keys used in dynamic flows.

Run: python migrate_add_flow_keys.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URI") or os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ Error: SQLALCHEMY_DATABASE_URI or DATABASE_URL not found in .env")
    sys.exit(1)

import psycopg2
from psycopg2 import sql

def run_migration():
    """Add flow encryption key columns to whatsapp_accounts table."""
    
    print("=" * 60)
    print("WhatsApp Accounts - Add Flow Encryption Keys Migration")
    print("=" * 60)
    print()
    
    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        print("✅ Connected successfully!")
        print()
        
        # Check if columns already exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'whatsapp_accounts' 
            AND column_name IN ('flow_private_key', 'flow_public_key')
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        if 'flow_private_key' in existing_columns and 'flow_public_key' in existing_columns:
            print("✅ Columns already exist. No migration needed.")
            return
        
        # Add columns
        columns_to_add = []
        
        if 'flow_private_key' not in existing_columns:
            columns_to_add.append(('flow_private_key', 'TEXT'))
            
        if 'flow_public_key' not in existing_columns:
            columns_to_add.append(('flow_public_key', 'TEXT'))
        
        print(f"Adding {len(columns_to_add)} column(s)...")
        
        for col_name, col_type in columns_to_add:
            print(f"  - Adding {col_name} ({col_type})...")
            cursor.execute(
                sql.SQL("ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS {} {}").format(
                    sql.Identifier(col_name),
                    sql.SQL(col_type)
                )
            )
            print(f"    ✅ {col_name} added")
        
        print()
        print("=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)
        
        # Show updated table structure
        print()
        print("📋 Updated whatsapp_accounts columns:")
        print("-" * 50)
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'whatsapp_accounts'
            ORDER BY ordinal_position
        """)
        
        for row in cursor.fetchall():
            nullable = "NULL" if row[2] == "YES" else "NOT NULL"
            print(f"  {row[0]:<30} {row[1]:<20} {nullable}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    run_migration()
