import { NextRequest, NextResponse } from 'next/server';
import { requireBearer } from '@/lib/homepage-cms/auth-guard';
import { loadHomePageState, saveHomePageState } from '@/lib/homepage-cms/storage';
import type { HomePageDocument } from '@/lib/homepage-cms/types';

function validateDraftShape(doc: unknown): string[] {
  const errors: string[] = [];
  if (!doc || typeof doc !== 'object') return ['Body must be a JSON object'];
  const d = doc as Partial<HomePageDocument>;
  if (d.schemaVersion !== 'home_v1') errors.push('schemaVersion must be "home_v1"');
  if (!d.page || typeof d.page !== 'object') {
    errors.push('page is required');
    return errors;
  }
  if (typeof d.page.slug !== 'string' || !d.page.slug.trim()) errors.push('page.slug is required');
  if (typeof d.page.title !== 'string') errors.push('page.title must be a string');
  if (!Array.isArray(d.page.sections)) {
    errors.push('page.sections must be an array');
    return errors;
  }
  d.page.sections.forEach((s, i) => {
    const p = `page.sections[${i}]`;
    if (!s || typeof s !== 'object') {
      errors.push(`${p} is invalid`);
      return;
    }
    const sec = s as unknown as Record<string, unknown>;
    if (typeof sec.sectionKey !== 'string' || !sec.sectionKey.trim()) errors.push(`${p}.sectionKey required`);
    if (typeof sec.type !== 'string' || !sec.type.trim()) errors.push(`${p}.type required`);
    if (typeof sec.order !== 'number' || !Number.isFinite(sec.order)) errors.push(`${p}.order must be a number`);
    if (typeof sec.enabled !== 'boolean') errors.push(`${p}.enabled must be boolean`);
    if (!sec.data || typeof sec.data !== 'object' || Array.isArray(sec.data)) {
      errors.push(`${p}.data must be an object`);
    }
  });
  const keys = new Set<string>();
  for (const s of d.page.sections) {
    const sk = (s as { sectionKey?: string }).sectionKey;
    if (typeof sk === 'string') {
      if (keys.has(sk)) errors.push(`Duplicate sectionKey: ${sk}`);
      keys.add(sk);
    }
  }
  return errors;
}

function hasUnpublishedChanges(draft: HomePageDocument, published: HomePageDocument | null): boolean {
  if (!published) return true;
  return JSON.stringify(draft) !== JSON.stringify(published);
}

export async function GET(request: NextRequest) {
  const deny = requireBearer(request);
  if (deny) return deny;

  const state = await loadHomePageState();
  return NextResponse.json({
    success: true,
    data: {
      draft: state.draft,
      published: state.published,
      publishedVersion: state.publishedVersion,
      publishedAt: state.publishedAt,
      hasUnpublishedChanges: hasUnpublishedChanges(state.draft, state.published),
    },
  });
}

export async function PUT(request: NextRequest) {
  const deny = requireBearer(request);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const shapeErrors = validateDraftShape(body);
  if (shapeErrors.length) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: shapeErrors }, { status: 400 });
  }

  const state = await loadHomePageState();
  state.draft = body as HomePageDocument;
  await saveHomePageState(state);

  return NextResponse.json({
    success: true,
    data: {
      draft: state.draft,
      published: state.published,
      publishedVersion: state.publishedVersion,
      publishedAt: state.publishedAt,
      hasUnpublishedChanges: hasUnpublishedChanges(state.draft, state.published),
    },
  });
}
