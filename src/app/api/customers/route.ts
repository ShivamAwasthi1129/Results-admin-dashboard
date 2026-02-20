import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, canPerform, getTokenFromRequest } from '@/lib/auth';

const EXTERNAL_CUSTOMERS_API_BASE =
  (process.env.NEXT_PUBLIC_DOMAIN_NAME || 'https://r3sults-backend.vercel.app').replace(/\/$/, '');
const EXTERNAL_CUSTOMERS_API_URL = `${EXTERNAL_CUSTOMERS_API_BASE}/api/admin/users`;

// Map external API user to our Customer shape (for damage report "Select customer")
function mapExternalUserToCustomer(externalUser: {
  id: string;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  username?: string | null;
}) {
  const fullName = externalUser.fullName || externalUser.email || externalUser.username || 'Unknown';
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || 'Unknown';
  const lastName = parts.slice(1).join(' ') || '';
  return {
    _id: externalUser.id,
    id: externalUser.id,
    firstName,
    lastName,
    email: externalUser.email || '',
    phone: externalUser.phoneNumber || undefined,
    address: {
      street: externalUser.address || undefined,
      city: externalUser.city || undefined,
      state: externalUser.state || undefined,
      pincode: externalUser.pincode || undefined,
      zipCode: externalUser.pincode || undefined,
      country: externalUser.country || undefined,
    },
  };
}

// GET - Fetch customers from external DMS API (for damage report "Select customer")
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!canPerform(tokenPayload.role, 'viewUsers')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const token = getTokenFromRequest(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '1000';
    const url = `${EXTERNAL_CUSTOMERS_API_URL}?page=${page}&limit=${limit}`;

    const res = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('External customers API error:', res.status, await res.text());
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customers from external API' },
        { status: 502 }
      );
    }

    const data = await res.json();
    const users = data?.data?.users ?? data?.users ?? [];
    const customers = Array.isArray(users)
      ? users.map((u: Record<string, unknown>) => mapExternalUserToCustomer(u as any))
      : [];

    return NextResponse.json({
      success: true,
      data: { customers, total: customers.length },
    });
  } catch (error) {
    console.error('Fetch customers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
