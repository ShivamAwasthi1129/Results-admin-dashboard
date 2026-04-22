import { NextRequest, NextResponse } from 'next/server';
import { requireBearer } from '@/lib/homepage-cms/auth-guard';
import { sectionTypesForApi } from '@/lib/homepage-cms/section-registry';

export async function GET(request: NextRequest) {
  const deny = requireBearer(request);
  if (deny) return deny;

  return NextResponse.json({
    success: true,
    data: { sectionTypes: sectionTypesForApi() },
  });
}
