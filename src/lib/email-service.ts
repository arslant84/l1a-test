// src/lib/email-service.ts
'use server'; // Can be a server action if we were sending real emails

interface EmailDetails {
  to: string; // Email address
  recipientName: string;
  subject: string;
  body: string;
}

/**
 * Simulates sending an email notification.
 * In a real application, this would integrate with an email sending service.
 */
export async function sendEmailNotification(details: EmailDetails): Promise<void> {
  console.log(`
    ============================================================
    [EMAIL SIMULATION]
    To: ${details.recipientName} <${details.to}>
    Subject: ${details.subject}
    ------------------------------------------------------------
    Body:
    ${details.body}
    ============================================================
  `);
  // In a real app, you'd return a promise from your email sending API
  // For simulation, we assume it's always successful.
  return Promise.resolve();
}
