import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

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

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const raw = await context.params;
    const id = raw?.id;
    const prisma = await getPrismaClient();
    const campaign = await (prisma as any).campaign.findUnique({
      where: { id },
      include: { media: true, _count: { select: { donations: true } } },
    });
    if (!campaign) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const raw = await context.params;
    const id = raw?.id;
    const body = await request.json();
    const prisma = await getPrismaClient();
    
    if (body.title && !body.slug) {
      const baseSlug = body.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 80);
      
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await (prisma as any).campaign.findUnique({ where: { slug } });
        if (!existing || existing.id === id) break;
        slug = `${baseSlug}-${counter++}`;
      }
      body.slug = slug;
    }

    const cleanBody = sanitizeData(body);
    if (cleanBody.status === "PUBLISHED") {
      cleanBody.publishedAt = new Date();
    }

    const campaign = await (prisma as any).campaign.update({
      where: { id },
      data: { ...cleanBody, updatedAt: new Date() },
    });
    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    console.error("PATCH /api/cms/campaigns/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const raw = await context.params;
    const id = raw?.id;
    const prisma = await getPrismaClient();
    await (prisma as any).campaign.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
