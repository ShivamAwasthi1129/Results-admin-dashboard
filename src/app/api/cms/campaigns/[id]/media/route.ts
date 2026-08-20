import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_VIDEO_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "gallery";

    if (!file) return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });

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
          folder: "r3sults-cms/campaigns",
          resource_type: isVideo ? "video" : "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const prisma = await getPrismaClient();
    const mediaRecord = await prisma.campaignMedia.create({
      data: {
        campaignId: params.id,
        type: isVideo ? "VIDEO" : "IMAGE",
        url: result.secure_url,
        publicId: result.public_id,
        altText: file.name,
        category,
        sizeBytes: file.size,
      },
    });

    return NextResponse.json({ success: true, data: { ...mediaRecord, url: result.secure_url } }, { status: 201 });
  } catch (error: any) {
    console.error("Media upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { publicId, mediaId } = await request.json();
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
    if (mediaId) {
      const prisma = await getPrismaClient();
      await prisma.campaignMedia.delete({ where: { id: mediaId } });
    }
    return NextResponse.json({ success: true, message: "Media deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}