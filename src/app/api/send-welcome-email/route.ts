import { NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email';
import { getServerAuth } from '@/lib/server-auth';

export async function POST(req: Request) {
  try {
    const { token } = await getServerAuth();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, tempPassword } = body;

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Missing name or email' }, { status: 400 });
    }

    const template = emailTemplates.welcome(name, email, tempPassword);
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (sent) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
