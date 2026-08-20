import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

async function ensureUniqueSlug(prisma: any, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.campaign.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) break;
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
}

function parseDate(d: any): Date | null {
  if (!d || d === "" || d === "null" || d === "undefined") return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function sanitizeData(data: Record<string, any>) {
  const clean: Record<string, any> = { ...data };
  if ("startDate" in clean) clean.startDate = parseDate(clean.startDate);
  if ("endDate" in clean) clean.endDate = parseDate(clean.endDate);
  if ("salesOpenDate" in clean) clean.salesOpenDate = parseDate(clean.salesOpenDate);
  if ("salesCloseDate" in clean) clean.salesCloseDate = parseDate(clean.salesCloseDate);
  if ("goalAmount" in clean) {
    clean.goalAmount = clean.goalAmount ? parseFloat(String(clean.goalAmount)) || 0 : 0;
  }
  if ("raisedAmount" in clean) {
    clean.raisedAmount = clean.raisedAmount ? parseFloat(String(clean.raisedAmount)) || 0 : 0;
  }
  if ("donationConfig" in clean && typeof clean.donationConfig === "object") {
    clean.donationConfig = JSON.stringify(clean.donationConfig);
  }
  return clean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const skip = (page - 1) * limit;

    const prisma = await getPrismaClient();
    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (type && type !== "ALL") where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { organization: { contains: search, mode: "insensitive" } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { donations: true, media: true } } },
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { campaigns, total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error: any) {
    console.error("GET /api/cms/campaigns error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, type, ...rest } = body;
    if (!title || !type) {
      return NextResponse.json({ success: false, error: "Title and type are required" }, { status: 400 });
    }
    const prisma = await getPrismaClient();
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(prisma, baseSlug);
    
    const cleanRest = sanitizeData(rest);
    if (cleanRest.status === "PUBLISHED") {
      cleanRest.publishedAt = new Date();
    } else if (!cleanRest.status) {
      cleanRest.status = "DRAFT";
    }

    const campaign = await prisma.campaign.create({
      data: { title, type, slug, ...cleanRest } as any,
    });
    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/cms/campaigns error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
