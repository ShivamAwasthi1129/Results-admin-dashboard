# Damage Reports Module API & SOS Alert API Documentation

Base URL for all APIs: `https://results-admin-dashboard.vercel.app` (e.g. `GET /api/damage-reports`).

Authentication: Send JWT in header: `Authorization: Bearer <token>`.

---

## 1. Damage Reports Module API

The Damage Reports API manages property damage assessments, insurance claims, and repair workflows. It supports listing, creating, updating, and deleting damage reports, plus optional seeding.

### 1.1 List Damage Reports

**Endpoint:** `GET /api/damage-reports`

**Auth:** Required. Role must have `viewIncidents` permission (admin/super_admin).

**Query parameters:**

| Parameter    | Type   | Default | Description                                      |
|-------------|--------|---------|--------------------------------------------------|
| `page`      | number | 1       | Page number (1-based).                           |
| `limit`     | number | 20      | Items per page.                                  |
| `search`    | string | —       | Search in report number, customer name/email, address, description. |
| `status`    | string | —       | Filter by status (e.g. `report_created`, `completed`). |
| `damageType`| string | —       | Filter by damage type (e.g. `hurricane`, `flood`). |
| `severity`  | string | —       | Filter by severity (`minor`, `moderate`, `severe`, `catastrophic`). |
| `customerId`| string | —       | Filter by customer ID.                           |
| `city`      | string | —       | Filter by property city (case-insensitive match). |
| `state`     | string | —       | Filter by property state (case-insensitive match). |

**Example:**

```http
GET /api/damage-reports?page=1&limit=10&status=in_progress&damageType=flood
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "damageReports": [
      {
        "_id": "...",
        "id": "...",
        "reportNumber": "DR-2026-001",
        "reportDate": "2026-01-15T00:00:00.000Z",
        "customer": {
          "customerId": "...",
          "firstName": "Jane",
          "lastName": "Doe",
          "email": "jane@example.com",
          "phone": "+1..."
        },
        "customerFullName": "Jane Doe",
        "reportedBy": { "userId": "...", "name": "Admin", "email": "admin@example.com" },
        "propertyAddress": { "street": "123 Oak St", "city": "Houston", "state": "TX", "zipCode": "77001" },
        "damageType": "flood",
        "severity": "moderate",
        "status": "work_in_progress",
        "description": "...",
        "affectedAreas": ["Ground Floor", "Basement"],
        "estimatedCost": 28000,
        "actualCost": null,
        "fundingSources": [...],
        "totalFunding": 20000,
        "fundingPercentage": 71,
        "remainingFunding": 8000,
        "workflowSteps": [...],
        "currentStep": 6,
        "assignedAdjuster": { "adjusterId": "...", "fullName": "...", ... },
        "assignedVendors": [...],
        "totalVendorCost": 15000,
        "vendorWorkProgress": 50,
        "images": [],
        "notes": null,
        "tags": [],
        "priority": "high",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "pages": 5
    }
  }
}
```

**Error responses:** `401` Unauthorized, `403` Permission denied, `500` Server error.

---

### 1.2 Get Single Damage Report

**Endpoint:** `GET /api/damage-reports/:id`

**Auth:** Required. Role must have `viewIncidents` permission.

