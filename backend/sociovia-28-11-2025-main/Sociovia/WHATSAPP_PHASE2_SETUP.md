# WhatsApp Phase-2 Part-1 Setup Guide

## Overview

Phase-2 Part-1 enables workspace admins to connect their own WhatsApp Business Accounts via Meta Embedded Signup, eliminating the need for 1-hour test tokens.

## Prerequisites

1. **Meta Developer Account** with a Facebook App
2. **WhatsApp Business Account (WABA)** in Meta Business Manager
3. **Python dependencies** installed

## Step 1: Configure Meta App

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Select your app → **Settings** → **Basic**
3. Note your **App ID** and **App Secret**
4. Add **OAuth Redirect URI**: `https://your-domain.com/api/whatsapp/connect/callback`
5. Enable **WhatsApp** product in your app

## Step 2: Set Environment Variables

Add to your `.env` file:

```env
# Meta OAuth Configuration
META_APP_ID=your_meta_app_id_here
META_APP_SECRET=your_meta_app_secret_here

# Token Encryption Key (generate a secure key)
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
WHATSAPP_ENCRYPTION_KEY=your_base64_encryption_key_here

# App URLs
APP_BASE_URL=https://your-backend-domain.com
FRONTEND_ORIGIN=https://your-frontend-domain.com
```

## Step 3: Run Database Migration

```bash
cd backend/sociovia-28-11-2025-main/Sociovia
python migrations/run_whatsapp_phase2_migration.py
```

This adds the following columns to `whatsapp_accounts`:
- `access_token_encrypted`
- `token_type`
- `token_expires_at`
- `connected_by_user_id`
- `last_synced_at`

## Step 4: Install Dependencies

Ensure `cryptography` is installed (should already be in requirements.txt):

```bash
pip install cryptography
```

## Step 5: Test the Integration

1. Navigate to `/dashboard/whatsapp/settings`
2. Click "Connect WhatsApp"
3. Complete Meta OAuth flow
4. Verify account appears in "Connected Accounts"

## Security Notes

- **Never commit** `WHATSAPP_ENCRYPTION_KEY` to version control
- **Rotate encryption key** periodically in production
- **Use HTTPS** for all OAuth callbacks
- **Store App Secret** securely (use secrets manager in production)

## Troubleshooting

**"META_APP_ID not set"**
- Check `.env` file has correct variable names
- Restart backend server after adding env vars

**"OAuth callback fails"**
- Verify redirect URI matches exactly in Meta App settings
- Check `APP_BASE_URL` is correct and accessible

**"No WABA found"**
- User must have a WhatsApp Business Account in Meta Business Manager
- User must grant `whatsapp_business_management` permission

**"Token decryption fails"**
- Ensure `WHATSAPP_ENCRYPTION_KEY` hasn't changed
- If key changed, existing tokens need to be reconnected

## Next Steps

After Phase-2 Part-1:
- Inbox and Test Console automatically use stored tokens
- No manual token entry required for connected workspaces
- Ready for Phase-2 Part-2 (WebSocket real-time updates)

