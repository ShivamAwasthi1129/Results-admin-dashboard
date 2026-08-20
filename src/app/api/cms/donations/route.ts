import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const skip = (page - 1) * limit;

    const prisma = await getPrismaClient();

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { donorFirstName: { contains: search, mode: "insensitive" } },
        { donorLastName: { contains: search, mode: "insensitive" } },
        { donorEmail: { contains: search, mode: "insensitive" } },
        { campaign: { title: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [donations, total] = await Promise.all([
      (prisma as any).campaignDonation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          campaign: {
            select: { title: true, slug: true }
          }
        }
      }),
      (prisma as any).campaignDonation.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        donations,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("GET /api/cms/donations error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
