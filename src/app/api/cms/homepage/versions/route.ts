import { NextRequest, NextResponse } from 'next/server';
import { requireBearer } from '@/lib/homepage-cms/auth-guard';
import { loadHomePageState } from '@/lib/homepage-cms/storage';

export async function GET(request: NextRequest) {
  const deny = requireBearer(request);
  if (deny) return deny;

  const state = await loadHomePageState();
  const versions = state.versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    createdAt: v.createdAt,
    changeNote: v.changeNote ?? null,
    sectionCount: v.snapshot.page.sections.length,
  }));

  return NextResponse.json({ success: true, data: { versions } });
}
