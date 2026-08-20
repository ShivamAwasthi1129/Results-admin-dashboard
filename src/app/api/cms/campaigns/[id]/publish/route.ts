import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const raw = await context.params;
    const id = raw?.id;
    const prisma = await getPrismaClient();
    const campaign = await (prisma as any).campaign.findUnique({ where: { id } });
    if (!campaign) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const newStatus = campaign.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    const updated = await (prisma as any).campaign.update({
      where: { id },
      data: {
        status: newStatus,
        publishedAt: newStatus === "PUBLISHED" ? new Date() : campaign.publishedAt,
      },
    });
    return NextResponse.json({ success: true, data: updated, published: newStatus === "PUBLISHED" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
