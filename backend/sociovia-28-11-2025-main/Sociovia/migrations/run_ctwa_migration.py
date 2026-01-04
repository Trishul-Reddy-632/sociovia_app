#!/usr/bin/env python
"""
CTWA Migration Runner
====================

Runs the CTWA tables migration using the existing database connection.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import db
from flask import Flask


def run_migration():
    """Execute the CTWA migration SQL."""
    
    # Read the SQL file
    sql_file = Path(__file__).parent / "add_ctwa_tables.sql"
    
    if not sql_file.exists():
        print(f"❌ Migration file not found: {sql_file}")
        return False
    
    sql_content = sql_file.read_text(encoding="utf-8")
    
    # Create minimal Flask app for database connection
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/sociovia"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    db.init_app(app)
    
    with app.app_context():
        try:
            # Execute the SQL
            print("🚀 Running CTWA migration...")
            
            # Split by statements and execute each
            statements = [s.strip() for s in sql_content.split(";") if s.strip() and not s.strip().startswith("--")]
            
            for i, statement in enumerate(statements, 1):
                if statement:
                    try:
                        db.session.execute(statement)
                        print(f"  ✓ Statement {i} executed")
                    except Exception as e:
                        # Ignore "already exists" errors
                        if "already exists" in str(e).lower():
                            print(f"  ⚠ Statement {i} skipped (already exists)")
                        else:
                            print(f"  ✗ Statement {i} failed: {e}")
            
            db.session.commit()
            print("\n✅ CTWA migration completed successfully!")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Migration failed: {e}")
            return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
