"""
Quick migration to add notification_phone_number column.
Run: python run_migration_notification.py
"""
import os
import psycopg2

# Get DATABASE_URL from environment or use default
DATABASE_URL = os.environ.get('DATABASE_URL') or "postgresql://dbuser:StrongPasswordHere@34.10.193.3:5432/postgres"

print(f"🔗 Connecting to database...")

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    # Check if column exists
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_accounts' 
        AND column_name = 'notification_phone_number'
    """)
    
    if cur.fetchone():
        print("✅ Column 'notification_phone_number' already exists!")
    else:
        print("🔄 Adding 'notification_phone_number' column...")
        cur.execute("""
            ALTER TABLE whatsapp_accounts 
            ADD COLUMN notification_phone_number VARCHAR(32)
        """)
        print("✅ Column added successfully!")
    
    cur.close()
    conn.close()
    print("🎉 Migration complete!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
