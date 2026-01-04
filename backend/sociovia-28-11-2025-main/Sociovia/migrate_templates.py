"""
Migration script to add new template acceleration columns to whatsapp_templates table.
Run this once to add the missing columns.
"""
from app import app, db

# SQL to add missing columns
ALTER_STATEMENTS = [
    "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS confidence_initial INTEGER;",
    "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS confidence_post_submit INTEGER;",
    "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;",
    "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;",
    "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS approval_duration_seconds INTEGER;",
    "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS approval_outcome_reason VARCHAR(100);",
    "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS validation_flags JSON;",
    "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS detected_intent VARCHAR(32);",
    "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS approval_path VARCHAR(32);",
]

def run_migration():
    with app.app_context():
        from sqlalchemy import text
        
        print("Running migration: Adding template acceleration columns...")
        
        for sql in ALTER_STATEMENTS:
            try:
                db.session.execute(text(sql))
                print(f"  ✓ {sql[:60]}...")
            except Exception as e:
                print(f"  ! Error (may already exist): {e}")
        
        db.session.commit()
        print("\n✅ Migration complete!")

if __name__ == "__main__":
    run_migration()
