import nodemailer from 'nodemailer';

// Gmail SMTP transporter
// Uses App Password (2FA required on the Gmail/Workspace account)
// Switch to Resend (resend.com) once a domain is verified
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,          // SSL
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
};

/**
 * Send an OTP email via Gmail SMTP.
 * @param {string} toEmail  - Recipient email address
 * @param {string} otp      - 4-digit OTP string
 */
export const sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"Finn4Sure" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} is your Finn4Sure login OTP`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="margin:0;padding:0;background:#f4f7fb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#0f3460 0%,#16a085 100%);padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Finn4Sure</h1>
                      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Secure Financial Services</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 40px 32px;">
                      <p style="margin:0 0 8px;color:#0f3460;font-size:18px;font-weight:600;">Your One-Time Password</p>
                      <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.6;">
                        Use the code below to sign in to your Finn4Sure account. This OTP is valid for <strong>5 minutes</strong> and can only be used once.
                      </p>
                      <!-- OTP Box -->
                      <div style="background:#f0fdf4;border:2px dashed #16a085;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                        <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#0f3460;font-family:monospace;">${otp}</span>
                      </div>
                      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                        If you did not request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                      <p style="margin:0;color:#94a3b8;font-size:11px;">© ${new Date().getFullYear()} Finn4Sure. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  try {
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${toEmail} | Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('❌ Gmail SMTP error:', err.message);
    throw new Error(`Failed to send OTP email: ${err.message}`);
  }
};

/**
 * Send a welcome/credentials email to a borrower created by a partner (direct reach).
 * @param {string} toEmail      - Borrower's email address
 * @param {string} name         - Borrower's name
 * @param {string} password     - Default plain-text password
 * @param {string} partnerName  - Name of the partner who referred the borrower
 * @param {string} loanType     - Loan type name (e.g., Home Loan)
 * @param {number} loanAmount   - Loan amount applied for
 */
export const sendWelcomeEmail = async (toEmail, name, password, partnerName = 'your partner', loanType = 'Loan', loanAmount = null) => {
  const mailOptions = {
    from: `"Finn4Sure" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `Welcome to Finn4Sure — Your Account Details`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="margin:0;padding:0;background:#f4f7fb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#0f3460 0%,#16a085 100%);padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Finn4Sure</h1>
                      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Secure Financial Services</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 40px 32px;">
                      <p style="margin:0 0 8px;color:#0f3460;font-size:18px;font-weight:600;">Welcome, ${name}! 🎉</p>
                      <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                        <strong>${partnerName}</strong> has submitted a loan application on your behalf through Finn4Sure. An account has been created so you can track your application directly.
                      </p>

                      <!-- Loan Application Details -->
                      <div style="background:#fefce8;border:2px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:24px;">
                        <p style="margin:0 0 12px;color:#92400e;font-size:14px;font-weight:700;">📋 Loan Application Details</p>
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="color:#78350f;font-size:13px;padding:5px 0;width:130px;">Referred by</td>
                            <td style="color:#1c1917;font-size:13px;font-weight:600;padding:5px 0;">${partnerName}</td>
                          </tr>
                          <tr>
                            <td style="color:#78350f;font-size:13px;padding:5px 0;">Loan Type</td>
                            <td style="color:#1c1917;font-size:13px;font-weight:600;padding:5px 0;">${loanType}</td>
                          </tr>
                          ${loanAmount ? `<tr>
                            <td style="color:#78350f;font-size:13px;padding:5px 0;">Loan Amount</td>
                            <td style="color:#1c1917;font-size:13px;font-weight:600;padding:5px 0;">₹${Number(loanAmount).toLocaleString('en-IN')}</td>
                          </tr>` : ''}
                        </table>
                      </div>

                      <!-- Credentials Box -->
                      <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:12px;padding:24px;margin-bottom:28px;">
                        <p style="margin:0 0 12px;color:#0f3460;font-size:14px;font-weight:700;">🔑 Your Login Credentials</p>
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="color:#64748b;font-size:13px;padding:6px 0;width:100px;">Email ID</td>
                            <td style="color:#0f3460;font-size:13px;font-weight:600;padding:6px 0;">${toEmail}</td>
                          </tr>
                          <tr>
                            <td style="color:#64748b;font-size:13px;padding:6px 0;">Password</td>
                            <td style="font-family:monospace;background:#e0f2fe;padding:4px 10px;border-radius:6px;color:#0369a1;font-size:14px;font-weight:700;letter-spacing:1px;">${password}</td>
                          </tr>
                        </table>
                      </div>
                      <p style="margin:0 0 16px;color:#64748b;font-size:13px;line-height:1.6;">
                        👉 Please <a href="https://finn4sure.com/login" style="color:#16a085;font-weight:600;">log in here</a> and change your password as soon as possible.
                      </p>
                      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                        If you did not request this, please contact your partner or our support team.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                      <p style="margin:0;color:#94a3b8;font-size:11px;">© ${new Date().getFullYear()} Finn4Sure. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  try {
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${toEmail} | Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('❌ Gmail SMTP error sending welcome email:', err.message);
    throw new Error(`Failed to send welcome email: ${err.message}`);
  }
};

