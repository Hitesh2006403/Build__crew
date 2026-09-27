import nodemailer from "nodemailer";

/**
 * Configure SMTP transporter using environment variables.
 * Credentials must be defined in backend/.env:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */
function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Send real email invitation to the recipient student.
 */
export async function sendTeamInvitationEmail({
  receiverEmail,
  receiverName,
  senderName,
  teamName,
  role,
  message,
  invitationId,
}) {
  if (!receiverEmail) {
    console.warn("[EmailService] No receiver email provided.");
    return { sent: false, error: "Missing recipient email" };
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const senderDisplayName = senderName || "A fellow builder";
  const teamDisplayName = teamName || "a squad";
  const roleDisplayName = role || "Teammate / Contributor";
  const customNote = message ? `<p style="margin: 16px 0; padding: 12px 16px; background-color: #f1f5f9; border-left: 4px solid #6366f1; border-radius: 4px; font-style: italic; color: #334155;">"${message}"</p>` : "";

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"BuildCrew Platform" <${process.env.SMTP_USER || "no-reply@buildcrew.com"}>`,
    to: receiverEmail,
    subject: `⚡ ${senderDisplayName} invited you to join [${teamDisplayName}] on BuildCrew`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #4f46e5; padding: 28px 32px; color: #ffffff; }
          .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .title { font-size: 24px; font-weight: 700; margin-top: 12px; margin-bottom: 4px; line-height: 1.25; }
          .content { padding: 32px; line-height: 1.6; font-size: 15px; }
          .badge-box { margin: 20px 0; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 10px; margin-top: 20px; text-align: center; }
          .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">BuildCrew</div>
            <div class="title">You're Invited to Join a Squad!</div>
          </div>
          <div class="content">
            <p>Hey <strong>${receiverName || "Builder"}</strong>,</p>
            <p><strong>${senderDisplayName}</strong> has invited you to collaborate in <strong>${teamDisplayName}</strong> on BuildCrew.</p>
            
            <div class="badge-box">
              <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px;">Target Role</div>
              <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${roleDisplayName}</div>
            </div>

            ${customNote}

            <p>Log in to your BuildCrew dashboard to review the squad concept and accept or decline this invitation.</p>

            <a href="${appUrl}" class="btn">View & Respond on BuildCrew</a>
          </div>
          <div class="footer">
            BuildCrew Collegiate Builder Network · Invitations & Matchmaking
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hey ${receiverName || "Builder"},\n\n${senderDisplayName} has invited you to join ${teamDisplayName} as ${roleDisplayName} on BuildCrew.\n\nLog in to your BuildCrew dashboard to accept or decline: ${appUrl}\n\nBuildCrew Team`,
  };

  const transporter = getTransporter();

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`[EMAIL INVITATION NOTICE]`);
    console.log(`SMTP_USER / SMTP_PASS not set in backend/.env.`);
    console.log(`Real email would be dispatched to: ${receiverEmail}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Team: ${teamDisplayName} | Role: ${roleDisplayName}`);
    console.log(`To enable live delivery, add SMTP credentials to backend/.env.`);
    console.log(`======================================================\n`);
    return { sent: false, reason: "SMTP credentials not provided in .env", simulated: true };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Invitation email successfully sent to ${receiverEmail}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${receiverEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}
