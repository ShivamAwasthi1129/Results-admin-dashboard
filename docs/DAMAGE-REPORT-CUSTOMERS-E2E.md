# Damage Report – Customer list & address selection (E2E)

## What was changed

1. **Customer list source**  
   The Create Damage Report modal now loads customers from the **same API as User Management**: `GET /api/admin/users?page=1&limit=1000` (with auth). It no longer uses `/api/customers`.

2. **User → Customer mapping**  
   API users are mapped to the modal’s customer shape:
   - `fullName` → `firstName` / `lastName`
   - `email`, `phoneNumber` → `email`, `phone`
   - Single-address users: `address`, `city`, `state`, `pincode` → one `address`.
   - Multi-address users: `addresses[]` (each with `address`, `city`, `state`, `pincode`) → `addresses[]` and default/first as `address`.

3. **Multiple-address selection**  
   When the selected customer has more than one address, the modal shows “Select address for this report” and the admin must choose one. The chosen address is used to pre-fill the Property Address fields and is sent in the report payload.

## Terminal check (user data and multi-address)

From the project root, with a valid auth token (e.g. from browser after login: Application → Local Storage → `auth-token`):

**PowerShell:**

```powershell
$env:AUTH_TOKEN="<paste-your-token>"; node scripts/fetch-users-and-check-addresses.mjs
```

**Bash:**

```bash
AUTH_TOKEN="<paste-your-token>" node scripts/fetch-users-and-check-addresses.mjs
```

The script will:

- Fetch users from the same backend URL used by the app.
- Print total users and how many have multiple addresses.
- Print a sample of multi-address users (id, fullName, and `addresses[]`) so you can confirm the shape matches the modal mapping.

Without a token you’ll get `401 Unauthorized`; that’s expected.

## In-app E2E

1. Log in to the dashboard.
2. Go to **Damage Reports** → **Create Damage Report**.
3. Confirm the customer list loads (no “No customers found”).
4. Search/select a customer.
5. If that customer has multiple addresses, confirm:
   - “Select address for this report” appears.
   - Choosing an address fills Street, City, State, Zip in Property Address.
   - Submit is allowed only after an address is selected.
6. Submit a report and confirm the payload uses the selected (or single) address.
