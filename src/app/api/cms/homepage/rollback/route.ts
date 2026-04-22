import { NextRequest, NextResponse } from 'next/server';
import { requireBearer } from '@/lib/homepage-cms/auth-guard';
import { loadHomePageState, saveHomePageState } from '@/lib/homepage-cms/storage';
import type { HomePageDocument } from '@/lib/homepage-cms/types';

function hasUnpublishedChanges(draft: HomePageDocument, published: HomePageDocument | null): boolean {
  if (!published) return true;
  return JSON.stringify(draft) !== JSON.stringify(published);
}

export async function POST(request: NextRequest) {
  const deny = requireBearer(request);
  if (deny) return deny;

  let versionId: string | undefined;
  try {
    const body = await request.json();
    if (body && typeof body === 'object' && typeof (body as { versionId?: string }).versionId === 'string') {
      versionId = (body as { versionId: string }).versionId.trim();
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!versionId) {
    return NextResponse.json({ success: false, error: 'versionId is required' }, { status: 400 });
  }

  const state = await loadHomePageState();
  const match = state.versions.find((v) => v.id === versionId);
  if (!match) {
    return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
  }

  state.draft = JSON.parse(JSON.stringify(match.snapshot)) as HomePageDocument;
  await saveHomePageState(state);

  return NextResponse.json({
    success: true,
    data: {
      draft: state.draft,
      hasUnpublishedChanges: hasUnpublishedChanges(state.draft, state.published),
    },
  });
}
