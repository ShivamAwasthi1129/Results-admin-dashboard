import { NextResponse } from 'next/server';
import { loadHomePageState } from '@/lib/homepage-cms/storage';

/**
 * Public homepage payload (published only). No auth.
 * Matches HOMEPAGE_CMS_IMPLEMENTATION_SPEC §6 public contract shape (simplified).
 */
export async function GET() {
  const state = await loadHomePageState();
  const published = state.published;
  if (!published) {
    return NextResponse.json(
      {
        success: false,
        error: 'Homepage has not been published yet',
      },
      { status: 404 }
    );
  }

  const sections = [...published.page.sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.sectionKey,
      type: s.type,
      order: s.order,
      data: s.data,
    }));

  return NextResponse.json({
    success: true,
    data: {
      page: {
        slug: published.page.slug,
        title: published.page.title,
        updatedAt: state.publishedAt,
        version: state.publishedVersion,
      },
      sections,
    },
  });
}
