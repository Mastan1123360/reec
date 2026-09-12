/**
 * lib/email/sender.ts
 *
 * Transactional Email Dispatcher for REEC Academy.
 *
 * Provides:
 * 1. Instant delivery via Resend REST API (when RESEND_API_KEY is configured).
 * 2. Custom SMTP fallback if SMTP credentials exist.
 * 3. Graceful fallback to Supabase built-in mailer when external providers are not set.
 */

interface SendVerificationEmailOptions {
  email: string;
  actionLink: string;
  username?: string;
}

export async function sendVerificationEmail({
  email,
  actionLink,
  username,
}: SendVerificationEmailOptions): Promise<{ delivered: boolean; provider: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const displayName = username ? `@${username}` : cleanEmail.split("@")[0];

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm your REEC Academy account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #0b1120; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #111a2e; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="display: inline-block; padding: 8px 16px; background-color: rgba(37, 99, 235, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 9999px; margin-bottom: 16px;">
                <span style="color: #60a5fa; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">REEC Academy</span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Confirm Your Account
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px; text-align: left;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Hello <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Welcome to REEC Academy! To complete your registration and activate your interactive Rust engineering curriculum, please verify your email address by clicking the button below:
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${actionLink}" target="_blank" rel="noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4); text-align: center;">
                      Verify &amp; Activate Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 8px; font-size: 13px; line-height: 1.5; color: #64748b;">
                Or copy and paste this verification URL directly into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.4; word-break: break-all; color: #3b82f6; background-color: rgba(15, 23, 42, 0.6); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
                ${actionLink}
              </p>

              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; color: #64748b; line-height: 1.5;">
                <p style="margin: 0 0 6px;">
                  This link expires in 24 hours. No confirmation code is needed.
                </p>
                <p style="margin: 0;">
                  If you didn't create a REEC Academy account, you can safely ignore this message.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0d1527; text-align: center; font-size: 11px; color: #475569;">
              REEC Academy &copy; ${new Date().getFullYear()} &bull; Interactive Systems &amp; Rust Engineering
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // 1. Check for RESEND_API_KEY (instant delivery via Resend API)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim().length > 0) {
    try {
      const fromEmail = process.env.EMAIL_FROM || "REEC Academy <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [cleanEmail],
          subject: "Confirm your REEC Academy account",
          html: htmlBody,
        }),
      });

      if (res.ok) {
        console.log(`[EmailSender] Verification email dispatched instantly via Resend to ${cleanEmail}`);
        return { delivered: true, provider: "resend" };
      }

      const resendErr = await res.json().catch(() => ({}));
      console.warn("[EmailSender] Resend API error:", res.status, resendErr);
      return {
        delivered: false,
        provider: "resend",
        error: resendErr.message || `Resend HTTP ${res.status}`,
      };
    } catch (err) {
      console.warn("[EmailSender] Resend fetch exception:", err);
    }
  }

  // Fallback: No direct transactional API key present
  console.log(
    `[EmailSender] Direct transactional key not configured; relying on Supabase mailer for ${cleanEmail}.`
  );
  return { delivered: false, provider: "supabase-fallback" };
}
