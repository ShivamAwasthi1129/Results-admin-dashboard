import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getPrismaClient } from "@/lib/prisma";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_VIDEO_BYTES = 5 * 1024 * 1024; // 5 MB

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const prisma = await getPrismaClient();

    if (campaignId) {
      const media = await (prisma as any).campaignMedia.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ success: true, data: media });
    }

    const media = await (prisma as any).campaignMedia.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { campaign: { select: { id: true, title: true, slug: true } } },
    });
    return NextResponse.json({ success: true, data: media });
  } catch (error: any) {
    console.error("GET /api/cms/media error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "campaigns";
    const campaignId = formData.get("campaignId") as string | null;
    const category = (formData.get("category") as string) || "gallery";
    const altText = (formData.get("altText") as string) || "";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const isVideo = file.type.startsWith("video/");
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

    if (file.size > maxBytes) {
      return NextResponse.json({
        success: false,
        error: `File too large. Max size: ${isVideo ? "5 MB for videos" : "2 MB for images"}`,
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `r3sults-cms/${folder}`,
          resource_type: isVideo ? "video" : "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    let mediaRecord = null;
    if (campaignId) {
      const prisma = await getPrismaClient();
      mediaRecord = await (prisma as any).campaignMedia.create({
        data: {
          campaignId,
          type: isVideo ? "VIDEO" : "IMAGE",
          url: result.secure_url,
          publicId: result.public_id,
          altText: altText || file.name,
          category,
          sizeBytes: file.size,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        type: isVideo ? "video" : "image",
        category,
        sizeBytes: file.size,
        record: mediaRecord,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/cms/media error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
