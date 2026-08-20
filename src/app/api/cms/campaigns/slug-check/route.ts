import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const excludeId = searchParams.get("excludeId");
    if (!slug) return NextResponse.json({ success: false, error: "slug required" }, { status: 400 });
    const prisma = await getPrismaClient();
    const existing = await prisma.campaign.findUnique({ where: { slug } });
    const available = !existing || existing.id === excludeId;
    return NextResponse.json({ success: true, available });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}