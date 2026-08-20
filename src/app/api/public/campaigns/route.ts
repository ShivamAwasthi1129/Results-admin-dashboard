import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");

    const prisma = await getPrismaClient();

    // If slug is provided, return single campaign
    if (slug) {
      const campaign = await (prisma as any).campaign.findFirst({
        where: { slug, status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          subtitle: true,
          type: true,
          category: true,
          organization: true,
          location: true,
          startDate: true,
          endDate: true,
          salesOpenDate: true,
          salesCloseDate: true,
          recurrence: true,
          bannerUrl: true,
          bannerType: true,
          logoUrl: true,
          primaryColor: true,
          colorMode: true,
          backgroundStyle: true,
          backgroundTheme: true,
          fontStyle: true,
          goalAmount: true,
          raisedAmount: true,
          donationConfig: true,
          description: true,
          publishedAt: true,
          _count: { select: { donations: true } },
        },
      });

      if (!campaign) {
        return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, campaign });
    }

    // Otherwise return list of published campaigns
    const where: any = { status: "PUBLISHED" };
    if (type && type !== "ALL") where.type = type;

    const campaigns = await (prisma as any).campaign.findMany({
      where,
      take: limit,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        subtitle: true,
        type: true,
        category: true,
        organization: true,
        location: true,
        startDate: true,
        endDate: true,
        bannerUrl: true,
        logoUrl: true,
        primaryColor: true,
        goalAmount: true,
        raisedAmount: true,
        donationConfig: true,
        publishedAt: true,
        _count: { select: { donations: true } },
      },
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    console.error("Public campaigns error:", error);
    return NextResponse.json({ success: false, error: error.message, campaigns: [] }, { status: 500 });
  }
}
