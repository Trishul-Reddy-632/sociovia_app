"""
Migration script to add notification_phone_number column to whatsapp_accounts table.

Run this script once to add the new column for notification settings.

Usage:
    python migrate_notification_settings.py
"""

import os
import sys
from sqlalchemy import text, inspect

# Add the parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db

def check_column_exists(inspector, table_name, column_name):
    """Check if a column exists in a table."""
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def migrate():
    """Add notification_phone_number column to whatsapp_accounts table."""
    app = create_app()
    
    with app.app_context():
        inspector = inspect(db.engine)
        
        # Check if whatsapp_accounts table exists
        if 'whatsapp_accounts' not in inspector.get_table_names():
            print("❌ Table 'whatsapp_accounts' does not exist. Please run initial migrations first.")
            return False
        
        # Check if column already exists
        if check_column_exists(inspector, 'whatsapp_accounts', 'notification_phone_number'):
            print("✅ Column 'notification_phone_number' already exists in 'whatsapp_accounts' table.")
            return True
        
        # Add the column
        try:
            print("🔄 Adding 'notification_phone_number' column to 'whatsapp_accounts' table...")
            
            with db.engine.connect() as conn:
                conn.execute(text("""
                    ALTER TABLE whatsapp_accounts 
                    ADD COLUMN notification_phone_number VARCHAR(32) NULL
                """))
                conn.commit()
            
            print("✅ Successfully added 'notification_phone_number' column!")
            return True
            
        except Exception as e:
            print(f"❌ Error adding column: {e}")
            return False

if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
