# WhatsApp Webhook Setup Guide

## Why You're Not Receiving Messages

Your backend code is correct, but the **webhook is not configured in Meta Developer Portal**. Meta doesn't know where to send incoming messages.

---

## 🔧 Manual Setup Steps

### Step 1: Get Your Backend URL

Your backend must be **publicly accessible via HTTPS**. Options:

**Option A: DevTunnel (Recommended for Development)**
```powershell
# In VS Code, open Ports panel (Ctrl+Shift+P > "Ports: Focus on Ports View")
# Forward port 5000, set visibility to "Public"
# Your URL will be like: https://mq36739m-5000.inc1.devtunnels.ms
```

**Option B: Use Production URL**
```
https://sociovia-backend-362038465411.europe-west1.run.app
```

Your **Webhook Callback URL** will be:
```
[YOUR_BACKEND_URL]/api/whatsapp/webhook
```

Example: `https://mq36739m-5000.inc1.devtunnels.ms/api/whatsapp/webhook`

---

### Step 2: Configure Webhook in Meta Developer Portal

1. **Go to**: [Meta Developer Portal](https://developers.facebook.com/apps/)

2. **Select your app** (Sociovia)

3. **Navigate to**: Left sidebar → **WhatsApp** → **Configuration**

4. **Find "Webhooks" section** and click **Edit**

5. **Enter these values**:

   | Field | Value |
   |-------|-------|
   | **Callback URL** | `[YOUR_BACKEND_URL]/api/whatsapp/webhook` |
   | **Verify Token** | `sociovia_whatsapp_verify_2024` |

6. **Click "Verify and Save"**
   - Meta will send a GET request to your endpoint
   - Your server must respond with the challenge
   - If it fails, make sure your backend is running and publicly accessible

---

### Step 3: Subscribe to Webhook Events

After verification succeeds:

1. In the same "Webhooks" section, click **Manage**

2. **Subscribe to these fields** (check the boxes):
   - ✅ `messages` - Incoming messages from users
   - ✅ `message_template_status_update` - Template status changes (optional)

3. Click **Done**

---

### Step 4: Verify Backend is Running

```powershell
cd c:\Users\prabh\Downloads\Sociovia_app\backend\sociovia-28-11-2025-main\Sociovia
python test.py
```

You should see:
```
WhatsApp Phase 1 blueprint registered at /api/whatsapp
```

---

### Step 5: Test the Webhook

**Option A: Use Meta's Test Button**
1. In Meta Developer Portal → WhatsApp → Configuration
2. Click "Test" next to each subscribed field
3. Check your backend logs for incoming webhook

**Option B: Send a Real Message**
1. Use your WhatsApp-connected phone
2. Send a message TO your WhatsApp Business Number
3. Check your backend logs

---

## 🔍 Troubleshooting

### "Verification Failed" Error

**Check 1: Backend is running**
```powershell
curl https://[YOUR_BACKEND_URL]/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=sociovia_whatsapp_verify_2024&hub.challenge=test123
```
Should return: `test123`

**Check 2: Verify token matches**
Your `.env` has:
```
WHATSAPP_VERIFY_TOKEN=sociovia_whatsapp_verify_2024
```
This MUST match what you enter in Meta Portal.

**Check 3: HTTPS is required**
Meta only accepts HTTPS URLs. DevTunnel provides HTTPS automatically.

### Messages Not Appearing in Inbox

**Check 1: Webhook subscribed to `messages`**
Make sure you checked the `messages` box in Meta → WhatsApp → Configuration → Webhooks → Manage

**Check 2: Check backend logs**
```
Stored incoming message: wamid.xxx from 919876543210
```
If you see this, messages are being received.

**Check 3: Database has records**
```sql
SELECT * FROM whatsapp_conversations ORDER BY created_at DESC LIMIT 5;
SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 5;
```

---

## 🌐 Important URLs

| Purpose | URL |
|---------|-----|
| Meta Developer Portal | https://developers.facebook.com/apps/ |
| WhatsApp Configuration | https://developers.facebook.com/apps/[APP_ID]/whatsapp-business/wa-settings/ |
| Your Backend Webhook | `[BACKEND_URL]/api/whatsapp/webhook` |
| Your Frontend Inbox | `http://localhost:8080/dashboard/whatsapp/inbox?workspace_id=4` |

---

## 📋 Quick Checklist

- [ ] Backend running (python test.py)
- [ ] DevTunnel active and public (port 5000)
- [ ] Webhook URL configured in Meta Portal
- [ ] Verify token matches `.env` file
- [ ] Webhook verified successfully (green checkmark in Meta)
- [ ] Subscribed to `messages` event
- [ ] Test message sent to WhatsApp Business Number
