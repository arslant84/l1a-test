
// src/lib/email-service.ts
'use server'; 

import nodemailer from 'nodemailer';

interface EmailDetails {
  to: string; // Email address
  recipientName: string; // Used for console logging, not directly in email sending
  subject: string;
  body: string; // Plain text body
}

// Ensure your .env.local file has:
// EMAIL_HOST_USER=your_gmail_address@gmail.com
// EMAIL_HOST_PASSWORD=your_gmail_app_password_or_regular_password

const emailUser = process.env.EMAIL_HOST_USER;
const emailPass = process.env.EMAIL_HOST_PASSWORD;

let transporter: nodemailer.Transporter | null = null;

if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
} else {
  console.warn(
    'EMAIL_HOST_USER or EMAIL_HOST_PASSWORD environment variables are not set. ' +
    'Email notifications will be logged to console only.'
  );
}

/**
 * Sends an email notification.
 * If transporter is configured, it sends a real email. Otherwise, it logs to console.
 */
export async function sendEmailNotification(details: EmailDetails): Promise<void> {
  const htmlBody = details.body.replace(/\n/g, '<br>');

  if (transporter) {
    try {
      const mailOptions = {
        from: `"L1A Portal" <${emailUser}>`,
        to: details.to,
        subject: details.subject,
        html: htmlBody,
      };
      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL SENT] To: ${details.to}, Subject: ${details.subject}`);
    } catch (error) {
      console.error(`[EMAIL ERROR] Failed to send email to ${details.to}:`, error);
      // Fallback to console logging if sending fails
      logEmailToConsole(details, htmlBody, 'Error sending, logged instead:');
    }
  } else {
    logEmailToConsole(details, htmlBody, '[EMAIL SIMULATION - NO CREDENTIALS]');
  }
}

function logEmailToConsole(details: EmailDetails, htmlBody: string, logPrefix: string) {
    console.log(`
    ============================================================
    ${logPrefix}
    To: ${details.recipientName} <${details.to}>
    Subject: ${details.subject}
    ------------------------------------------------------------
    Body (HTML-like):
    ${htmlBody}
    ============================================================
  `);
}
