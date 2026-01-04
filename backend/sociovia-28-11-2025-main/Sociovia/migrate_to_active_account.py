"""
Migration script to move flows and templates from inactive account (ID 12) to active account (ID 13)
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from whatsapp.models import WhatsAppAccount, WhatsAppFlow, WhatsAppTemplate

with app.app_context():
    # Find all flows with account_id = 12
    flows = WhatsAppFlow.query.filter_by(account_id=12).all()
    print(f"\nFound {len(flows)} flows linked to account 12")
    
    for flow in flows:
        print(f"  - Flow {flow.id}: {flow.name}")
    
    # Find all templates with account_id = 12
    templates = WhatsAppTemplate.query.filter_by(account_id=12).all()
    print(f"\nFound {len(templates)} templates linked to account 12")
    
    for template in templates:
        print(f"  - Template {template.id}: {template.name}")
    
    # Verify account 13 is active and has token
    active_account = db.session.get(WhatsAppAccount, 13)
    if active_account:
        print(f"\nTarget account 13:")
        print(f"  Phone ID: {active_account.phone_number_id}")
        print(f"  Is active: {active_account.is_active}")
        print(f"  Has token: {active_account.get_access_token() is not None}")
    else:
        print("\nERROR: Account 13 not found!")
        sys.exit(1)
    
    if not active_account.is_active or not active_account.get_access_token():
        print("\nERROR: Account 13 is not active or has no token!")
        sys.exit(1)
    
    # Perform migration
    confirm = input("\nDo you want to migrate all flows and templates to account 13? (yes/no): ")
    
    if confirm.lower() == 'yes':
        # Update flows first - these should be safe
        flows_updated = WhatsAppFlow.query.filter_by(account_id=12).update({"account_id": 13})
        db.session.commit()
        print(f"\n✅ Migrated {flows_updated} flows to account 13")
        
        # For templates, we need to handle duplicates
        # Get templates that already exist on account 13
        existing_templates_13 = set()
        for t in WhatsAppTemplate.query.filter_by(account_id=13).all():
            existing_templates_13.add((t.name, t.language))
        
        # Get templates from account 12
        templates_12 = WhatsAppTemplate.query.filter_by(account_id=12).all()
        
        templates_migrated = 0
        templates_skipped = 0
        templates_deleted = 0
        
        for template in templates_12:
            key = (template.name, template.language)
            if key in existing_templates_13:
                # Duplicate exists, delete the old one
                db.session.delete(template)
                templates_deleted += 1
                print(f"   Deleted duplicate: {template.name} ({template.language})")
            else:
                # Can safely migrate
                template.account_id = 13
                templates_migrated += 1
        
        db.session.commit()
        
        print(f"\n✅ Template migration complete!")
        print(f"   - Migrated {templates_migrated} templates")
        print(f"   - Deleted {templates_deleted} duplicates")
        
        # Verify
        remaining_flows = WhatsAppFlow.query.filter_by(account_id=12).count()
        remaining_templates = WhatsAppTemplate.query.filter_by(account_id=12).count()
        
        print(f"\nVerification:")
        print(f"   - Flows still on account 12: {remaining_flows}")
        print(f"   - Templates still on account 12: {remaining_templates}")
    else:
        print("\nMigration cancelled.")
