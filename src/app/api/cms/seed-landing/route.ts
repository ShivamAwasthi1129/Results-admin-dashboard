import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/cms/seed-landing
 * Reads cms-page-content-structure.json and bulk-upserts all home page sections
 * into the backend landing_content table via the admin bulk endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Missing authorization header' }, { status: 401 });
    }

    // Read the JSON seed file
    const jsonPath = path.join(process.cwd(), 'docs', 'cms-page-content-structure.json');
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ success: false, message: 'Seed file not found at docs/cms-page-content-structure.json' }, { status: 404 });
    }
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const content = JSON.parse(rawData);

    // Build items for bulk upsert
    const items: { page: string; section: string; content: unknown; sortOrder: number }[] = [];

    // Shared sections
    if (content.shared) {
      let sortOrder = 0;
      for (const [sectionName, sectionContent] of Object.entries(content.shared)) {
        items.push({ page: 'shared', section: sectionName, content: sectionContent, sortOrder: sortOrder++ });
      }
    }

    // Pages: home, about, contact
    if (content.pages) {
      for (const [pageName, sections] of Object.entries(content.pages)) {
        let sortOrder = 0;
        for (const [sectionName, sectionContent] of Object.entries(sections as Record<string, unknown>)) {
          if (sectionName === 'footerRef') continue; // Skip reference keys
          items.push({ page: pageName, section: sectionName, content: sectionContent, sortOrder: sortOrder++ });
        }
      }
    }

    // Call backend bulk upsert
    const backend = process.env.DOMAIN_NAME || 'https://r3sults-backend.vercel.app';
    const bulkUrl = `${backend}/api/admin/landing-content/bulk`;

    const bulkRes = await fetch(bulkUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ items }),
    });

    const bulkData = await bulkRes.json();

    if (!bulkRes.ok) {
      return NextResponse.json({
        success: false,
        message: bulkData.message || 'Bulk upsert failed',
        data: bulkData,
      }, { status: bulkRes.status });
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${items.length} sections across all pages`,
      data: bulkData.data || bulkData,
    });

  } catch (error: unknown) {
    console.error('Seed landing content error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
