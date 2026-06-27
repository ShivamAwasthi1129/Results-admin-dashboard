import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"Results Disaster Management" <${process.env.EMAIL_ID}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', options.to);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

// Email templates
export const emailTemplates = {
  welcome: (name: string, email: string, tempPassword?: string) => ({
    subject: 'Welcome to Results Disaster Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #DC2626, #991B1B); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #1f2937; margin-top: 0; }
          .content p { color: #4b5563; line-height: 1.6; }
          .credentials { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .credentials p { margin: 5px 0; }
          .credentials strong { color: #DC2626; }
          .button { display: inline-block; background: #DC2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Results Disaster Management</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${name}!</h2>
            <p>Your account has been successfully created on the Results Disaster Management System. You now have access to our comprehensive disaster response and management platform.</p>
            
            ${tempPassword ? `
            <div class="credentials">
              <p><strong>Your Login Credentials:</strong></p>
              <p>Email: <strong>${email}</strong></p>
              <p>Temporary Password: <strong>${tempPassword}</strong></p>
              <p style="color: #dc2626; font-size: 12px; margin-top: 10px;">Please change your password after first login.</p>
            </div>
            ` : ''}
            
            <p>With this platform, you can:</p>
            <ul style="color: #4b5563;">
              <li>Monitor live disaster alerts across the USA</li>
              <li>Coordinate emergency response teams</li>
              <li>Track volunteer activities</li>
              <li>Manage service providers</li>
              <li>Access real-time weather updates</li>
            </ul>
            
            <a href="${process.env.NEXTAUTH_URL}/login" class="button">Login to Dashboard</a>
          </div>
          <div class="footer">
            <p>Results Disaster Management System</p>
            <p>Protecting communities, saving lives.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  accountUpdate: (name: string, changes: string) => ({
    subject: 'Account Information Updated - Results DMS',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #DC2626, #991B1B); padding: 30px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .content p { color: #4b5563; line-height: 1.6; }
          .changes { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Account Update</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Your account information has been updated:</p>
            <div class="changes">
              <p><strong>Changes made:</strong></p>
              <p>${changes}</p>
            </div>
            <p>If you did not make these changes, please contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>Results Disaster Management System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  sosAlert: (alertDetails: {
    name: string;
    type: string;
    priority: string;
    location: string;
    message: string;
    peopleCount: number;
  }) => ({
    subject: `🚨 URGENT SOS Alert - ${alertDetails.priority.toUpperCase()} Priority`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #DC2626, #7f1d1d); padding: 30px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .urgent-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin-top: 10px; }
          .content { padding: 30px; }
          .alert-details { background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fee2e2; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #6b7280; }
          .value { color: #1f2937; font-weight: 600; }
          .message-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 15px; }
          .action-button { display: inline-block; background: #DC2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🆘 Emergency SOS Alert</h1>
            <span class="urgent-badge">${alertDetails.priority.toUpperCase()} PRIORITY</span>
          </div>
          <div class="content">
            <div class="alert-details">
              <div class="detail-row">
                <span class="label">Name:</span>
                <span class="value">${alertDetails.name}</span>
              </div>
              <div class="detail-row">
                <span class="label">Alert Type:</span>
                <span class="value">${alertDetails.type}</span>
              </div>
              <div class="detail-row">
                <span class="label">Location:</span>
                <span class="value">${alertDetails.location}</span>
              </div>
              <div class="detail-row">
                <span class="label">People Affected:</span>
                <span class="value">${alertDetails.peopleCount}</span>
              </div>
            </div>
            <div class="message-box">
              <p style="color: #1f2937; margin: 0;"><strong>Message:</strong></p>
              <p style="color: #4b5563; margin: 8px 0 0 0;">${alertDetails.message}</p>
            </div>
            <a href="${process.env.NEXTAUTH_URL}/dashboard/sos" class="action-button">View Alert Details</a>
          </div>
          <div class="footer">
            <p>Results Disaster Management System - Emergency Response</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  volunteerApproval: (details: {
    name: string;
    email: string;
    volunteerId: string;
    skills: string[];
    city?: string;
    state?: string;
  }) => ({
    subject: '🎉 Congratulations! You are Approved as a Volunteer – Results Disaster Management',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Volunteer Approved – Results</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4; }
          .wrapper { max-width: 620px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.10); }
          .header { background: linear-gradient(135deg, #059669 0%, #047857 60%, #065f46 100%); padding: 48px 32px 36px; text-align: center; }
          .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
          .header h1 { color: #ffffff; font-size: 30px; font-weight: 800; margin-bottom: 8px; line-height: 1.2; }
          .header p { color: rgba(255,255,255,0.85); font-size: 15px; }
          .checkmark { font-size: 56px; margin-bottom: 16px; display: block; }
          .body { padding: 40px 36px; }
          .greeting { font-size: 20px; font-weight: 700; color: #064e3b; margin-bottom: 12px; }
          .intro { font-size: 15px; color: #374151; line-height: 1.7; margin-bottom: 28px; }
          .info-card { background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
          .info-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #d1fae5; font-size: 14px; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #6b7280; font-weight: 500; }
          .info-value { color: #065f46; font-weight: 700; }
          .approved-badge { display: inline-block; background: #dcfce7; color: #15803d; border: 1.5px solid #86efac; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; }
          .section-title { font-size: 14px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
          .skills-wrap { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
          .skill-chip { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 5px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
          .what-next { background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 18px 20px; margin-bottom: 28px; }
          .what-next p { color: #374151; font-size: 14px; line-height: 1.6; }
          .what-next ul { color: #374151; font-size: 14px; line-height: 1.8; margin: 8px 0 0 18px; }
          .cta-wrap { text-align: center; margin: 28px 0 8px; }
          .cta-btn { display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: #ffffff; padding: 15px 36px; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(5,150,105,0.35); }
          .divider { height: 1px; background: #e5e7eb; margin: 28px 0; }
          .footer { background: #f9fafb; padding: 24px 32px; text-align: center; }
          .footer p { color: #9ca3af; font-size: 12px; line-height: 1.7; }
          .footer .brand { color: #047857; font-weight: 700; font-size: 14px; margin-bottom: 4px; }
          @media (max-width: 600px) {
            .body { padding: 28px 20px; }
            .header { padding: 36px 20px 28px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <!-- Header -->
          <div class="header">
            <span class="badge">Volunteer Approved</span>
            <span class="checkmark">✅</span>
            <h1>You're Officially a Volunteer!</h1>
            <p>Results Disaster Management &amp; Relief Network</p>
          </div>

          <!-- Body -->
          <div class="body">
            <p class="greeting">Dear ${details.name},</p>
            <p class="intro">
              We are thrilled to inform you that your volunteer application has been <strong>reviewed, verified, and approved</strong> by our admin team.
              You are now an official part of the <strong>Results Disaster Management</strong> volunteer network — a community of dedicated individuals committed to protecting lives and rebuilding communities across the USA.
            </p>

            <!-- Volunteer Details Card -->
            <p class="section-title">📋 Your Volunteer Profile</p>
            <div class="info-card">
              <div class="info-row">
                <span class="info-label">Full Name</span>
                <span class="info-value">${details.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email</span>
                <span class="info-value">${details.email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Volunteer ID</span>
                <span class="info-value">${details.volunteerId}</span>
              </div>
              ${details.city || details.state ? `
              <div class="info-row">
                <span class="info-label">Location</span>
                <span class="info-value">${[details.city, details.state].filter(Boolean).join(', ')}</span>
              </div>` : ''}
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="info-value"><span class="approved-badge">✔ APPROVED</span></span>
              </div>
            </div>

            <!-- Skills -->
            ${details.skills && details.skills.length > 0 ? `
            <p class="section-title">🛠 Your Registered Skills</p>
            <div class="skills-wrap">
              ${details.skills.map(s => `<span class="skill-chip">${s}</span>`).join('')}
            </div>` : ''}

            <!-- What's Next -->
            <div class="what-next">
              <p><strong>⚡ What happens next?</strong></p>
              <ul>
                <li>Our coordinators may contact you when a disaster event is declared in your area.</li>
                <li>You can be assigned to disaster response missions and tracked via our platform.</li>
                <li>Keep your availability status updated through your volunteer profile.</li>
                <li>Reach out to your team coordinator for onboarding briefings.</li>
              </ul>
            </div>

            <!-- CTA -->
            <div class="cta-wrap">
              <a href="https://results.website" class="cta-btn">Visit Results Website →</a>
            </div>

            <div class="divider"></div>
            <p style="font-size:13px; color:#6b7280; line-height:1.7;">
              If you have any questions or need assistance, please reach out to our support team.
              We are honored to have you with us. Together, we save lives. 💚
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="brand">Results Disaster Management</p>
            <p>Protecting communities, saving lives across the USA.</p>
            <p style="margin-top:8px;">© ${new Date().getFullYear()} Results. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  volunteerAssignment: (name: string, assignment: string, location: string) => ({
    subject: 'New Assignment - Results DMS',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669, #047857); padding: 30px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .assignment-box { background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Assignment</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>You have been assigned a new task:</p>
            <div class="assignment-box">
              <p><strong>Assignment:</strong> ${assignment}</p>
              <p><strong>Location:</strong> ${location}</p>
            </div>
            <p>Please report to the assigned location as soon as possible.</p>
          </div>
          <div class="footer">
            <p>Results Disaster Management System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

