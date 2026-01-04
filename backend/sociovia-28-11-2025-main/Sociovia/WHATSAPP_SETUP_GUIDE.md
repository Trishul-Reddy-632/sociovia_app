# 🚀 WhatsApp CTWA System - Complete Setup Guide

## Current Status

### ✅ Backend (Flask) - READY
| Component | Status | Details |
|-----------|--------|---------|
| WhatsApp Blueprint | ✅ | Registered at `/api/whatsapp/*` |
| Database Tables | ✅ | 13 tables created in PostgreSQL |
| Environment Variables | ✅ | Added to `.env` |
| API Routes | ✅ | 20+ endpoints defined |

### ⚠️ Frontend (React) - NOT IN THIS WORKSPACE
The README describes frontend components that **do not exist** in this workspace:
- `whatsapp_automation/api/whatsappApi.ts`
- `whatsapp_automation/pages/ConversationsInbox.tsx`
- `whatsapp_automation/pages/TemplateManager.tsx`

---

## 🔧 Step-by-Step Setup

### Step 1: Backend Setup (DONE)

The backend is already configured. Verify by running:

```powershell
cd C:\Users\prabh\Downloads\sociovia-28-11-2025-main\Sociovia
.venv\Scripts\python -c "from whatsapp import whatsapp_bp; print('WhatsApp module OK')"
```

### Step 2: Configure Meta Developer Account

1. Go to [Meta Developer Dashboard](https://developers.facebook.com/)
2. Select your App → WhatsApp → Configuration
3. **Webhook URL**: `https://sociovia-backend-362038465411.europe-west1.run.app/api/whatsapp/webhook`
4. **Verify Token**: `sociovia_wa_verify_2024`
5. Subscribe to events:
   - `messages`
   - `messaging_postbacks`
   - `message_template_status_update`

### Step 3: Get WhatsApp Business Account Access

You need to obtain:
1. **WABA ID** - WhatsApp Business Account ID
2. **Phone Number ID** - From Meta Business Manager
3. **System User Token** - Long-lived access token

Store in environment or pass via API:
```env
# These are passed per-request, not stored in .env
# WABA_ID=your_waba_id
# PHONE_NUMBER_ID=your_phone_number_id  
# ACCESS_TOKEN=your_system_user_token
```

### Step 4: Create Frontend (REQUIRED)

You need to create the frontend. Here's the structure:

```
frontend/
├── src/
│   └── whatsapp_automation/
│       ├── index.ts
│       ├── api/
│       │   ├── index.ts
│       │   └── whatsappApi.ts
│       ├── types/
│       │   └── index.ts
│       ├── components/
│       │   ├── index.ts
│       │   ├── MultiLocationPicker.tsx
│       │   ├── IceBreakersEditor.tsx
│       │   ├── MediaPicker.tsx
│       │   └── SelectPageModal.tsx
│       └── pages/
│           ├── index.ts
│           ├── EmbeddedSignupStub.tsx
│           ├── CreateCTWA.tsx
│           ├── ConversationsInbox.tsx
│           └── TemplateManager.tsx
```

---

## 📡 Backend API Endpoints

### Health Check
```
GET /api/whatsapp/health
Response: {"status": "ok", "module": "whatsapp"}
```

### WABA Management
```
POST /api/whatsapp/link-meta
Body: {
    "workspace_id": 123,
    "waba_id": "your_waba_id",
    "access_token": "your_token"
}

GET /api/whatsapp/waba?workspace_id=123
GET /api/whatsapp/phone-numbers?workspace_id=123
```

### Templates
```
POST /api/whatsapp/templates/sync
Body: {"workspace_id": 123}

GET /api/whatsapp/templates?workspace_id=123&status=APPROVED
```

### Messaging
```
POST /api/whatsapp/send-message
Body: {
    "workspace_id": 123,
    "to": "+911234567890",
    "type": "text",
    "text": {"body": "Hello!"}
}
```

### Conversations
```
GET /api/whatsapp/conversations?workspace_id=123&status=active&page=1
GET /api/whatsapp/conversations/{id}
POST /api/whatsapp/conversations/{id}/close
```

### Campaigns
```
GET /api/whatsapp/campaigns?workspace_id=123
POST /api/whatsapp/campaigns
Body: {
    "workspace_id": 123,
    "name": "Summer Sale",
    "objective": "OUTCOME_ENGAGEMENT",
    ...
}
POST /api/whatsapp/campaigns/{id}/publish
```

---

## 📱 Frontend API Client Template

Create `whatsappApi.ts`:

```typescript
const API_BASE = 'https://sociovia-backend-362038465411.europe-west1.run.app/api/whatsapp';

export const whatsappApi = {
  // Health check
  checkHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // WABA Management
  linkWABA: async (workspaceId: number, wabaId: string, accessToken: string) => {
    const res = await fetch(`${API_BASE}/link-meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        workspace_id: workspaceId,
        waba_id: wabaId,
        access_token: accessToken
      })
    });
    return res.json();
  },

  getWABA: async (workspaceId: number) => {
    const res = await fetch(`${API_BASE}/waba?workspace_id=${workspaceId}`, {
      credentials: 'include'
    });
    return res.json();
  },

  getPhoneNumbers: async (workspaceId: number) => {
    const res = await fetch(`${API_BASE}/phone-numbers?workspace_id=${workspaceId}`, {
      credentials: 'include'
    });
    return res.json();
  },

  // Templates
  syncTemplates: async (workspaceId: number) => {
    const res = await fetch(`${API_BASE}/templates/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workspace_id: workspaceId })
    });
    return res.json();
  },

  getTemplates: async (workspaceId: number, status?: string) => {
    const params = new URLSearchParams({ workspace_id: String(workspaceId) });
    if (status) params.append('status', status);
    const res = await fetch(`${API_BASE}/templates?${params}`, {
      credentials: 'include'
    });
    return res.json();
  },

  // Messaging
  sendTextMessage: async (workspaceId: number, to: string, text: string) => {
    const res = await fetch(`${API_BASE}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        workspace_id: workspaceId,
        to,
        type: 'text',
        text: { body: text }
      })
    });
    return res.json();
  },

  // Conversations
  getConversations: async (workspaceId: number, status?: string, page = 1) => {
    const params = new URLSearchParams({
      workspace_id: String(workspaceId),
      page: String(page)
    });
    if (status) params.append('status', status);
    const res = await fetch(`${API_BASE}/conversations?${params}`, {
      credentials: 'include'
    });
    return res.json();
  },

  getConversation: async (workspaceId: number, conversationId: number) => {
    const res = await fetch(
      `${API_BASE}/conversations/${conversationId}?workspace_id=${workspaceId}`,
      { credentials: 'include' }
    );
    return res.json();
  },

  closeConversation: async (workspaceId: number, conversationId: number) => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workspace_id: workspaceId })
    });
    return res.json();
  },

  // Campaigns
  getCampaigns: async (workspaceId: number) => {
    const res = await fetch(`${API_BASE}/campaigns?workspace_id=${workspaceId}`, {
      credentials: 'include'
    });
    return res.json();
  },

  createCampaign: async (payload: any) => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  publishCampaign: async (workspaceId: number, campaignId: number) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workspace_id: workspaceId })
    });
    return res.json();
  }
};
```

---

## 🧪 Testing Checklist

### Backend Verification
```powershell
# 1. Check module imports
.venv\Scripts\python -c "from whatsapp import whatsapp_bp; print('OK')"

