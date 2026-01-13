import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear the auth cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

export async function GET() {
  // Handle GET requests for logout (redirect or return message)
  const response = NextResponse.json({
    success: true,
    message: 'Please use POST method for logout',
  }, { status: 405 });

  return response;
}
