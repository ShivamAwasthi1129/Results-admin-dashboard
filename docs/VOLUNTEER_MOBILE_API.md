# Volunteer Mobile API

APIs for the mobile app: volunteer login (no dashboard auth) and fetch logged-in volunteer details by ID (no authorization token required).

**Base URL:** `https://your-hosted-domain.com` (or your API base URL)

---

## 1. Volunteer Login

Use this so the volunteer can log in from the mobile app. Returns volunteer summary and a JWT token. No authorization header required.

### Endpoint

```
POST /api/volunteers/mobile-login
```

**Content-Type:** `application/json`

### Request body

Send **one** of the following:

| Field        | Type   | Required | Description                                      |
|-------------|--------|----------|--------------------------------------------------|
| `volunteerId` | string | No*      | 6-digit volunteer ID (e.g. `"123456"`)          |
| `email`     | string | No*      | Volunteer’s linked user email                    |
| `password`  | string | Yes      | Password for the volunteer’s user account       |

\* One of `volunteerId` or `email` must be provided.

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

### Error responses

| Status | Body example | Meaning |
|--------|----------------|--------|
| 400 | `{ "success": false, "error": "Password is required" }` | Missing password |
| 400 | `{ "success": false, "error": "Either volunteerId or email is required" }` | Missing both volunteerId and email |
| 401 | `{ "success": false, "error": "Invalid volunteer ID or email" }` | No volunteer/user found |
| 401 | `{ "success": false, "error": "Invalid password" }` | Wrong password |
| 403 | `{ "success": false, "error": "Account is not active. Please contact administrator." }` | User status not active |
| 500 | `{ "success": false, "error": "Internal server error" }` | Server error |

---

## 2. Get volunteer details (no auth)

After login, use the volunteer’s `_id` or `volunteerId` from the login response to load full profile. **No Authorization header or token is required.**

### Endpoint

```
GET /api/volunteers/public/{volunteerId}
```

- **`volunteerId`** (path) can be:
  - The **6-digit volunteer ID** (e.g. `123456`), or
  - The volunteer’s **MongoDB `_id`** (e.g. `507f1f77bcf86cd799439011`).

**Example URLs:**

- By 6-digit ID: `GET /api/volunteers/public/123456`
- By MongoDB ID: `GET /api/volunteers/public/507f1f77bcf86cd799439011`

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

| Status | Body example | Meaning |
|--------|----------------|--------|
| 400 | `{ "success": false, "error": "Volunteer ID is required" }` | Missing path parameter |
| 404 | `{ "success": false, "error": "Volunteer not found" }` | No volunteer for given ID |
| 500 | `{ "success": false, "error": "Internal server error" }` | Server error |

---

## Mobile app flow

1. **Login**  
   Call `POST /api/volunteers/mobile-login` with either `volunteerId` or `email` and `password`.  
   Store `data.volunteer._id` and/or `data.volunteer.volunteerId` (and optionally `data.token`).

2. **Load profile**  
   Call `GET /api/volunteers/public/{volunteerId}` where `{volunteerId}` is either:
   - `data.volunteer.volunteerId` (e.g. `123456`), or  
   - `data.volunteer._id` (MongoDB id).  
   No auth header needed. Use the returned `data.volunteer` to show the volunteer’s full details.

---

## Notes

- **Login** does not require any Authorization header.
- **Get volunteer details** does not require any Authorization header; the volunteer is identified only by the path parameter (volunteer ID or MongoDB _id).
- Passwords are never returned in any response.
- For login, the volunteer must have an active user account linked in the system; the password is the one set for that user (e.g. when the volunteer was created in the dashboard).
