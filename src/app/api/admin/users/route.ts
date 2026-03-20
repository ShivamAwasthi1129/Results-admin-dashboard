import { NextRequest, NextResponse } from 'next/server';
import { getExternalAdminUsersUrl } from '@/lib/external-api';

/**
 * Proxies GET /api/admin/users → ${DOMAIN_NAME}/api/admin/users
 * Forwards Authorization: Bearer so dashboard & user management work when DOMAIN_NAME targets the real backend.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized – access token required' },
      { status: 401 }
    );
  }

  const qs = request.nextUrl.searchParams.toString();
  const url = getExternalAdminUsersUrl(qs);
  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: 'DOMAIN_NAME is not configured. Set DOMAIN_NAME (e.g. https://r3sults-backend.vercel.app) in .env.local',
      },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            typeof body?.message === 'string'
              ? body.message
              : typeof body?.error === 'string'
                ? body.error
                : `Users API error (${res.status})`,
        },
        { status: res.status === 401 ? 401 : 502 }
      );
    }

    if (body?.success === true && body?.data) {
      return NextResponse.json(body);
    }

    if (Array.isArray(body?.users)) {
      const pag = body.pagination || {};
      return NextResponse.json({
        success: true,
        data: {
          users: body.users,
          pagination: {
            page: pag.page ?? 1,
            limit: pag.limit ?? body.users.length,
            total: pag.total ?? body.users.length,
            pages: pag.pages ?? Math.max(1, Math.ceil((pag.total ?? body.users.length) / (pag.limit || 20))),
          },
        },
      });
    }

    return NextResponse.json(
      { success: true, data: { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } } },
      { status: 200 }
    );
  } catch (e) {
    console.error('[api/admin/users]', e);
    return NextResponse.json(
      { success: false, error: 'Failed to reach users API. Check DOMAIN_NAME and network.' },
      { status: 502 }
    );
  }
}
