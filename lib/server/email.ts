import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured.");
    console.info(`[development] Password reset for ${email}: ${resetUrl}`);
    return { previewUrl: resetUrl };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass: password },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "UDST Schedule <no-reply@example.com>",
    to: email,
    subject: "Reset your UDST Schedule password",
    text: `Use this link within 30 minutes to reset your password: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Use the link below within 30 minutes to reset your password.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
  return {};
}
