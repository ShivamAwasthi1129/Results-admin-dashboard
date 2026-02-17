# Volunteer API Documentation

This document describes the **Volunteer APIs** for mobile app integration. Use it when the backend is hosted (e.g. `https://your-domain.com`). All API base URLs below are relative to that host.

---

## Table of Contents

1. [Base URL & Authentication](#base-url--authentication)
2. [Authentication (Login)](#1-authentication-login)
3. [Get Volunteer Data (Profile)](#2-get-volunteer-data-profile)
4. [Mobile Tasks (Assigned Disasters)](#3-mobile-tasks-assigned-disasters)
5. [Data Models & Enums](#5-data-models--enums)
6. [Error Responses](#6-error-responses)
7. [Hosting Checklist](#7-hosting-checklist)

---

## Base URL & Authentication

- **Base URL:** `https://<YOUR_HOSTED_DOMAIN>`
- **API prefix:** All endpoints are under `/api/...` (e.g. `https://your-domain.com/api/volunteers/mobile-login`).

### How authentication works

1. **Login** (no auth required): `POST /api/volunteers/mobile-login` with `email` or `volunteerId` + `password`.
2. **Response** includes a **JWT `token`**. The mobile app must store this token securely.
3. **Authenticated requests:** Send the token in the **Authorization** header:
   ```http
   Authorization: Bearer <token>
   ```
4. **Token expiry:** Default is **7 days**. After expiry, the user must log in again.

---

## 1. Authentication (Login)

Volunteers log in with either their **6-digit Volunteer ID** or **email** and password. No auth header is required for this endpoint.

### Endpoint

```http
POST /api/volunteers/mobile-login
Content-Type: application/json
```

### Request body

| Field        | Type   | Required | Description                                      |
|-------------|--------|----------|--------------------------------------------------|
| `password`  | string | Yes      | Volunteer's password                             |
| `volunteerId` | string | No*      | 6-digit volunteer ID (e.g. `"123456"`)          |
| `email`     | string | No*      | Volunteer's registered email (case-insensitive)  |

\* Exactly one of `volunteerId` or `email` is required.


**Example (login with email):**
```json
{
  "email": "volunteer@example.com",
  "password": "your_password"
}
```

### Success response (200)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "volunteer": {
      "_id": "507f1f77bcf86cd799439011",
      "volunteerId": "123456",
      "userId": "507f1f77bcf86cd799439012",
      "firstName": "John",
      "lastName": "Doe",
      "name": "John Doe",
      "email": "volunteer@example.com",
      "phone": "+1234567890",
      "availability": "available",
      "status": "active",
      "address": { "street": "", "city": "", "state": "", "zipCode": "", "country": "United States" },
      "skills": ["First Aid", "Search and Rescue"],
      "profileImage": ""
    }
  }
}
```

- **`data.token`** — JWT to use in `Authorization: Bearer <token>` for all protected endpoints.
- **`data.volunteer`** — Current volunteer profile; can be used to show the user in the app without an extra GET call.

### Error responses

| Status | Body example | Cause |
|--------|--------------|--------|
| 400 | `{ "success": false, "error": "Password is required" }` | Missing password |
| 400 | `{ "success": false, "error": "Either volunteerId or email is required" }` | Neither volunteerId nor email sent |
| 401 | `{ "success": false, "error": "Invalid volunteer ID or email" }` | No volunteer/user found |
| 401 | `{ "success": false, "error": "Invalid password" }` | Wrong password |
| 403 | `{ "success": false, "error": "Account is not active. Please contact administrator." }` | User status is not `active` |
| 500 | `{ "success": false, "error": "Internal server error" }` | Server error |

---

## 2. Get Volunteer Data (Profile)

Use this to **fetch or refresh** a volunteer’s full profile. Useful after login to get detailed fields (e.g. address, skills, assignments) or to show another volunteer’s public profile.

- **No auth required** for these GET endpoints.
- `volunteerId` in the path can be either the **6-digit volunteer ID** (e.g. `123456`) or the volunteer’s **MongoDB `_id`**.

### Endpoint (use either)

```http
GET /api/volunteers/by-id/{volunteerId}
```
or
```http
GET /api/volunteers/public/{volunteerId}
```

Replace `{volunteerId}` with the 6-digit ID or MongoDB `_id` (e.g. `GET /api/volunteers/by-id/123456`).

### Success response (200)

```json
{
  "success": true,
  "data": {
    "volunteer": {
      "_id": "507f1f77bcf86cd799439011",
      "volunteerId": "123456",
      "userId": "507f1f77bcf86cd799439012",
      "firstName": "John",
      "lastName": "Doe",
      "name": "John Doe",
      "email": "volunteer@example.com",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-15T00:00:00.000Z",
      "gender": "male",
      "bloodGroup": "O+",
      "profileImage": "",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "United States"
      },
      "skills": ["First Aid", "Search and Rescue"],
      "specializations": [],
      "languages": ["English", "Spanish"],
      "experience": { "years": 2, "description": "Disaster response" },
      "availability": "available",
      "availabilitySchedule": {
        "weekdays": true,
        "weekends": true,
        "nights": false,
        "preferredShift": "any"
      },
      "assignedDisasters": [
        {
          "disasterId": "507f1f77bcf86cd799439013",
          "fromDate": "2025-02-01T00:00:00.000Z",
          "toDate": "2025-02-15T00:00:00.000Z",
          "status": "active",
          "assignedAt": "2025-01-28T10:00:00.000Z"
        }
      ],
      "emergencyContact": { "name": "", "phone": "", "relation": "", "email": "" },
      "hasOwnVehicle": false,
      "vehicleType": "none",
      "vehicleNumber": "",
      "status": "active",
      "team": {
        "_id": "...",
        "teamId": "T001",
        "name": "Response Team A",
        "specialization": "Search and Rescue"
      }
    }
  }
}
```

### Error responses

| Status | Body example |
|--------|--------------|
| 400 | `{ "success": false, "error": "Volunteer ID is required" }` |
| 404 | `{ "success": false, "error": "Volunteer not found" }` |
| 500 | `{ "success": false, "error": "Internal server error" }` |

**Mobile flow suggestion:** After login, you already have `data.volunteer` and `data.volunteer.volunteerId`. To refresh full profile (e.g. on profile screen), call `GET /api/volunteers/by-id/<data.volunteer.volunteerId>`.

---

## 3. Mobile Tasks (Assigned Disasters)

All task endpoints **require** the volunteer to be logged in. Send the JWT in the header:

```http
Authorization: Bearer <token>
```

The backend resolves the volunteer by `userId` inside the token; only that volunteer’s tasks are returned or updated.

---

### 3.1 List tasks (summary + active tasks)

Returns a summary (active/completed counts, rating) and the list of **active** assigned tasks.

```http
GET /api/mobile/tasks
Authorization: Bearer <token>
```

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "summary": {
      "activeTaskCount": 2,
      "completedTaskCount": 5,
      "responseRating": "4.2/5",
      "responseRatingValue": 4.2
    },
    "tasks": [
      {
        "taskId": "507f1f77bcf86cd799439013",
        "assignmentId": "507f1f77bcf86cd799439013",
        "title": "Flood Relief - Downtown",
        "description": "New situation reported close to your location.",
        "priority": "High",
        "status": "active",
        "thumbnailImageUrl": null,
        "fromDate": "2025-02-01T00:00:00.000Z",
        "toDate": "2025-02-15T00:00:00.000Z",
        "assignedAt": "2025-01-28T10:00:00.000Z"
      }
    ]
  }
}
```

- **`summary.activeTaskCount`** — Number of current (non-completed) assignments.
- **`summary.completedTaskCount`** — Number of completed tasks.
- **`summary.responseRating`** — Display string (e.g. "4.2/5"); **`responseRatingValue`** — Numeric for charts/logic.
- **`tasks`** — Only tasks that are still active (not completed/cancelled). Each item includes `taskId` (disaster ID) for use in detail and accept/decline.

**Errors:** `401 Unauthorized` if missing/invalid token or not volunteer; `404 Volunteer not found`; `500` on server error.

---

### 3.2 Get single task detail

Returns full details for one assigned disaster. Only allowed if that disaster is assigned to the logged-in volunteer.

```http
GET /api/mobile/tasks/{disasterId}
Authorization: Bearer <token>
```

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "taskId": "507f1f77bcf86cd799439013",
    "title": "Flood Relief - Downtown",
    "description": "Assist with evacuation and distribution.",
    "priority": "High",
    "status": "active",
    "thumbnailImageUrl": null,
    "fromDate": "2025-02-01T00:00:00.000Z",
    "toDate": "2025-02-15T00:00:00.000Z",
    "assignedAt": "2025-01-28T10:00:00.000Z",
    "location": { "address": "...", "city": "...", "state": "...", "coordinates": { "lat": 40.7, "lng": -74.0 } },
    "type": "flood",
    "severity": "high"
  }
}
```

**Errors:** `400` if `disasterId` missing or invalid; `401` Unauthorized; `404` if task not found or not assigned to this volunteer.

---

### 3.3 Accept task

Marks an assigned task as **accepted** (status becomes `active`). Idempotent if already accepted.

```http
POST /api/mobile/tasks/accept
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body:**

```json
{
  "disasterId": "507f1f77bcf86cd799439013"
}
```

**Success response (200):**

```json
{
  "success": true,
  "message": "Task accepted successfully",
  "data": { "disasterId": "507f1f77bcf86cd799439013", "status": "active" }
}
```

If already accepted:

```json
{
  "success": true,
  "message": "Task already accepted",
  "data": { "disasterId": "507f1f77bcf86cd799439013", "status": "active" }
}
```

**Errors:** `400` if `disasterId` missing or invalid, or task is cancelled/completed; `401` Unauthorized; `404` if task not found or not assigned to this volunteer.

---

### 3.4 Decline task

Declines an assigned task (status becomes `cancelled`). Completed tasks cannot be declined.

```http
POST /api/mobile/tasks/decline
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body:**

```json
{
  "disasterId": "507f1f77bcf86cd799439013"
}
```

**Success response (200):**

```json
{
  "success": true,
  "message": "Task declined successfully",
  "data": { "disasterId": "507f1f77bcf86cd799439013", "status": "cancelled" }
}
```

**Errors:** `400` if task is completed or invalid `disasterId`; `401` Unauthorized; `404` if task not found or not assigned to this volunteer.

---

## 5. Data Models & Enums

### Volunteer availability

| Value        | Description     |
|-------------|-----------------|
| `available` | Ready for tasks |
| `on_mission` | Currently on assignment |
| `unavailable` | Not available |
| `on_leave`  | On leave        |

### Assignment status

| Value       | Description        |
|------------|--------------------|
| `assigned` | Just assigned, not yet accepted |
| `active`   | Accepted and in progress |
| `completed`| Finished           |
| `cancelled`| Declined or cancelled |

### Priority (from severity)

| Severity   | Priority  |
|-----------|-----------|
| `critical`| Critical  |
| `high`    | High      |
| `medium`  | Medium    |
| `low`     | Low       |

---

## 6. Error Responses

All APIs use a consistent error shape when possible:

```json
{
  "success": false,
  "error": "Human-readable message"
}
```

- **401 Unauthorized** — Missing or invalid token; user must log in again.
- **403 Forbidden** — Valid token but not allowed (e.g. non-volunteer calling volunteer-only endpoint).
- **404 Not Found** — Resource (volunteer, task) not found or not assigned to this volunteer.
- **500 Internal Server Error** — Server failure; in development, `details` may be present.

---

## 7. Hosting Checklist

Before sharing the base URL with the mobile developer:

1. **Deploy** the Next.js app and ensure the **API routes** are served under the same host (e.g. `https://your-domain.com/api/...`).
2. **Environment:** Set `JWT_SECRET` in production (used to sign and verify tokens).
3. **CORS:** If the mobile app calls the API from a different origin (e.g. WebView), configure CORS on the server if required.
4. **HTTPS:** Use HTTPS in production so tokens are not sent over plain HTTP.
5. **Base URL:** Provide the mobile team with:
   - **Base URL:** `https://<your-hosted-domain>`
   - **Login:** `POST {baseUrl}/api/volunteers/mobile-login`
   - **Get profile:** `GET {baseUrl}/api/volunteers/by-id/{volunteerId}` or `GET {baseUrl}/api/volunteers/public/{volunteerId}`
   - **Tasks:** `GET/POST {baseUrl}/api/mobile/tasks` (and sub-routes as above).
6. **Auth header:** Remind the developer to send `Authorization: Bearer <token>` on every request to `/api/mobile/*` and any other protected volunteer endpoints.

---

## Quick reference

| Purpose           | Method | Endpoint                              | Auth   |
|------------------|--------|----------------------------------------|--------|
| Volunteer login  | POST   | `/api/volunteers/mobile-login`         | No     |
| Get volunteer    | GET    | `/api/volunteers/by-id/:id` or `.../public/:id` | No  |
| List my tasks    | GET    | `/api/mobile/tasks`                    | Bearer |
| Task detail      | GET    | `/api/mobile/tasks/:disasterId`        | Bearer |
| Accept task      | POST   | `/api/mobile/tasks/accept`             | Bearer |
| Decline task     | POST   | `/api/mobile/tasks/decline`            | Bearer |

---

*Document version: 1.0 — for use with the Results Admin / Volunteer backend.*
