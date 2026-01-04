"""
Quick fix script to update status for already closed conversations.
Run this once after applying the routes.py fix.
"""
import os
import sys

# Add the parent directory to path so we can import from the project
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from sqlalchemy import text

def fix_closed_conversations():
    """Update status to 'closed' for all conversations that were closed by agent."""
    with app.app_context():
        # Fix existing data
        result = db.session.execute(text("""
            UPDATE whatsapp_conversations 
            SET status = 'closed' 
            WHERE closed_by_agent = true AND status = 'open'
        """))
        
        affected = result.rowcount
        db.session.commit()
        
        print(f"✅ Fixed {affected} conversations that were closed by agent but still had status='open'")
        
        # Show current stats
        stats = db.session.execute(text("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
                SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
                SUM(CASE WHEN closed_by_agent = true THEN 1 ELSE 0 END) as closed_by_agent_count
            FROM whatsapp_conversations
        """)).fetchone()
        
        print(f"\n📊 Current conversation stats:")
        print(f"   Total: {stats[0]}")
        print(f"   Open: {stats[1]}")
        print(f"   Closed: {stats[2]}")
        print(f"   Closed by agent: {stats[3]}")

if __name__ == "__main__":
    fix_closed_conversations()
