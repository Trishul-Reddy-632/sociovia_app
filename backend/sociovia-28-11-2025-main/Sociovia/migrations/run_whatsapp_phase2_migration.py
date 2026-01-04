"""
Run migration to add token storage columns to whatsapp_accounts table.
Phase-2 Part-1: WhatsApp Business Account Integration
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import app
from models import db

def run_migration():
    """Run the migration SQL."""
    with app.app_context():
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            
            # Get existing columns
            columns = [col['name'] for col in inspector.get_columns('whatsapp_accounts')]
            print(f"Existing columns: {columns}")
            
            # Check database type
            db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
            is_postgres = 'postgresql' in db_uri.lower() or 'postgres' in db_uri.lower()
            is_sqlite = 'sqlite' in db_uri.lower()
            
            # Add columns one by one (checking if they exist)
            if 'access_token_encrypted' not in columns:
                if is_postgres:
                    db.session.execute(text("ALTER TABLE whatsapp_accounts ADD COLUMN access_token_encrypted TEXT"))
                else:
                    db.session.execute(text("ALTER TABLE whatsapp_accounts ADD COLUMN access_token_encrypted TEXT"))
                print("✅ Added access_token_encrypted")
            
            if 'token_type' not in columns:
                if is_postgres:
                    db.session.execute(text("ALTER TABLE whatsapp_accounts ADD COLUMN token_type VARCHAR(16) DEFAULT 'temporary' NOT NULL"))
                else:
                    db.session.execute(text("ALTER TABLE whatsapp_accounts ADD COLUMN token_type VARCHAR(16) DEFAULT 'temporary' NOT NULL"))
                print("✅ Added token_type")
            
            if 'token_expires_at' not in columns:
                if is_postgres:
                    db.session.execute(text("ALTER TABLE whatsapp_accounts ADD COLUMN token_expires_at TIMESTAMP"))
                else:
                    db.session.execute(text("ALTER TABLE whatsapp_accounts ADD COLUMN token_expires_at TIMESTAMP"))
                print("✅ Added token_expires_at")
            
            if 'connected_by_user_id' not in columns:
                if is_postgres:
                    db.session.execute(text("ALTER TABLE whatsapp_accounts ADD COLUMN connected_by_user_id VARCHAR(64)"))
                else:
                    db.session.execute(text("ALTER TABLE whatsapp_accounts ADD COLUMN connected_by_user_id VARCHAR(64)"))
                print("✅ Added connected_by_user_id")
            
            if 'last_synced_at' not in columns:
                if is_postgres:
                    db.session.execute(text("ALTER TABLE whatsapp_accounts ADD COLUMN last_synced_at TIMESTAMP"))
                else:
                    db.session.execute(text("ALTER TABLE whatsapp_accounts ADD COLUMN last_synced_at TIMESTAMP"))
                print("✅ Added last_synced_at")
            
            # Update existing records to have token_type
            if 'token_type' in columns:
                try:
                    db.session.execute(text("UPDATE whatsapp_accounts SET token_type = 'temporary' WHERE token_type IS NULL"))
                except Exception as e:
                    print(f"⚠️  Could not update token_type: {e}")
            
            # Create index if it doesn't exist
            try:
                existing_indexes = [idx['name'] for idx in inspector.get_indexes('whatsapp_accounts')]
                if 'ix_whatsapp_accounts_connected_by' not in existing_indexes:
                    db.session.execute(text("CREATE INDEX ix_whatsapp_accounts_connected_by ON whatsapp_accounts(connected_by_user_id)"))
                    print("✅ Created index ix_whatsapp_accounts_connected_by")
                else:
                    print("ℹ️  Index ix_whatsapp_accounts_connected_by already exists")
            except Exception as e:
                print(f"⚠️  Could not create index: {e}")
            
            db.session.commit()
            print("\n✅ Migration completed successfully!")
            print("Added columns: access_token_encrypted, token_type, token_expires_at, connected_by_user_id, last_synced_at")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    run_migration()

