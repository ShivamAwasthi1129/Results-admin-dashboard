/**
 * Fetch users from the same API as User Management / Damage Report and list users with multiple addresses.
 * Run: node scripts/fetch-users-and-check-addresses.mjs
 * API requires auth. After logging in to the app, copy the token from localStorage (auth-token) and run:
 *   $env:AUTH_TOKEN="yourBearerToken"; node scripts/fetch-users-and-check-addresses.mjs
 * (PowerShell) or AUTH_TOKEN=yourBearerToken node scripts/fetch-users-and-check-addresses.mjs (bash).
 */

const BASE = process.env.DOMAIN_NAME || process.env.NEXT_PUBLIC_APP_URL || 'https://r3sults-backend.vercel.app';
const URL = `${BASE.replace(/\/$/, '')}/api/admin/users?page=1&limit=500`;
const AUTH = process.env.AUTH_TOKEN;

async function main() {
  console.log('Fetching users from:', URL);
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH) headers['Authorization'] = `Bearer ${AUTH}`;

  const res = await fetch(URL, { headers });
  if (!res.ok) {
    console.error('Failed to fetch users:', res.status, res.statusText);
    const text = await res.text();
    console.error(text.slice(0, 500));
    process.exit(1);
  }

  const data = await res.json();
  const users = data?.data?.users ?? data?.users ?? [];
  console.log('Total users fetched:', users.length);

  const withMultiple = users.filter((u) => (u.addresses && u.addresses.length > 1));
  console.log('Users with multiple addresses:', withMultiple.length);

  if (withMultiple.length > 0) {
    console.log('\n--- Users with multiple addresses (sample for mapping) ---\n');
    withMultiple.slice(0, 5).forEach((u, i) => {
      console.log(`${i + 1}. ${u.fullName || u.email} (id: ${u.id || u._id})`);
      console.log('   addresses:', JSON.stringify(u.addresses, null, 2));
      console.log('');
    });
  }

  const withSingleLegacy = users.filter((u) => !u.addresses?.length && (u.address || u.city || u.state || u.pincode));
  console.log('Users with single/legacy address (address/city/state/pincode):', withSingleLegacy.length);

  const noAddress = users.filter((u) => !u.addresses?.length && !u.address && !u.city && !u.state && !u.pincode);
  console.log('Users with no address fields:', noAddress.length);

  console.log('\nDone. Use this to align Create Damage Report modal with user data.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
