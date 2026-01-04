# 🚀 Sociovia – Complete SaaS Marketing OS & Business Automation Platform

> **An all-in-one enterprise-grade marketing automation platform combining WhatsApp Business, CRM, AI-powered campaign creation, Meta Ads management, and intelligent workflow automation.**

---

## 📋 Table of Contents

- [Platform Overview](#-platform-overview)
- [Core Capabilities](#-core-capabilities)
- [Feature Deep Dive](#-feature-deep-dive)
- [Technology Stack](#-technology-stack)
- [Architecture Overview](#-architecture-overview)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Deployment](#-deployment)
- [API Reference](#-api-reference)

---

## 🎯 Platform Overview

Sociovia is a comprehensive **multi-tenant SaaS platform** designed for businesses to manage their entire digital marketing and customer engagement ecosystem from a single dashboard. The platform integrates:

- **WhatsApp Business Cloud API** with AI-powered automation
- **Full-featured CRM** for leads, deals, contacts, and tasks
- **Meta/Facebook Ads** creation, management, and analytics
- **AI Campaign Builder** that generates ads from URLs
- **Visual Workflow Automation** with drag-and-drop builder
- **AI Assistant** for conversational analytics and task management
- **Multi-workspace** architecture for agencies and enterprises

---

## 🔥 Core Capabilities

### 1. 💬 WhatsApp Business Integration

| Feature | Description |
|---------|-------------|
| **Cloud API Messaging** | Send text, templates, media (image/video/audio/document), and interactive messages (buttons/lists) |
| **Conversation Inbox** | Unified inbox with real-time message sync, read receipts, and delivery status |
| **Template Management** | Create, validate, and send Meta-approved WhatsApp templates with dynamic parameters |
| **AI Chatbot** | Google Gemini-powered conversational AI with intent detection and context awareness |
| **Keyword Automation** | Trigger automated responses based on keywords, first messages, or business hours |
| **Interactive Flows** | Visual flow builder for multi-step conversations with buttons, conditions, and branching |
| **WhatsApp Flows** | Meta's encrypted dynamic flows with scheduled messages and data collection |
| **Drip Campaigns** | Automated message sequences triggered by events or schedules |
| **Analytics Dashboard** | Message delivery rates, read rates, template performance, and conversation metrics |
| **Multi-Account Support** | Manage multiple WhatsApp Business numbers per workspace |

### 2. 📊 CRM System

| Feature | Description |
|---------|-------------|
| **Lead Management** | Kanban board with drag-and-drop status updates, scoring, and activity tracking |
| **Contact Database** | Comprehensive contact profiles with tags, social links, and interaction history |
| **Deal Pipeline** | Visual sales pipeline with stages, probability tracking, and value forecasting |
| **Task Management** | Create, assign, and track tasks linked to leads, campaigns, or general activities |
| **Activity Timeline** | Complete history of emails, calls, meetings, notes, and status changes |
| **Campaign Tracking** | Link CRM entities to marketing campaigns with attributed conversions |
| **External Sync** | Sync leads from Meta Lead Forms, Zapier, and other sources with deduplication |
| **Custom Settings** | Per-workspace configuration with masked API keys and webhooks |

### 3. 📢 Meta Ads Management

| Feature | Description |
|---------|-------------|
| **Campaign Creation Wizard** | Step-by-step flow: Objective → Audience → Budget → Placements → Creative → Review |
| **Reach Estimation** | Real-time audience size and daily reach estimates via Meta API |
| **Targeting Builder** | Location (country/city), demographics (age/gender), interests, and behaviors |
| **Creative Editor** | Upload images, edit headlines/descriptions, preview ad formats |
| **Budget Optimization** | Daily/lifetime budgets with schedule controls |
| **Facebook Insights** | Campaign performance metrics, CPL, ROAS, CTR, and trend analysis |
| **Ad Account Linking** | Connect multiple Meta ad accounts per workspace |
| **Token Tracking** | Monitor API usage and costs for AI/Meta operations |

### 4. 🤖 AI-Powered Features

| Feature | Description |
|---------|-------------|
| **AI Campaign Builder** | Enter a URL → AI scrapes content → generates complete ad campaigns with images |
| **AI Image Generation** | Generate marketing creatives using Google Imagen with multiple themes |
| **Gemini Chat Assistant** | Floating AI assistant for analytics, tasks, calendar, and workflow suggestions |
| **AI Analytics Insights** | Automated recommendations based on campaign performance patterns |
| **Intent Classification** | Categorize customer messages into greeting, support, pricing, appointment, etc. |
| **Template Rewriting** | AI-assisted message template optimization |
| **Conversational AI** | Context-aware chatbot with configurable system prompts and safety settings |

### 5. 🔄 Workflow Automation

| Feature | Description |
|---------|-------------|
| **Visual Flow Builder** | Drag-and-drop canvas with ReactFlow for creating automation workflows |
| **Node Types** | Triggers, conditions, actions, approvals, selectors, notifications, AI nodes, analytics |
| **Template Library** | Pre-built workflow templates for common scenarios |
| **Assistant Integration** | AI suggests workflow modifications and can generate custom flows |
| **Validation Engine** | Real-time workflow validation with issue highlighting |
| **Execution Engine** | Background job scheduling with APScheduler |

### 6. 📈 Analytics & Reporting

| Feature | Description |
|---------|-------------|
| **Unified Dashboard** | Cross-workspace performance overview with charts and KPIs |
| **WhatsApp Analytics** | Message stats, template performance, conversation metrics by period |
| **Meta Campaign Metrics** | Spend, impressions, clicks, leads, CTR, CPM synced from Meta |
| **AI Usage Tracking** | Token consumption, costs, and usage by feature/model |
| **Export Capabilities** | Download reports as CSV with workspace filtering |
| **Real-time Charts** | Line charts, bar charts, pie charts with Recharts library |

### 7. 🏢 Multi-Tenant Architecture

| Feature | Description |
|---------|-------------|
| **Workspaces** | Isolated business units with their own data, users, and integrations |
| **User Roles** | Owner/admin controls with invite management |
| **Asset Management** | Per-workspace logos, creatives, and media library |
| **Social Account Linking** | Facebook Pages, Instagram, WhatsApp per workspace |
| **Ad Account Assignment** | Map multiple Meta ad accounts to workspaces |
| **Audit Logging** | Track all admin and user actions with timestamps |

---

## 🔍 Feature Deep Dive

### WhatsApp Automation Engine

The platform includes three automation engines:

1. **Keyword Automation Engine** (`automation_engine.py`)
   - Rule-based triggers on keywords, first messages, or all messages
   - Business hours awareness
   - Rate limiting per conversation
   - Priority ordering for multiple matching rules
   - AI fallback when no rules match

2. **Interactive Automation Engine** (`interactive_automation_engine.py`)
   - Visual flow execution with conversation state tracking
   - Button click handling and flow continuation
   - Multi-step forms with variable collection
   - Conditional branching based on user responses
   - Integration with AI responses at decision points

3. **Drip Campaign Engine** (`drip_engine.py`)
   - Scheduled message sequences
   - Event-triggered campaigns
   - Audience segmentation
   - Send time optimization

### WhatsApp Flows (Meta Encrypted Flows)

Full support for Meta's WhatsApp Flows:

- **RSA Encryption** – Generate and manage RSA-2048 key pairs for flow encryption
- **Dynamic Data Exchange** – Handle encrypted requests with custom business logic
- **Rate Limiting** – Per-tenant and global rate limiting with configurable thresholds
- **Signature Verification** – X-Hub-Signature-256 validation for security
- **Dynamic Handlers** – Appointment slots, product catalogs, promo code validation

### AI Chatbot Capabilities

Powered by Google Gemini with:

```
Features:
├── Intent Detection (8 categories)
│   ├── greeting, support, pricing, product
│   ├── complaint, appointment, order_status, other
├── Conversation Context (configurable history depth)
├── Safety Filters (harassment, hate speech, explicit content)
├── Fail-Safe Design (errors never break message flow)
├── Response Cleaning (removes markdown for WhatsApp)
├── Token Tracking (logs usage per request)
└── Custom System Prompts (per-account configuration)
```

### AI Campaign Builder Flow

```
1. URL Input → Scrapes website content
2. AI Analysis → Extracts brand, products, USPs
3. Theme Generation → Creates 3-6 distinct ad themes
4. Image Generation → Produces marketing visuals
5. Copy Generation → Headlines, descriptions, CTAs
6. Editor → User customizes generated content
7. Publish → Creates ad through Meta API
```

### CRM Data Model

```
Workspace
├── Leads
│   ├── status: new → contacted → qualified → proposal → closed
│   ├── scoring, source tracking, owner assignment
│   └── external sync: meta_leadgen, zapier, webhook
├── Contacts
│   ├── profiles with tags, social links, notes
│   └── interaction history and activity timeline
├── Deals
│   ├── stages: prospect → discovery → qualified → proposal → negotiation → won/lost
│   ├── value, probability, close date
│   └── linked contacts and companies
├── Tasks
│   ├── priority: low → medium → high
│   ├── due dates, completion tracking
│   └── linked to leads, campaigns, or general
├── Campaigns
│   ├── Meta campaign sync with metrics
│   └── CPL, ROAS, conversion tracking
└── Settings
    ├── API keys (masked in UI)
    ├── Webhooks configurations
    └── Notification preferences
```

### Ads Optimization Agent

Autonomous optimization agent (`agent.py`) that:

- Monitors campaign performance metrics
- Detects underperforming campaigns (low CTR, high frequency, budget overrun)
- Generates optimization recommendations (pause, scale, reallocate budget)
- Sends email approval requests to admins
- Applies changes via Meta API after approval
- Tracks all actions with audit logging

---

## 🛠 Technology Stack

### Backend (Python/Flask)

| Category | Technologies |
|----------|-------------|
| **Framework** | Flask 3.x with Blueprints |
| **Database** | SQLAlchemy 2.x ORM, SQLite/PostgreSQL/MySQL |
| **Authentication** | Flask-Session, Flask-Login, JWT tokens |
| **Background Jobs** | APScheduler |
| **External APIs** | WhatsApp Cloud API, Meta Graph API, Google Gemini, Imagen |
| **Security** | Werkzeug password hashing, itsdangerous tokens, CORS |
| **Email** | SMTP/SendGrid integration |
| **Validation** | Marshmallow, email-validator |
| **Other** | boto3 (AWS), Pillow (images), pycountry |

### Frontend (React/TypeScript)

| Category | Technologies |
|----------|-------------|
| **Framework** | React 18/19 with Vite 5, TypeScript 5 |
| **Styling** | Tailwind CSS 3, tailwindcss-animate |
| **UI Library** | shadcn-ui (Radix UI components) |
| **Routing** | react-router-dom v6 |
| **State** | Zustand, @tanstack/react-query |
| **Visualization** | ReactFlow (workflows), Recharts (analytics) |
| **Animations** | Framer Motion, Lottie |
| **Markdown** | react-markdown with remark-gfm |

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React SPA)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │
│  │Dashboard│ │   CRM   │ │WhatsApp │ │Campaigns│ │ Workflow Builder│ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘ │
└───────┼──────────┼──────────┼──────────┼─────────────────┼──────────┘
        │          │          │          │                 │
        └──────────┴──────────┴──────────┴─────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   apiClient.ts    │ cookies + credentials:include
                    └─────────┬─────────┘
                              │ HTTPS
┌─────────────────────────────▼───────────────────────────────────────┐
│                        BACKEND (Flask API)                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        Flask App (app.py)                       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │ │
│  │  │  Auth    │ │Workspaces│ │  Admin   │ │ Template Routes    │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────┐ │
│  │WhatsApp BP   │ │ CRM Routes   │ │ Meta Estimate / Ads Agent    │ │
│  │ - routes.py  │ │ - leads.py   │ │ - sociovia_meta_estimate.py  │ │
│  │ - services.py│ │ - contacts.py│ │ - agent.py                   │ │
│  │ - webhook.py │ │ - deals.py   │ │ - imagen.py                  │ │
│  │ - automation │ │ - tasks.py   │ └──────────────────────────────┘ │
│  │ - ai_chatbot │ │ - campaigns  │                                  │
│  │ - flows      │ │ - analytics  │                                  │
│  └──────────────┘ └──────────────┘                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     SQLAlchemy ORM                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
    ┌──────────────────────────┼──────────────────────────┐
    │                          │                          │
┌───▼───┐               ┌──────▼──────┐            ┌──────▼──────┐
│ SQLite│               │ PostgreSQL  │            │   MySQL     │
│(dev)  │               │ (production)│            │ (optional)  │
└───────┘               └─────────────┘            └─────────────┘

        ┌──────────────────────────────────────────────────┐
        │               EXTERNAL SERVICES                   │
        │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
        │  │ Meta API │ │ WhatsApp │ │ Google Gemini/   │  │
        │  │ (Ads,    │ │ Cloud API│ │ Imagen           │  │
        │  │ Insights)│ │          │ │                  │  │
        │  └──────────┘ └──────────┘ └──────────────────┘  │
        │  ┌──────────┐ ┌──────────┐                       │
        │  │  SMTP/   │ │  AWS S3  │                       │
        │  │ SendGrid │ │ (storage)│                       │
        │  └──────────┘ └──────────┘                       │
        └──────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (recommended for production) or SQLite (development)

### Backend Setup

```powershell
# Navigate to backend
cd backend\sociovia-28-11-2025-main\Sociovia

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (create .env file)
# See Environment Configuration section below

# Run backend
python main.py
# Server starts at http://127.0.0.1:5000
```

### Frontend Setup

```powershell
# Navigate to frontend
cd frontend\sociovia-launchpad-31-prabhu_4_12_2025

# Install dependencies
npm install

# Configure environment (create .env or .env.local)
echo "VITE_API_BASE=http://127.0.0.1:5000/api" > .env

# Run development server
npm run dev
# App available at http://127.0.0.1:5173
```

---

## ⚙️ Environment Configuration

### Backend (.env)

```env
# === Core Flask ===
FLASK_ENV=development
SECRET_KEY=your-secret-key
SESSION_SECRET=your-session-secret

# === Database ===
SQLALCHEMY_DATABASE_URI=sqlite:///instance/sociovia.db
# Production: postgresql://user:pass@host/db

# === App Settings ===
APP_BASE_URL=http://localhost:5000
VERIFY_TTL_MIN=15
ADMIN_LINK_TTL_HOURS=24
ADMIN_EMAILS=admin@your-domain.com

# === Email/SMTP ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=1

# === WhatsApp Cloud API ===
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token
WHATSAPP_APP_SECRET=your-app-secret
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_WABA_ID=your-business-account-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_API_VERSION=v22.0

# === Meta/Facebook ===
FB_ACCESS_TOKEN=your-fb-token
FB_AD_ACCOUNT_ID=act_1234567890
FB_PAGE_ID=your-page-id
FB_API_VERSION=v17.0

# === Google AI ===
GOOGLE_API_KEY=your-gemini-api-key
TEXT_MODEL=gemini-2.5-flash-preview-09-2025
IMAGE_MODEL=gemini-2.5-flash-image

# === Optional ===
USE_META_FALLBACK=true
DRY_RUN=true
```

### Frontend (.env)

```env
VITE_API_BASE=http://127.0.0.1:5000/api
```

---

## 🌐 Deployment

### Docker

```dockerfile
# Dockerfile included in backend
# Build: docker build -t sociovia-backend .
# Run: docker run -p 5000:5000 --env-file .env sociovia-backend
```

### Heroku / Railway / Render

```
# Procfile
web: gunicorn -b 0.0.0.0:$PORT main:app
```

### Production Checklist

- [ ] Switch to PostgreSQL for database
- [ ] Set secure SECRET_KEY and SESSION_SECRET
- [ ] Configure HTTPS with proper SSL certificates
- [ ] Set SameSite=None; Secure for cookies if cross-origin
- [ ] Update APP_BASE_URL to production domain
- [ ] Configure Meta webhook URLs in developer console
- [ ] Run database migrations
- [ ] Build frontend with `npm run build`
- [ ] Serve frontend from CDN or static host

---

## 📚 API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/signup` | POST | User registration |
| `/verify-email` | POST | Email verification with code |
| `/login` | POST | User login (sets session cookie) |
| `/logout` | GET | Clear session |
| `/api/status?email=` | GET | Check user status |

### WhatsApp

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whatsapp/send/text` | POST | Send text message |
| `/api/whatsapp/send/template` | POST | Send template message |
| `/api/whatsapp/send/media` | POST | Send image/video/audio/document |
| `/api/whatsapp/send/interactive` | POST | Send buttons or list message |
| `/api/whatsapp/conversations` | GET | List conversations |
| `/api/whatsapp/conversations/:id` | GET | Get conversation with messages |
| `/api/whatsapp/webhook` | GET/POST | Webhook verification and receiver |

### CRM

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leads` | GET/POST | List/create leads |
| `/api/leads/:id` | PATCH/DELETE | Update/delete lead |
| `/api/contacts` | GET/POST | List/create contacts |
| `/api/deals` | GET/POST | List/create deals |
| `/api/tasks` | GET/POST | List/create tasks |
| `/api/campaigns` | GET | List campaigns with metrics |
| `/api/dashboard/stats` | GET | Dashboard KPIs |

### Meta/Ads

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/meta/estimate` | POST | Get reach estimate for targeting |
| `/api/v1/generate` | POST | Generate ad creatives with AI |
| `/api/v1/generate/themes` | POST | Generate multiple themed images |

---

## 📁 Repository Structure

```
Sociovia_app/
├── README.md                    # This file
├── FLOWS_CREATION_GUIDE.md      # WhatsApp flows documentation
│
├── backend/
│   └── sociovia-28-11-2025-main/
│       └── Sociovia/
│           ├── app.py                    # Main Flask application
│           ├── main.py                   # Entry point
│           ├── models.py                 # Core SQLAlchemy models
│           ├── config.py                 # Configuration
│           ├── mailer.py                 # Email utilities
│           │
│           ├── whatsapp/                 # WhatsApp module
│           │   ├── routes.py             # API endpoints
│           │   ├── services.py           # WhatsApp Cloud API client
│           │   ├── webhook.py            # Webhook handler
│           │   ├── models.py             # WhatsApp data models
│           │   ├── automation_engine.py  # Keyword automation
│           │   ├── interactive_automation_engine.py  # Flow execution
│           │   ├── ai_chatbot.py         # Gemini AI integration
│           │   ├── flow_endpoint.py      # Encrypted flows
│           │   ├── template_*.py         # Template builders/validators
│           │   └── drip_*.py             # Drip campaigns
│           │
│           ├── SocioviaCrm/              # CRM module
│           │   ├── models.py             # CRM data models
│           │   ├── analytics.py          # Campaign metrics
│           │   └── routes/               # API endpoints
│           │       ├── leads.py
│           │       ├── contacts.py
│           │       ├── deals.py
│           │       ├── tasks.py
│           │       ├── campaigns.py
│           │       └── dashboard.py
│           │
│           ├── MetaHelpers/              # Meta API utilities
│           ├── sociovia_meta_estimate.py # Reach estimation
│           ├── agent.py                  # Ads optimization agent
│           ├── imagen.py                 # AI image generation
│           │
│           ├── templates/                # Jinja2 templates
│           ├── migrations/               # DB migrations
│           └── requirements.txt          # Python dependencies
│
└── frontend/
    └── sociovia-launchpad-.../
        ├── src/
        │   ├── App.tsx                   # Main app with routing
        │   ├── pages/                    # All page components
        │   │   ├── Dashboard.tsx         # Main dashboard
        │   │   ├── AICampaignBuilder.tsx # AI ad generator
        │   │   ├── WorkflowBuilder.tsx   # Visual automation
        │   │   ├── Assistant.tsx         # AI chat assistant
        │   │   └── ...
        │   │
        │   ├── whatsapp/                 # WhatsApp UI
        │   │   ├── pages/
        │   │   │   ├── WhatsAppAnalytics.tsx
        │   │   │   ├── WhatsAppAutomation.tsx
        │   │   │   ├── FlowBuilder.tsx
        │   │   │   └── ...
        │   │   └── components/
        │   │
        │   ├── crm/                      # CRM UI
        │   │   ├── pages/
        │   │   │   ├── Leads.tsx
        │   │   │   ├── Deals.tsx
        │   │   │   ├── Contacts.tsx
        │   │   │   └── ...
        │   │   └── components/
        │   │
        │   ├── components/               # Shared components
        │   │   ├── ui/                   # shadcn-ui components
        │   │   ├── workflow/             # Workflow builder components
        │   │   └── ai-campaign/          # Campaign builder components
        │   │
        │   ├── lib/                      # Utilities
        │   │   └── apiClient.ts          # HTTP client
        │   │
        │   └── config.ts                 # Frontend configuration
        │
        ├── package.json
        └── vite.config.ts
```

---

## 🤝 Contributing

This is a proprietary platform. For feature requests or bug reports, please contact the development team.

---

## 📄 License

Proprietary software. All rights reserved.

---

## 🔗 Related Documentation

- [WhatsApp Setup Guide](backend/sociovia-28-11-2025-main/Sociovia/WHATSAPP_SETUP_GUIDE.md)
- [WhatsApp Flows Guide](backend/sociovia-28-11-2025-main/Sociovia/whatsapp/FLOWS_README.md)
- [Multi-Tenant Architecture](backend/sociovia-28-11-2025-main/Sociovia/whatsapp/MULTI_TENANT_ARCHITECTURE.md)
- [Backend API Requirements](frontend/sociovia-launchpad-31-prabhu_4_12_2025/backend_requirements.md)
- [Flows Creation Guide](FLOWS_CREATION_GUIDE.md)

---

**Built with ❤️ by the Sociovia Team**
