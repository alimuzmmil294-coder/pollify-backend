import nodemailer from "nodemailer";

// Parse port as a number
const port = Number(process.env.SMTP_PORT || process.env.STMP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.STMP_HOST,
  port: port,
  // FIXED: Port 465 is secure (SSL), Port 587 is not secure (TLS/STARTTLS)
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER || process.env.STMP_USER,
    pass: process.env.SMTP_PASS || process.env.STMP_PASS,
  },
});

export const sendOtpEmail = async (to, otp, reason = "Verify your email..") => {
  const fromUser =
    process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.STMP_USER;

  await transporter.sendMail({
    from: `"Pollify" <${fromUser}>`,
    to,
    subject: `${otp} is your Pollify code`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:440px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
        <h2 style="color:#4f46e5;margin:0 0 8px">Pollify</h2>
        <p style="color:#475569">Use this code to ${reason}:</p>
        <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#0f172a;margin:16px 0">${otp}</div>
        <p style="color:#94a3b8;font-size:13px">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
      </div>`,
  });
};
