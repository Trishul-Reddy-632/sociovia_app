import os
import requests
from dotenv import load_dotenv
load_dotenv()

from app import app
from whatsapp.models import WhatsAppAccount

with app.app_context():
    account = WhatsAppAccount.query.filter_by(phone_number_id='909603232241870').first()
    if account:
        token = account.get_access_token()
        waba_id = account.waba_id
        api_version = os.getenv('WHATSAPP_API_VERSION', 'v24.0')
        
        # Get message templates
        print('Fetching available templates...')
        resp = requests.get(
            f'https://graph.facebook.com/{api_version}/{waba_id}/message_templates',
            params={
                'access_token': token,
                'fields': 'name,status,language,category'
            }
        )
        data = resp.json()
        templates = data.get('data', [])
        print(f'Found {len(templates)} templates:')
        for t in templates:
            print(f"  - {t['name']} ({t['language']}) - Status: {t['status']}")
