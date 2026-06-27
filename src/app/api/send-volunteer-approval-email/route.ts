import { NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, volunteerId, skills, city, state } = body;

    if (!name || !email || !volunteerId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, email, volunteerId' },
        { status: 400 }
      );
    }

    const template = emailTemplates.volunteerApproval({
      name,
      email,
      volunteerId,
      skills: skills || [],
      city,
      state,
    });

    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (sent) {
      return NextResponse.json({ success: true, message: 'Approval email sent successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send approval email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error sending volunteer approval email:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
