import { NextResponse } from 'next/server';

/**
 * GET /api/resource-locator/categories
 * Public API for Resource Locator mobile screen - returns resource categories.
 * No authentication required.
 */
export async function GET() {
  const categories = [
    { id: 'shelter', label: 'Shelter Locator', icon: 'shelter', slug: 'shelter' },
    { id: 'food', label: 'Food Supply', icon: 'food', slug: 'food' },
    { id: 'insurance', label: 'Insurance Portal', icon: 'insurance', slug: 'insurance' },
    { id: 'medical', label: 'Medical Assistance', icon: 'medical', slug: 'medical' },
    { id: 'other', label: 'Other', icon: 'other', slug: 'other' },
  ];

  return NextResponse.json({
    success: true,
    data: { categories },
  });
}
