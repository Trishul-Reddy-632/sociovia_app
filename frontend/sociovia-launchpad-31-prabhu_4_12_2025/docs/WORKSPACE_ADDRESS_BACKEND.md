# Workspace Address Fields - Backend Implementation Guide

## Overview

This document outlines the backend changes required to support the new address structure in the workspace setup form. The frontend has been updated to replace the single `registered_address` field with structured address fields.

## Frontend Changes Summary

The `WorkspaceSetup.tsx` form now sends the following address structure:

```typescript
interface AddressInfo {
  address_line: string;  // Street address, building, floor
  city: string;          // City name
  district: string;      // District/State (optional)
  pin_code: string;      // Postal/ZIP code
  country: string;       // Country name
}
```

## API Payload Structure

The frontend sends data via `multipart/form-data` with these address-related fields:

### JSON Object (nested)
```json
{
  "address": {
    "address_line": "123 Business Park, Tower A, Floor 5",
    "city": "Mumbai",
    "district": "Mumbai Suburban",
    "pin_code": "400001",
    "country": "India"
  }
}
```

### Individual Fields (for backward compatibility)
```
address_line=123 Business Park, Tower A, Floor 5
city=Mumbai
district=Mumbai Suburban
pin_code=400001
country=India
registered_address=123 Business Park, Tower A, Floor 5, Mumbai, Mumbai Suburban, 400001, India
```

## Backend Implementation Steps

### 1. Database Schema Changes

#### Option A: Add new columns to existing workspace table

```sql
-- PostgreSQL / MySQL
ALTER TABLE workspaces 
  ADD COLUMN address_line VARCHAR(500),
  ADD COLUMN city VARCHAR(100),
  ADD COLUMN district VARCHAR(100),
  ADD COLUMN pin_code VARCHAR(20),
  ADD COLUMN country VARCHAR(100) DEFAULT 'India';

-- Create index for common queries
CREATE INDEX idx_workspaces_city ON workspaces(city);
CREATE INDEX idx_workspaces_country ON workspaces(country);
CREATE INDEX idx_workspaces_pin_code ON workspaces(pin_code);
```

#### Option B: Create separate address table (normalized)

```sql
CREATE TABLE workspace_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  address_line VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100),
  pin_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workspace_addresses_workspace ON workspace_addresses(workspace_id);
CREATE INDEX idx_workspace_addresses_city ON workspace_addresses(city);
```

### 2. API Endpoint Updates

#### Endpoint: `POST /api/workspace/setup`

Update the request validation to accept the new address fields:

```python
# Python/FastAPI example
from pydantic import BaseModel, Field
from typing import Optional

class AddressInfo(BaseModel):
    address_line: str = Field(..., min_length=5, max_length=500)
    city: str = Field(..., min_length=2, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    pin_code: str = Field(..., min_length=4, max_length=20)
    country: str = Field(default="India", max_length=100)

class WorkspaceSetupRequest(BaseModel):
    business_name: str
    business_type: str
    address: AddressInfo  # New structured field
    # Keep for backward compatibility
    registered_address: Optional[str] = None
    address_line: Optional[str] = None  # Individual field fallback
    city: Optional[str] = None
    district: Optional[str] = None
    pin_code: Optional[str] = None
    country: Optional[str] = None
    # ... other fields
```

```javascript
// Node.js/Express example
const Joi = require('joi');

const addressSchema = Joi.object({
  address_line: Joi.string().min(5).max(500).required(),
  city: Joi.string().min(2).max(100).required(),
  district: Joi.string().max(100).allow('', null),
  pin_code: Joi.string().min(4).max(20).required(),
  country: Joi.string().max(100).default('India')
});

const workspaceSetupSchema = Joi.object({
  business_name: Joi.string().required(),
  business_type: Joi.string().required(),
  address: addressSchema,
  // Backward compatibility fields
  registered_address: Joi.string().allow('', null),
  address_line: Joi.string().allow('', null),
  city: Joi.string().allow('', null),
  district: Joi.string().allow('', null),
  pin_code: Joi.string().allow('', null),
  country: Joi.string().allow('', null),
  // ... other fields
});
```

### 3. Request Processing Logic

