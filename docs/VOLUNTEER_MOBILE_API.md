# Volunteer Mobile API

Two APIs for the mobile app: **volunteer login** and **fetch volunteer details by ID**.  
**No authorization token is required** for either endpoint.

**Base URL:** `https://results-admin-dashboard.vercel.app`

---

## 1. Volunteer Login

Use this so the volunteer can log in from the mobile app. Returns volunteer summary and a JWT token.

### Endpoint

```
POST /api/volunteers/mobile-login
```

**Headers:** `Content-Type: application/json`  
**Auth:** None

### Request body

| Field        | Type   | Required | Description                                |
|-------------|--------|----------|--------------------------------------------|
| `volunteerId` | string | No*      | 6-digit volunteer ID (e.g. `"123456"`)    |
| `email`     | string | No*      | Volunteer’s linked user email              |
| `password`  | string | Yes      | Password for the volunteer’s user account  |

*One of `volunteerId` or `email` must be provided.

**Example (login by volunteer ID):**

```json
{
  "volunteerId": "123456",
  "password": "your_password"
}
```

**Example (login by email):**

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
  "data": {
    "volunteer": {
      "_id": "507f1f77bcf86cd799439011",
      "volunteerId": "123456",
      "userId": "507f191e810c19729de860ea",
      "firstName": "John",
      "lastName": "Doe",
      "name": "John Doe",
      "email": "volunteer@example.com",
      "phone": "+1234567890",
      "availability": "available",
      "status": "active",
      "address": { "street": "", "city": "", "state": "", "zipCode": "", "country": "United States" },
      "skills": ["First Aid", "Search & Rescue"],
      "profileImage": ""
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

Save `data.volunteer._id` or `data.volunteer.volunteerId` to call the “get volunteer details” API.

### Error responses

| Status | Meaning |
|--------|--------|
| 400 | Missing `password` or both `volunteerId` and `email` |
| 401 | Invalid volunteer ID/email or invalid password |
| 403 | Account not active |
| 500 | Server error |

---

## 2. Get volunteer details (no auth)

After login, use the volunteer’s ID to load full profile. **No Authorization header or token required.**

### Endpoints (both work)

You can use **either** of these URLs:

- **`GET /api/volunteers/public/{volunteerId}`**
- **`GET /api/volunteers/by-id/{volunteerId}`**

- **`volunteerId`** (path) can be:
  - The **6-digit volunteer ID** (e.g. `123456`), or
  - The volunteer’s **MongoDB `_id`** (e.g. `507f1f77bcf86cd799439011`).

**Example URLs:**

- By MongoDB ID: `GET /api/volunteers/public/695935959c342470275d4584` or `GET /api/volunteers/by-id/695935959c342470275d4584`
- By 6-digit ID: `GET /api/volunteers/public/123456` or `GET /api/volunteers/by-id/123456`

**Auth:** None

### Success response (200)

```json
{
  "success": true,
  "data": {
    "volunteer": {
      "_id": "507f1f77bcf86cd799439011",
      "volunteerId": "123456",
      "userId": "507f191e810c19729de860ea",
      "firstName": "John",
      "lastName": "Doe",
      "name": "John Doe",
      "email": "volunteer@example.com",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-15T00:00:00.000Z",
      "gender": "male",
      "bloodGroup": "O+",
      "profileImage": "",
      "address": { "street": "...", "city": "...", "state": "...", "zipCode": "...", "country": "United States" },
      "skills": ["First Aid", "Search & Rescue"],
      "specializations": [],
      "languages": ["English"],
      "experience": { "years": 2, "description": "..." },
      "certifications": [],
      "trainingCompleted": [],
      "availability": "available",
      "availabilitySchedule": { "weekdays": true, "weekends": true, "nights": false, "preferredShift": "any" },
      "currentLocation": { "type": "Point", "coordinates": [0, 0] },
      "preferredWorkAreas": [],
      "willingToTravel": true,
      "maxTravelDistance": 50,
      "assignedDisasters": [],
      "currentMission": null,
      "completedMissions": 0,
      "totalHoursServed": 0,
      "rating": 0,
      "totalReviews": 0,
      "badges": [],
      "emergencyContact": { "name": "", "phone": "", "relation": "", "email": "" },
      "healthInfo": { "medicalConditions": [], "allergies": [], "medications": [], "physicallyFit": true },
      "hasOwnVehicle": false,
      "vehicleType": "none",
      "vehicleNumber": "",
      "status": "active",
      "verificationStatus": "pending",
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "lastActiveAt": "2024-06-01T00:00:00.000Z",
      "team": {
        "_id": "...",
        "teamId": "TEAM-1234",
        "name": "Search & Rescue",
        "specialization": "Search & Rescue"
      }
    }
  }
}
```

### Error responses

| Status | Meaning |
|--------|--------|
| 400 | Missing volunteer ID in path |
| 404 | Volunteer not found |
| 500 | Server error |

---

## Mobile app flow

1. **Login**  
   Call `POST /api/volunteers/mobile-login` with either `volunteerId` or `email` and `password`.  
   Store `data.volunteer._id` and/or `data.volunteer.volunteerId`.

2. **Load profile**  
   Call `GET /api/volunteers/by-id/{volunteerId}` where `{volunteerId}` is:
   - `data.volunteer.volunteerId` (e.g. `123456`), or  
   - `data.volunteer._id` (MongoDB id).  
   No auth header needed. Use `data.volunteer` to show the volunteer’s full details in the app.

---

## Quick reference

| Purpose            | Method | URL                                   | Auth  |
|--------------------|--------|----------------------------------------|-------|
| Volunteer login    | POST   | `/api/volunteers/mobile-login`         | None  |
| Volunteer details  | GET    | `/api/volunteers/by-id/{volunteerId}`  | None  |

- Passwords are never returned in responses.
- Both endpoints work without any Authorization or API key.
