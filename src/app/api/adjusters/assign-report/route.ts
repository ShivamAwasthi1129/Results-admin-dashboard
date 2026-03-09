import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBackendUrl(): string {
  const raw = process.env.DOMAIN_NAME || 'https://r3sults-backend.vercel.app';
  return raw.replace(/\/$/, '');
}

/**
 * POST /api/adjusters/assign-report
 * Called when an adjuster is assigned to a damage report. Updates the adjuster's
 * assignedReports so the Adjuster module shows the report.
 * Body: { adjusterId: string, reportId: string, reportNumber: string, customerId?: string }
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Authorization required' }, { status: 401 });
  }

  let body: { adjusterId?: string; reportId?: string; reportNumber?: string; customerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { adjusterId, reportId, reportNumber, customerId } = body;
  if (!adjusterId || !reportId) {
    return NextResponse.json(
      { success: false, error: 'adjusterId and reportId are required' },
      { status: 400 }
    );
  }

  const backend = getBackendUrl();
  const baseUrl = `${backend}/api/admin/adjusters`;

  try {
    // 1. GET the adjuster from backend
    const getRes = await fetch(`${baseUrl}/${adjusterId}`, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!getRes.ok) {
      const err = await getRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.message || err.error || 'Failed to fetch adjuster' },
        { status: getRes.status }
      );
    }

    const getData = await getRes.json();
    const adjuster = getData?.data?.adjuster ?? getData?.adjuster ?? getData?.data;
    if (!adjuster) {
      return NextResponse.json(
        { success: false, error: 'Adjuster response missing' },
        { status: 502 }
      );
    }

    const existingReports = Array.isArray(adjuster.assignedReports) ? adjuster.assignedReports : [];
    const alreadyHas = existingReports.some((r: { reportId?: string }) => r.reportId === reportId);
    if (alreadyHas) {
      return NextResponse.json({ success: true, message: 'Report already assigned to adjuster' });
    }

    const newEntry = {
      reportId,
      reportNumber: reportNumber || reportId,
      customerId: customerId ?? undefined,
      assignedDate: new Date().toISOString(),
      status: 'assigned',
      approvalStatus: 'pending',
    };
    const updatedReports = [...existingReports, newEntry];

    // Use the same ID the backend returned (id or _id) for the update request
    const backendId = adjuster.id ?? adjuster._id ?? adjusterId;

    // 2. Update adjuster: try PATCH with only assignedReports first (if backend supports it), then PUT with full body
    let putRes = await fetch(`${baseUrl}/${backendId}`, {
      method: 'PATCH',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assignedReports: updatedReports }),
      cache: 'no-store',
    });

    if (!putRes.ok) {
      // Build a clean PUT body (no __v or internal fields) so backend can persist assignedReports
      const putBody: Record<string, unknown> = {
        firstName: adjuster.firstName,
        lastName: adjuster.lastName,
        email: adjuster.email,
        phone: adjuster.phone,
        companyName: adjuster.companyName,
        address: adjuster.address,
        certifications: adjuster.certifications ?? [],
        documents: adjuster.documents ?? [],
        states: adjuster.states ?? [],
        status: adjuster.status ?? 'active',
        notes: adjuster.notes,
        assignedReports: updatedReports,
        totalReportsHandled: updatedReports.length,
        currentActiveReports: updatedReports.filter(
          (r: { status?: string }) => !['completed', 'rejected'].includes(r.status ?? '')
        ).length,
      };
      if (adjuster.adjusterId != null) putBody.adjusterId = adjuster.adjusterId;
      if (adjuster.licenseNumber != null) putBody.licenseNumber = adjuster.licenseNumber;
      if (adjuster.yearsOfExperience != null) putBody.yearsOfExperience = adjuster.yearsOfExperience;
      if (adjuster.isAvailable != null) putBody.isAvailable = adjuster.isAvailable;
      if (adjuster.specializations != null) putBody.specializations = adjuster.specializations;

      putRes = await fetch(`${baseUrl}/${backendId}`, {
        method: 'PUT',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putBody),
        cache: 'no-store',
      });
    }

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errData.message || errData.error || 'Failed to update adjuster assigned reports',
        },
        { status: putRes.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Report assigned to adjuster' });
  } catch (e) {
    console.error('[assign-report]', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