```python
# Python example - handling both formats
def process_workspace_setup(request_data: dict):
    # Try to get structured address first
    address = request_data.get('address')
    
    if address and isinstance(address, str):
        # JSON string from form data
        address = json.loads(address)
    
    # Fallback to individual fields if nested object not present
    if not address:
        address = {
            'address_line': request_data.get('address_line', ''),
            'city': request_data.get('city', ''),
            'district': request_data.get('district', ''),
            'pin_code': request_data.get('pin_code', ''),
            'country': request_data.get('country', 'India'),
        }
    
    # Legacy fallback - parse registered_address if nothing else
    if not address.get('address_line') and request_data.get('registered_address'):
        parts = request_data['registered_address'].split(',')
        address['address_line'] = parts[0].strip() if len(parts) > 0 else ''
        address['city'] = parts[1].strip() if len(parts) > 1 else ''
        address['district'] = parts[2].strip() if len(parts) > 2 else ''
        address['pin_code'] = parts[3].strip() if len(parts) > 3 else ''
        address['country'] = parts[4].strip() if len(parts) > 4 else 'India'
    
    return address
```

### 4. Validation Rules

Add these validation error codes to your API:

```python
ERROR_CODES = {
    'address_line_required': 'Address line is required',
    'address_line_too_short': 'Address line must be at least 5 characters',
    'city_required': 'City is required',
    'city_too_short': 'City must be at least 2 characters',
    'pin_code_required': 'Pin code is required',
    'pin_code_invalid': 'Pin code format is invalid',
    'country_required': 'Country is required',
}
```

### 5. Response Format

Update your API response to include the address structure:

```json
{
  "ok": true,
  "workspace": {
    "id": "uuid-here",
    "business_name": "Acme Corp",
    "address": {
      "address_line": "123 Business Park",
      "city": "Mumbai",
      "district": "Mumbai Suburban",
      "pin_code": "400001",
      "country": "India"
    },
    "registered_address": "123 Business Park, Mumbai, Mumbai Suburban, 400001, India"
  }
}
```

### 6. Migration Script

For existing data, create a migration to populate new fields from `registered_address`:

```python
# Python migration script
def migrate_addresses():
    workspaces = db.query("SELECT id, registered_address FROM workspaces WHERE address_line IS NULL")
    
    for ws in workspaces:
        if ws.registered_address:
            parts = [p.strip() for p in ws.registered_address.split(',')]
            
            db.execute("""
                UPDATE workspaces 
                SET address_line = %s,
                    city = %s,
                    district = %s,
                    pin_code = %s,
                    country = %s
                WHERE id = %s
            """, (
                parts[0] if len(parts) > 0 else '',
                parts[1] if len(parts) > 1 else '',
                parts[2] if len(parts) > 2 else '',
                parts[3] if len(parts) > 3 else '',
                parts[4] if len(parts) > 4 else 'India',
                ws.id
            ))
    
    db.commit()
```

## API Testing

### cURL Example

```bash
curl -X POST "https://your-api.com/api/workspace/setup" \
  -H "Content-Type: multipart/form-data" \
  -F "business_name=Acme Corp" \
  -F "business_type=Pvt Ltd" \
  -F 'address={"address_line":"123 Business Park","city":"Mumbai","district":"Mumbai Suburban","pin_code":"400001","country":"India"}' \
  -F "address_line=123 Business Park" \
  -F "city=Mumbai" \
  -F "district=Mumbai Suburban" \
  -F "pin_code=400001" \
  -F "country=India" \
  -F "industry=Technology" \
  -F "logo=@/path/to/logo.png"
```

## Checklist

- [ ] Add new columns to database (address_line, city, district, pin_code, country)
- [ ] Create database indexes for search/filter operations
- [ ] Update API validation schema
- [ ] Add request processing logic for both nested and flat formats
- [ ] Update API response to include address structure
- [ ] Add new validation error codes
- [ ] Create migration script for existing data
- [ ] Update API documentation
- [ ] Add unit tests for new validation rules
- [ ] Test backward compatibility with old clients

## Notes

- The frontend sends both the nested `address` object (JSON stringified) and individual fields for maximum compatibility
- The `registered_address` field is still sent as a combined string for backward compatibility
- District field is optional
- Country defaults to "India" if not specified
