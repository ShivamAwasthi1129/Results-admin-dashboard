# API Routes Reference (CSV)

The file **`API-ROUTES.csv`** lists all API routes in this project for sharing with your team.

## CSV columns

| Column       | Description |
|-------------|-------------|
| **Path**    | API path (e.g. `/api/damage-reports`, `/api/users/[id]`). Dynamic segments use `[param]`. |
| **Methods** | HTTP methods supported by the route, separated by `;` (e.g. `GET; POST; PUT`). |
| **Description** | Short summary of what the endpoint does and auth expectations. |

## Usage

- Open in Excel, Google Sheets, or any CSV viewer.
- Use **Path** + **Methods** to know which endpoints exist and how to call them.
- Base URL in production: your app URL (e.g. `https://results-admin-dashboard.vercel.app`).
- Most routes require authentication: send `Authorization: Bearer <token>` in the request header.

## Related docs

- **API-DAMAGE-REPORTS-AND-SOS.md** – Detailed docs for Damage Reports and SOS APIs (query params, request/response bodies).
