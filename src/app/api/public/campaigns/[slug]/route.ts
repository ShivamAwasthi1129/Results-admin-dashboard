import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> | { slug: string } }) {
  try {
    const rawParams = await context.params;
    const slug = rawParams?.slug;
    if (!slug) {
      return NextResponse.json({ success: false, error: "Slug required" }, { status: 400 });
    }
    const prisma = await getPrismaClient();
    const campaign = await (prisma as any).campaign.findFirst({
      where: { slug: slug, status: "PUBLISHED" },
      select: {
        id: true, title: true, slug: true, subtitle: true, type: true,
        organization: true, location: true, startDate: true, endDate: true,
        salesOpenDate: true, salesCloseDate: true, recurrence: true,
        bannerUrl: true, bannerType: true, logoUrl: true, primaryColor: true,
        colorMode: true, backgroundStyle: true, backgroundTheme: true,
        fontStyle: true, goalAmount: true, raisedAmount: true,
        donationConfig: true, description: true, publishedAt: true,
        _count: { select: { donations: true } },
      },
    });
    if (!campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    console.error("Public campaign slug error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
