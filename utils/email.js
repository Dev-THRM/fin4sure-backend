import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an OTP email using Resend.
 * @param {string} to  - Recipient email address
 * @param {string} otp - The 4-digit OTP code
 */
export async function sendOtpEmail(to, otp) {
  const { error } = await resend.emails.send({
    from: "Fin4Sure <onboarding@resend.dev>", // Replace with your verified domain later
    to,
    subject: "Your Fin4Sure Verification Code",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f7f8fc; padding: 32px 16px;">
        <div style="background: #fff; border-radius: 12px; padding: 36px 32px; box-shadow: 0 2px 16px rgba(0,0,0,0.07);">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 2rem;">🔐</span>
            <h2 style="color: #1a2e4a; font-size: 1.35rem; margin: 8px 0 4px;">Fin4Sure Verification</h2>
            <p style="color: #64748b; font-size: 0.88rem; margin: 0;">Your one-time verification code</p>
          </div>

          <div style="background: #f0f4ff; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
            <p style="color: #64748b; font-size: 0.82rem; margin: 0 0 10px; letter-spacing: 0.04em; text-transform: uppercase;">Verification Code</p>
            <span style="font-size: 2.6rem; font-weight: 800; color: #1a2e4a; letter-spacing: 0.25em;">${otp}</span>
          </div>

          <p style="color: #64748b; font-size: 0.82rem; text-align: center; margin: 0 0 8px;">
            This code is valid for <strong>5 minutes</strong>. Do not share it with anyone.
          </p>
          <p style="color: #94a3b8; font-size: 0.76rem; text-align: center; margin: 0;">
            If you didn't request this code, you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px;" />
          <p style="color: #cbd5e1; font-size: 0.72rem; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} Fin4Sure. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error("Failed to send OTP email");
  }
}
