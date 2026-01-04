# CRM Backend Requirements & API Specification

This document outlines the data models, API endpoints, and expected JSON structures required to power the Sociovia CRM Frontend.

## 1. Data Models (Database Schema Recommendations)

These models represent the core entities needed in your database.

### **Lead**
Represents a potential customer.
- `id`: String (UUID)
- `name`: String
- `email`: String (Unique)
- `phone`: String (Optional)
- `company`: String (Optional)
- `job_title`: String (Optional)
- `status`: Enum (`new`, `contacted`, `qualified`, `proposal`, `closed`)
- `source`: String (e.g., 'Facebook', 'LinkedIn', 'Manual')
- `score`: Integer (0-100) - AI or rule-based score.
- `value`: Float (Estimated deal value)
- `owner_id`: String (User ID of current assignee)
- `created_at`: Timestamp
- `updated_at`: Timestamp
- `last_interaction_at`: Timestamp

### **Contact**
Represents an established contact (can be linked to a Lead or separate).
- `id`: String (UUID)
- `name`: String
- `email`: String
- `role`: String
- `company`: String
- `last_contacted`: Timestamp
- `phone`: String (Optional)
- `notes`: Text (Optional)

### **Task**
Action items for users.
- `id`: String (UUID)
- `title`: String
- `description`: Text
- `due_date`: Date/Timestamp
- `priority`: Enum (`low`, `medium`, `high`)
- `completed`: Boolean
- `related_to_type`: Enum (`lead`, `campaign`, `general`)
- `related_to_id`: String (Optional ID of the lead/campaign)

### **Activity / Timeline Event**
Logs interactions for the "Recent Activity" feed in Lead/Contact Details.
- `id`: String (UUID)
- `entity_type`: Enum (`lead`, `contact`)
- `entity_id`: String (Foreign Key)
- `type`: Enum (`email_opened`, `page_visit`, `call`, `note_created`, `status_change`, `meeting`)
- `title`: String
- `description`: String
- `timestamp`: Timestamp

---

## 2. API Endpoints

### **A. Dashboard & Analytics**
**`GET /api/dashboard/stats`**
Returns aggregated KPIs.
**Query Params:**
- `startDate`: ISO Date (YYYY-MM-DD)
- `endDate`: ISO Date (YYYY-MM-DD)
*Backend should filter calculations based on this range.*

**Response:**
```json
{
  "revenue": { "value": 45231, "change": 20.1, "trend": "up" },
  "active_leads": { "value": 2350, "change": 15.2, "trend": "up" },
  "conversion_rate": { "value": 3.2, "change": -2.1, "trend": "down" },
  "link_clicks": { "value": 12234, "change": 8.4, "trend": "up" }
}
```

**`GET /api/dashboard/charts/revenue`**
Returns data for the Area Chart.
**Query Params:** `startDate`, `endDate`
**Response:**
```json
[
  { "date": "Mon", "value": 4000 },
  { "date": "Tue", "value": 3000 }
]
```

**`GET /api/dashboard/charts/sources`**
Returns data for the Bar Chart.
**Query Params:** `startDate`, `endDate`
**Response:**
```json
[
  { "name": "Google", "value": 400 },
  { "name": "Meta", "value": 300 }
]
```

### **B. Leads Management**
**`GET /api/leads`**
Fetch all leads. Support query params: `?status=new` or `?search=alice`.
**Response:**
```json
[
  {
    "id": "l-1",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "status": "new",
    "source": "Facebook Ad",
    "score": 85,
    "lastInteraction": "2024-03-10",
    "value": 1200
  }
]
```

**`POST /api/leads`**
Create a new lead.

**`PATCH /api/leads/:id`**
Update a lead (e.g., drag-and-drop status change).
**Body:** `{ "status": "contacted" }`

**`GET /api/leads/:id/activity`**
Fetch activity timeline for the generic "Lead Details" drawer.
**Response:**
```json
[
  { "id": "1", "title": "Opened Email", "timestamp": "2024-03-10T10:00:00Z", "type": "email_opened" }
]
```

### **C. Contacts Management**
**`GET /api/contacts`**
Fetch all contacts.

**`GET /api/contacts/:id`**
Fetch full contact details including notes and basic info.

**`GET /api/contacts/:id/history`**
Fetch interaction history for a specific contact.
**Response:** (Same structure as Lead Activity)

### **D. Campaigns (Meta Integration)**
The endpoint you provided (`/api/meta/campaign-insights`) is excellent for the raw data. The frontend expects a consolidated structure.

**`GET /api/campaigns`**
This should likely call your internal DB *or* proxy to Meta API and format the response to match our UI columns.
**Expected UI Model:**
```json
[
  {
    "id": "c-1",
    "name": "Summer Sale",
    "status": "active",
    "objective": "Sales",
    "spend": 12500,
    "impressions": 450000,
    "clicks": 12000,
    "leads": 450,
    "cpl": 27.7,
    "roas": 3.5
  }
]
```
*Note: Your `api_campaign_insights` function is already close to this. Ensure it returns `ROAS` (Revenue / Spend) and `CPL` (Spend / Leads) calculated fields.*

### **E. Tasks**
**`GET /api/tasks`**
**`POST /api/tasks`**
**`PATCH /api/tasks/:id`** (Toggle completion)

### **F. Settings**
**`GET /api/settings/config`**
Returns masked API keys and webhook URLs.

**`POST /api/settings/regenerate-key`**
Regenerates the API Key.

---

## 3. Integration Logic

### **Connecting Meta API to CRM**
1.  **Sync Job**: Ideally, the backend should verify/fetch data from Meta (`api_campaign_insights`) periodically (e.g., every 15 mins) and update the local `Campaign` table. This is faster for the UI than fetching from Meta continuously.
2.  **Webhooks**: Use the `Webhook URL` in Settings to receive real-time "Lead Gen" events from Meta. When a lead comes in from Facebook:
    - Receive payload on backend.
    - Create entry in `Lead` table.
    - Set `source` = "Facebook Ad".
    - Notify frontend (optional: websockets/SSE).

## 4. Immediate Next Steps for Backend Dev
1.  **Setup Database**: Create tables for `Lead`, `Task`, `Contact`.
2.  **Meta Wrapper**: Extend your `api_campaign_insights` to calculate derived metrics like ROAS (Revenue / Spend) and CPL (Spend / Leads).
3.  **Mock vs Real**: Start by returning the JSON structures above with dummy data from your Flask/Python app to verify the frontend connection, then connect the SQL queries.
4.  **Date Filtering**: Ensure `/stats` and `/charts` endpoints accept `startDate` and `endDate` parameters to support the dashboard date picker.