# 2. Check database tables
.venv\Scripts\python check_db.py

# 3. Start server (separate terminal)
.venv\Scripts\python test.py

# 4. Test health endpoint
curl http://localhost:5000/api/whatsapp/health
```

### Frontend Verification
Once frontend is created:
```javascript
// In browser console
const health = await whatsappApi.checkHealth();
console.log(health); // Should show: {status: "ok", module: "whatsapp"}
```

---

## 🔥 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: cryptography` | `.venv\Scripts\pip install cryptography` |
| `FERNET_KEY not set` | Add to `.env`: `FERNET_KEY=your_generated_key` |
| `Webhook verification failed` | Check `WA_WEBHOOK_VERIFY_TOKEN` matches Meta config |
| `401 Unauthorized` | User not logged in, check session |
| `Database connection error` | Check `SQLALCHEMY_DATABASE_URI` in `.env` |

---

## 📂 Files Created/Modified

### New Files
- `Sociovia/migrations/run_whatsapp_migration.py` - Database migration script
- `Sociovia/check_db.py` - Database verification script
- `Sociovia/WHATSAPP_SETUP_GUIDE.md` - This guide

### Modified Files
- `Sociovia/.env` - Added WhatsApp environment variables
- `Sociovia/whatsapp/README.md` - Added quick start guide
- `Sociovia/test.py` - Fixed syntax error on line 9863

---

## 🎯 Next Steps

1. **Deploy Backend**: Push changes to your cloud provider
2. **Configure Meta Webhook**: Set callback URL to your deployed backend
3. **Create Frontend**: Build the React components described in your README
4. **Test E2E**: Link a WABA, sync templates, send test message

**Questions?** Check the detailed API documentation in `Sociovia/whatsapp/README.md`
