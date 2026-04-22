import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireBearer } from '@/lib/homepage-cms/auth-guard';
import { loadHomePageState, saveHomePageState } from '@/lib/homepage-cms/storage';
import type { HomePageDocument } from '@/lib/homepage-cms/types';
import { validateHomePageForPublish } from '@/lib/homepage-cms/validate';

function hasUnpublishedChanges(draft: HomePageDocument, published: HomePageDocument | null): boolean {
  if (!published) return true;
  return JSON.stringify(draft) !== JSON.stringify(published);
}

export async function POST(request: NextRequest) {
  const deny = requireBearer(request);
  if (deny) return deny;

  let changeNote: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body === 'object' && typeof (body as { changeNote?: string }).changeNote === 'string') {
      changeNote = (body as { changeNote: string }).changeNote.trim() || undefined;
    }
  } catch {
    changeNote = undefined;
  }

  const state = await loadHomePageState();
  const errors = validateHomePageForPublish(state.draft);
  if (errors.length) {
    return NextResponse.json(
      { success: false, error: 'Cannot publish: validation failed', details: errors },
      { status: 400 }
    );
  }

  const snapshot = JSON.parse(JSON.stringify(state.draft)) as HomePageDocument;
  const versionNumber = state.publishedVersion + 1;
  state.versions.unshift({
    id: randomUUID(),
    versionNumber,
    createdAt: new Date().toISOString(),
    snapshot,
    changeNote,
  });
  state.published = snapshot;
  state.publishedVersion = versionNumber;
  state.publishedAt = new Date().toISOString();
  await saveHomePageState(state);

  return NextResponse.json({
    success: true,
    data: {
      publishedVersion: state.publishedVersion,
      publishedAt: state.publishedAt,
      hasUnpublishedChanges: hasUnpublishedChanges(state.draft, state.published),
    },
  });
}
