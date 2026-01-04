"""
Migration script to add address fields to workspaces tables.
Run this script from the Sociovia directory with the virtual environment activated:

    python migrations/run_migration.py
"""

import os
import sys

# Add parent directory to path so we can import from the app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from test import app  # Main Flask app
from models import db  # Database instance

def run_migration():
    """Add address fields to workspaces and workspaces2 tables."""
    
    # SQL statements for adding columns
    # Using raw SQL with text() for compatibility
    
    migration_statements = [
        # For workspaces table
        "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS address_line VARCHAR(500)",
        "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
        "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS district VARCHAR(100)",
        "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS pin_code VARCHAR(20)",
        "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India'",
        
        # For workspaces2 table
        "ALTER TABLE workspaces2 ADD COLUMN IF NOT EXISTS address_line VARCHAR(500)",
        "ALTER TABLE workspaces2 ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
        "ALTER TABLE workspaces2 ADD COLUMN IF NOT EXISTS district VARCHAR(100)",
        "ALTER TABLE workspaces2 ADD COLUMN IF NOT EXISTS pin_code VARCHAR(20)",
        "ALTER TABLE workspaces2 ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India'",
    ]
    
    # Index creation statements
    index_statements = [
        "CREATE INDEX IF NOT EXISTS idx_workspaces_city ON workspaces(city)",
        "CREATE INDEX IF NOT EXISTS idx_workspaces_country ON workspaces(country)",
        "CREATE INDEX IF NOT EXISTS idx_workspaces_pin_code ON workspaces(pin_code)",
        "CREATE INDEX IF NOT EXISTS idx_workspaces2_city ON workspaces2(city)",
        "CREATE INDEX IF NOT EXISTS idx_workspaces2_country ON workspaces2(country)",
        "CREATE INDEX IF NOT EXISTS idx_workspaces2_pin_code ON workspaces2(pin_code)",
    ]
    
    with app.app_context():
        print("Starting migration: Adding address fields to workspace tables...")
        print("-" * 60)
        
        # Run column additions
        for stmt in migration_statements:
            try:
                db.session.execute(text(stmt))
                print(f"✓ Executed: {stmt[:60]}...")
            except Exception as e:
                # Column might already exist, that's okay
                error_msg = str(e).lower()
                if "duplicate column" in error_msg or "already exists" in error_msg:
                    print(f"⊘ Skipped (already exists): {stmt[:50]}...")
                else:
                    print(f"✗ Error: {stmt[:50]}... -> {e}")
        
        db.session.commit()
        print("-" * 60)
        
        # Run index creation
        print("Creating indexes...")
        for stmt in index_statements:
            try:
                db.session.execute(text(stmt))
                print(f"✓ Executed: {stmt[:60]}...")
            except Exception as e:
                error_msg = str(e).lower()
                if "already exists" in error_msg:
                    print(f"⊘ Skipped (already exists): {stmt[:50]}...")
                else:
                    print(f"✗ Error: {stmt[:50]}... -> {e}")
        
        db.session.commit()
        print("-" * 60)
        print("Migration completed!")
        
        # Verify columns exist
        print("\nVerifying columns in workspaces table:")
        try:
            result = db.session.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'workspaces' 
                AND column_name IN ('address_line', 'city', 'district', 'pin_code', 'country')
            """))
            columns = [row[0] for row in result]
            for col in ['address_line', 'city', 'district', 'pin_code', 'country']:
                status = "✓" if col in columns else "✗"
                print(f"  {status} {col}")
        except Exception as e:
            print(f"  Could not verify columns: {e}")


if __name__ == "__main__":
    run_migration()
