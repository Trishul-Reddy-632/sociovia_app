from app import app
from whatsapp.models import WhatsAppFlow, WhatsAppAccount

with app.app_context():
    flows = WhatsAppFlow.query.all()
    print(f'Total flows: {len(flows)}')
    for f in flows:
        acc = f.account
        has_token = acc.access_token_encrypted is not None if acc else False
        print(f'Flow ID: {f.id}, Name: {f.name}, Account ID: {f.account_id}, Account Active: {acc.is_active if acc else "N/A"}, Has Token: {has_token}')
