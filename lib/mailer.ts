import nodemailer from "nodemailer";

type MailPayload = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

type PasswordResetAlertPayload = {
  email: string;
  event: "requested" | "completed";
  occurredAt?: string;
  ipAddress?: string;
  userAgent?: string;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function getSmtpPort() {
  const port = Number.parseInt(getEnv("SMTP_PORT"), 10);
  return Number.isFinite(port) ? port : 587;
}

function getSmtpSecure(port: number) {
  const secureValue = getEnv("SMTP_SECURE").toLowerCase();

  if (secureValue) {
    return ["1", "true", "yes"].includes(secureValue);
  }

  return port === 465;
}

function getMailerConfig() {
  const host = getEnv("SMTP_HOST");
  const port = getSmtpPort();
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASS");
  const from = getEnv("SMTP_FROM") || user;

  if (!host || !from) {
    throw new Error("Nodemailer SMTP is not configured. Add SMTP_HOST and SMTP_FROM to .env.local, then restart the server.");
  }

  return {
    host,
    port,
    secure: getSmtpSecure(port),
    auth: user && pass ? { user, pass } : undefined,
    from,
  };
}

function getTransporter() {
  if (!transporter) {
    const config = getMailerConfig();

    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  return transporter;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getAdminAlertRecipients() {
  return getEnv("ADMIN_ALERT_EMAIL")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function renderShell(title: string, body: string) {
  return `
    <div style="margin:0;background:#f6f8fb;padding:28px 0;font-family:Arial,sans-serif;color:#101827;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:14px;overflow:hidden;">
        <div style="padding:22px 24px;border-bottom:1px solid #edf1f6;">
          <div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#15803d;">TractionFlo</div>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.25;color:#101827;">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:24px;font-size:15px;line-height:1.6;color:#334155;">${body}</div>
      </div>
    </div>
  `;
}

export function isEmailConfigured() {
  return Boolean(getEnv("SMTP_HOST") && (getEnv("SMTP_FROM") || getEnv("SMTP_USER")));
}

export async function sendEmail(payload: MailPayload) {
  const config = getMailerConfig();
  const mailer = getTransporter();

  return mailer.sendMail({
    from: config.from,
    ...payload,
  });
}

export async function sendPasswordResetOtpEmail(email: string, otp: string) {
  const safeOtp = escapeHtml(otp);
  const html = renderShell(
    "Your password reset code",
    `
      <p style="margin:0 0 14px;">Use this one-time code to reset your TractionFlo password:</p>
      <div style="margin:18px 0;padding:16px 18px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:28px;font-weight:800;letter-spacing:.24em;text-align:center;color:#14532d;">${safeOtp}</div>
      <p style="margin:0;">This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.</p>
    `
  );

  return sendEmail({
    to: email,
    subject: "Your TractionFlo password reset code",
    text: `Your TractionFlo password reset code is ${otp}. It expires in 10 minutes.`,
    html,
  });
}

export async function sendPasswordResetAlertEmail({
  email,
  event,
  occurredAt = new Date().toISOString(),
  ipAddress,
  userAgent,
}: PasswordResetAlertPayload) {
  const recipients = getAdminAlertRecipients();

  if (recipients.length === 0) {
    return null;
  }

  const title = event === "completed" ? "Password reset completed" : "Password reset OTP requested";
  const lines = [
    `Account: ${email}`,
    `Time: ${occurredAt}`,
    ipAddress ? `IP address: ${ipAddress}` : "",
    userAgent ? `User agent: ${userAgent}` : "",
  ].filter(Boolean);
  const html = renderShell(
    title,
    `<ul style="margin:0;padding-left:18px;">${lines
      .map((line) => `<li style="margin:0 0 8px;">${escapeHtml(line)}</li>`)
      .join("")}</ul>`
  );

  return sendEmail({
    to: recipients,
    subject: `TractionFlo alert: ${title}`,
    text: lines.join("\n"),
    html,
  });
}
