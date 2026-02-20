# Alerts – Kahan se create ho rahe hain

Project mein alerts teen jagah se aa / create ho rahe hain:

---

## 1. SOS Alerts (Dashboard)

**Source:** `src/app/dashboard/sos/page.tsx`

- **Initial list:** `useEffect` ke andar **mock array** se set hota hai (line ~136: `mockAlerts`). Ye DB/API se nahi aa raha, seed data frontend par hi hardcoded hai.
- **Naya alert create:** "Create New SOS Alert" modal se. **`handleAddAlert`** (line ~458) form data le kar naya object banaata hai aur **`setAlerts(prev => [newAlert, ...prev])** se state update karta hai. Ye bhi **sirf in-memory (React state)** hai – koi API call ya backend save nahi hota.
- **Summary:** SOS alerts abhi **pure frontend** hain; koi backend API / database use nahi ho raha. Persistence ke liye SOS alerts ka koi API (e.g. `POST /api/sos-alerts`) implement karna hoga.

---

## 2. Weather Alerts

**Source:** `src/app/dashboard/weather/WeatherClient.tsx`

- **Fetch:** `GET /api/weather?type=alerts` (line ~165). Ye **humara backend** weather API call karta hai.
- **Backend:** `src/app/api/weather/route.ts` – ye OpenWeatherMap (One Call 3.0 / 2.5) se data leta hai. Alerts wala hissa **OpenWeatherMap API** se aata hai (paid One Call 3.0 me alerts; free tier me empty/mock).
- **Display:** `WeatherClient.tsx` me `alerts` state me store ho kar UI me dikhaye jaate hain (e.g. line ~304: "Weather Alerts" section).
- **Summary:** Weather alerts **OpenWeatherMap** se create/define hote hain; humara app sirf unhe fetch karke dikhata hai.

---

## 3. Email SOS Alert (template)

**Source:** `src/lib/email.ts`

- **Function:** `sosAlert(alertDetails)` (line ~139) – ye **email template** hai jab system kisi ko SOS alert email bhejta hai (subject: "URGENT SOS Alert", body me name, type, location, peopleCount, message, etc.).
- **Create:** Alert khud yahan create nahi hota; ye template tab use hota hai jab koi aur flow (e.g. future SOS API / webhook) is function ko call karke email trigger kare.
- **Summary:** Ye sirf **email content** define karta hai; alert create karne wala flow abhi codebase me dikhne wale SOS flow me nahi hai (SOS abhi frontend-only hai).

---

## 4. Reports / Notifications (alerts word usage)

- **Reports:** `src/app/dashboard/reports/ReportsClient.tsx` – yahan "alerts" sirf **chart data** ke label/values hain (e.g. line ~221: `alerts: Math.floor(...)`), koi real alert create nahi hota.
- **NotificationContext:** `src/context/NotificationContext.tsx` – "Critical: Cyclone Alert" jaisa **sample/demo notification** hai; real alerts create karne ka source nahi.
- **Settings:** `src/app/dashboard/settings/page.tsx` – "Emergency Alerts" toggle user preference hai (e.g. `emergencyAlerts: true`), ye khud alert create nahi karta.

---

## Short summary

| Alert type      | Create / source location                    | Backend / API?        |
|-----------------|---------------------------------------------|------------------------|
| SOS Alerts      | `src/app/dashboard/sos/page.tsx` (mock + form) | No – frontend only    |
| Weather Alerts  | OpenWeatherMap → `/api/weather?type=alerts`  | Yes – external API    |
| Email SOS       | `src/lib/email.ts` (template only)           | Template; no create   |

Agar SOS alerts ko persist karna ho to `POST /api/sos-alerts` (ya similar) aur DB collection add karni hogi; abhi create wahi SOS page ke form se hota hai, sirf state me.
