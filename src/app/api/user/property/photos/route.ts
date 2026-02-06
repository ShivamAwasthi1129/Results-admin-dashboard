import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTokenFromRequest } from '@/lib/auth';

const DOMAIN_NAME = process.env.DOMAIN_NAME || '';
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
    }

    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'house_front';
    const label = (formData.get('label') as string) || 'Document';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided.' },
        { status: 400 }
      );
    }

    // Validate file type (jpg, jpeg, png only)
    const mime = file.type?.toLowerCase();
    if (!ALLOWED_TYPES.includes(mime)) {
      return NextResponse.json(
        { success: false, error: 'Only JPG, JPEG, or PNG images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 500KB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must not exceed 500KB.' },
        { status: 400 }
      );
    }

    if (!DOMAIN_NAME) {
      return NextResponse.json(
        { success: false, error: 'Upload service is not configured (DOMAIN_NAME missing).' },
        { status: 500 }
      );
    }

    const uploadUrl = `${DOMAIN_NAME.replace(/\/$/, '')}/api/user/property/photos`;
    const forwardFormData = new FormData();
    forwardFormData.append('file', file);
    forwardFormData.append('type', type);
    forwardFormData.append('label', label);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: forwardFormData,
    });

    const data = await uploadResponse.json().catch(() => ({}));

    if (!uploadResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || data.message || 'Upload failed.',
        },
        { status: uploadResponse.status }
      );
    }

    // Return the link/URL from the external API (common keys: url, link, photoUrl, imageUrl)
    const imageUrl =
      data.url ?? data.link ?? data.photoUrl ?? data.imageUrl ?? data.data?.url ?? data.data?.link ?? null;

    return NextResponse.json({
      success: true,
      url: imageUrl,
      ...(data.data && typeof data.data === 'object' ? data.data : {}),
    });
  } catch (error: unknown) {
    console.error('Property photos upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
