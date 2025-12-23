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