**Path:** `id` — MongoDB `_id` of the damage report.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "damageReport": {
      "_id": "...",
      "id": "...",
      "reportNumber": "DR-2026-001",
      "reportDate": "...",
      "customer": { ... },
      "customerFullName": "Jane Doe",
      "reportedBy": { ... },
      "propertyAddress": { ... },
      "damageType": "flood",
      "severity": "moderate",
      "status": "work_in_progress",
      "description": "...",
      "affectedAreas": [],
      "estimatedCost": 28000,
      "actualCost": null,
      "fundingSources": [],
      "totalFunding": 0,
      "fundingPercentage": 0,
      "remainingFunding": 28000,
      "workflowSteps": [
        {
          "stepNumber": 1,
          "name": "Report Created",
          "status": "completed",
          "startedAt": "...",
          "completedAt": "..."
        },
        {
          "stepNumber": 4,
          "name": "Adjuster Inspection & Approval",
          "status": "in_progress",
          "stepData": {
            "inspectionBudget": [
              { "taskName": "Roof Repair", "amount": 5000 },
              { "taskName": "HVAC Repair", "amount": 3000 }
            ]
          }
        }
      ],
      "currentStep": 4,
      "assignedAdjuster": { ... },
      "assignedVendors": [],
      "totalVendorCost": 0,
      "vendorWorkProgress": 0,
      "images": [],
      "notes": null,
      "tags": [],
      "priority": "high",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Error responses:** `401`, `403`, `404` Not found, `500`.

---

### 1.3 Create Damage Report (POST)

**Endpoint:** `POST /api/damage-reports`  
**Auth:** Required. Header: `Authorization: Bearer <token>`. Role must be `admin` or `super_admin`.  
**Content-Type:** `application/json`

**POST request payload (JSON body):**

Only these fields are used when creating a damage report (same as dashboard “Create damage report” form).

| Field              | Type   | Required | Description |
|--------------------|--------|----------|-------------|
| `customer`         | object | **Yes**  | Must include `customerId` (MongoDB User `_id`). Optionally `firstName`, `lastName`, `email`, `phone`, `address`. If only `customerId` is sent, server fetches name/email/phone from User model. |
| `propertyAddress`  | object | **Yes**  | Property address: `street`, `city`, `state`, `zipCode`. Optional: `country`. |
| `damageType`       | string | **Yes**  | One of: `hurricane`, `flood`, `wind`, `fire`, `earthquake`, `tornado`, `storm`, `hail`, `other`. |
| `severity`         | string | **Yes**  | One of: `minor`, `moderate`, `severe`, `catastrophic`. |
| `description`      | string | **Yes**  | Text description of damage. |
| `estimatedCost`    | number | No       | Default `0`. Sum of `fundingSources[].amount` must not exceed this if &gt; 0. |
| `fundingSources`   | array  | No       | Array of `{ "source": string, "amount": number }`. `source`: `insurance`, `fema`, `flood_insurance`, `non_profit`, `consolidated_non_profit`, `self_pay`, `other`. |
| `affectedAreas`    | array  | No       | Array of strings, e.g. `["Roof", "Basement", "HVAC"]`. |
| `reportNumber`     | string | No       | If omitted, auto-generated as `DR-YYYY-NNN`. |
| `reportDate`       | string | No       | ISO date string; default is now. |
| `images`           | array  | No       | Array of `{ "url": string, "alt?: string, "isPrimary?": boolean }`. |
| `reportedBy`       | object | No       | Default is current user: `{ "name", "email", "phone?" }`. |

**Example POST body:**

```json
{
  "customer": {
    "customerId": "507f1f77bcf86cd799439011"
  },
  "propertyAddress": {
    "street": "123 Oak Street",
    "city": "Houston",
    "state": "TX",
    "zipCode": "77001",
    "country": "USA"
  },
  "damageType": "flood",
  "severity": "moderate",
  "description": "Flood damage to ground floor and basement.",
  "estimatedCost": 28000,
  "affectedAreas": ["Ground Floor", "Basement", "HVAC"],
  "fundingSources": [
    { "source": "flood_insurance", "amount": 20000 },
    { "source": "self_pay", "amount": 5000 }
  ],
  "images": [
    { "url": "https://example.com/photo1.jpg", "alt": "Damage photo 1", "isPrimary": true }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Damage report created successfully",
  "data": {
    "damageReport": {
      "_id": "...",
      "reportNumber": "DR-2026-001",
      "customerFullName": "Jane Doe",
      "totalFunding": 25000,
      "fundingPercentage": 89,
      "remainingFunding": 3000,
      "totalVendorCost": 0,
      "vendorWorkProgress": 0,
      ...
    }
  }
}
```

**Error responses:** `400` (validation: missing customer/property/damageType/severity/description, funding > cost, duplicate report number, customer not found), `401`, `403`, `500`.

---

### 1.4 Update Damage Report

**Endpoint:** `PUT /api/damage-reports/:id`

**Auth:** Required. Role must be `admin` or `super_admin`.

**Path:** `id` — MongoDB `_id` of the damage report.

**Request body (JSON):** Partial update. All fields optional. Key behaviors:

- **Workflow steps:** Sent as full array; server **merges** with existing steps so nested `stepData` (e.g. Step 4 `inspectionBudget`) is preserved when not sent. Step 4 `inspectionBudget` is normalized as `[{ taskName, amount }, ...]`.
- **Assigned adjuster:** If provided, server updates Step 3 snapshot, may set step 3 completed, and syncs `Adjuster.assignedReports`. Approval status changes update adjuster’s report status.
- **Assigned vendors:** Array of vendor assignments; new vendors get `assignedDate`/`assignedBy`; status changes (e.g. `in_progress`, `completed`) update timestamps. Report status can move to `work_in_progress` or `completed` based on vendor statuses.
- **Report number:** If changed, must be unique.

**Common payload shapes:**

- Update basic info: `propertyAddress`, `damageType`, `severity`, `description`, `estimatedCost`, `fundingSources`, `affectedAreas`, `images`, `status`, `notes`, `priority`.
- Update workflow only: `workflowSteps` (and optionally `currentStep`; server can derive from completed steps).
- Step 4 budget only: send `workflowSteps` with step 4 containing `stepData.inspectionBudget: [{ taskName, amount }, ...]`.
- Assign adjuster: `assignedAdjuster: { adjusterId, fullName, email?, phone?, companyName?, approvalStatus? }`.
- Assign vendors: `assignedVendors: [{ vendorId, businessName, taskName?, estimatedCost, status, ... }]`.

**Response (200):**

```json
{
  "success": true,
  "message": "Damage report updated successfully",
  "data": {
    "damageReport": {
      "_id": "...",
      "id": "...",
      "reportNumber": "DR-2026-001",
      "customerFullName": "Jane Doe",
      "totalFunding": 25000,
      "fundingPercentage": 89,
      "remainingFunding": 3000,
      "totalVendorCost": 15000,
      "vendorWorkProgress": 50,
      "workflowSteps": [...],
      "currentStep": 6,
      ...
    }
  }
}
```

**Error responses:** `400` (e.g. duplicate report number), `401`, `403`, `404`, `500`.

---

### 1.5 Delete Damage Report

**Endpoint:** `DELETE /api/damage-reports/:id`

**Auth:** Required. Only `super_admin` can delete.

**Path:** `id` — MongoDB `_id` of the damage report.

**Side effects:** If the report had an `assignedAdjuster`, the Adjuster document is updated: report is removed from `assignedReports` and `currentActiveReports` is decremented.

**Response (200):**

```json
{
  "success": true,
  "message": "Damage report deleted successfully"
}
```

**Error responses:** `401`, `403`, `404`, `500`.

---

### 1.6 Seed Damage Reports

**Endpoint:** `POST /api/damage-reports/seed`

**Auth:** Required. Only `super_admin` can seed.

**Request body:** None (optional empty JSON).

**Behavior:**

1. Fetches customers from external API (`EXTERNAL_CUSTOMERS_API_URL`).
2. Fetches existing adjusters and service providers (vendors) from DB.
3. Deletes all existing damage reports.
4. Creates **12** damage reports using templates; multiple reports per customer (customers 0–2 repeated). Some reports get assignees and vendors; Step 4 inspection budgets are generated from affected areas.
5. Syncs `Adjuster.assignedReports` for reports that have an assigned adjuster.

**Response (200):**

```json
{
  "success": true,
  "message": "Successfully seeded 12 damage reports using external API customers and existing adjusters/vendors.",
  "data": {
    "damageReportsCount": 12,
    "source": "EXTERNAL_CUSTOMERS_API_URL",
    "reports": [
      {
        "reportNumber": "DR-2026-001",
        "customerName": "Jane Doe",
        "customerId": "...",
        "status": "report_created",
        "damageType": "hurricane",
        "hasAdjuster": false,
        "vendorCount": 0
      }
    ]
  }
}
```

**Error responses:** `400` (no users from external API), `401`, `403`, `502` (external API failure), `500`.

---

### 1.7 Clear Damage Reports (Seed Data)

**Endpoint:** `DELETE /api/damage-reports`  
**Not implemented.** Only per-report delete is available (`DELETE /api/damage-reports/:id`).  
To clear all, call delete for each report or use a dedicated clear/seed script.

---

### 1.8 CORS & OPTIONS

All damage report routes send CORS headers when applicable.  
`OPTIONS` is supported for preflight on the same paths.

---

## 2. SOS Alert API

**Base path:** `POST /api/sos-alerts` (create), `GET /api/sos-alerts` (list), `GET /api/sos-alerts/:id` (get one), `PUT /api/sos-alerts/:id` (update), `DELETE /api/sos-alerts/:id` (delete).

**Auth:**  
- **POST (create):** Optional. Mobile can create SOS without token; dashboard sends `Authorization: Bearer <token>`.  
- **GET / PUT / DELETE:** Required. Header: `Authorization: Bearer <token>`. Role must have `viewIncidents` permission.

---

### 2.1 Create SOS Alert (POST)

**Endpoint:** `POST /api/sos-alerts`  
**Content-Type:** `application/json`

**POST request payload (JSON body):**

Only these fields are used when creating an SOS alert (same as dashboard “Create New SOS Alert” form).

| Field              | Type   | Required | Description |
|--------------------|--------|----------|-------------|
| `name`             | string | **Yes**  | Full name of person in distress. |
| `phone`            | string | **Yes**  | Phone number. |
| `message`          | string | **Yes**  | Emergency message / description. |
| `email`            | string | No       | Email. |
| `photo`            | string | No       | Photo URL. |
| **Location** (one of the two below) | | | |
| `location`         | object | No*      | `{ "lat", "lng", "address", "city", "state", "zipcode" }`. *If omitted, use flat fields. |
| `address` / `city` / `state` / `zipcode` | string | No | Flat location fields (alternative to `location`). |
| `type`             | string | No       | One of: `medical`, `rescue`, `evacuation`, `food_water`, `shelter`, `fire`, `other`. Default `other`. |
| `priority`         | string | No       | One of: `critical`, `high`, `medium`, `low`. Default `high`. |
| `peopleCount`      | number | No       | Number of people; default `1`. |
| **Medical (optional)** | | | |
| `bloodType`        | string | No       | e.g. `A+`, `O+`. |
| `allergies`        | string or array | No | Comma-separated string or array of strings. |
| `medications`       | string or array | No | Comma-separated string or array of strings. |
| `conditions`       | string or array | No | Comma-separated string or array of strings. |
| `emergencyContact` | object | No       | `{ "name", "phone", "relation" }`. |
| **Wearable device (optional)** | | | |
| `wearableDeviceId` | string | No       | Device ID. |
| `wearableType`     | string | No       | One of: `smartwatch`, `fitness_tracker`, `medical_alert`, `gps_tracker`. |
| `wearableDevice`   | object | No       | Full object: `{ "id", "type", "brand?", "model?", "batteryLevel?", "lastSync?", "isOnline?" }`. |

**Example POST body (nested location):**

```json
{
  "name": "John Smith",
  "phone": "+1 (305) 555-0123",
  "email": "john@example.com",
  "photo": "https://example.com/photo.jpg",
  "location": {
    "lat": 25.762,
    "lng": -80.1915,
    "address": "123 Ocean Drive",
    "city": "Miami",
    "state": "FL",
    "zipcode": "33139"
  },
  "type": "medical",
  "priority": "critical",
  "message": "Stuck on rooftop due to flash flooding. Family of 4 needs immediate rescue.",
  "peopleCount": 4,
  "bloodType": "A+",
  "allergies": "Penicillin, Peanuts",
  "medications": "Lisinopril",
  "conditions": "Hypertension",
  "emergencyContact": {
    "name": "Jane Smith",
    "phone": "+1 (305) 555-0124",
    "relation": "Wife"
  },
  "wearableDeviceId": "WD-001",
  "wearableType": "smartwatch"
}
```

**Example POST body (flat location, minimal):**

```json
{
  "name": "Jane Doe",
  "phone": "+1 (713) 555-0000",
  "message": "Need medical assistance immediately.",
  "address": "456 Main Street",
  "city": "Houston",
  "state": "TX",
  "zipcode": "77002",
  "type": "medical",
  "priority": "high"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "SOS alert created successfully",
  "data": {
    "alert": {
      "id": "...",
      "_id": "...",
      "name": "John Smith",
      "phone": "+1 (305) 555-0123",
      "message": "...",
      "location": { "lat", "lng", "address", "city", "state", "zipcode" },
      "type": "medical",
      "priority": "critical",
      "status": "pending",
      "peopleCount": 4,
      "medicalInfo": { ... },
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Error responses:** `400` (missing `name`, `phone`, or `message`), `500`.

---

## Summary

| API               | Base path              | POST create | Notes |
|-------------------|------------------------|------------|-------|
| Damage Reports    | `/api/damage-reports`  | Yes        | POST body: `customer`, `propertyAddress`, `damageType`, `severity`, `description` (required); optional: `estimatedCost`, `fundingSources`, `affectedAreas`, `images`. Auth required. |
| SOS Alerts        | `/api/sos-alerts`      | Yes        | POST body: `name`, `phone`, `message` (required); optional: `email`, `photo`, `location` or flat `address`/`city`/`state`/`zipcode`, `type`, `priority`, `peopleCount`, medical and wearable fields. Auth optional for POST. |

- **Damage report POST:** `Authorization: Bearer <token>` required (admin/super_admin).  
- **SOS alert POST:** `Authorization` optional (mobile can create without login); GET/PUT/DELETE require token.
