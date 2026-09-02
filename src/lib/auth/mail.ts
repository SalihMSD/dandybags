import nodemailer from "nodemailer";
import { issueAuthToken } from "@/lib/db/tokens";
import { siteUrl } from "@/lib/site";

export async function issueToken(userId: string, type: "VERIFY_EMAIL" | "RESET_PASSWORD", hours: number) {
  return issueAuthToken(userId, type, hours);
}

export function appUrl() {
  return siteUrl();
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function deliverMail(subject: string, to: string, text: string) {
  if (!smtpConfigured()) {
    console.info(`[DANDY mail] SMTP not configured. Would send to=${to} subject=${subject}\n${text}`);
    return;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `DANDY <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
  } catch {
    console.error("[DANDY mail] SMTP send failed");
    throw new Error("Email could not be sent. Please try again.");
  }
}

export function verifyUrl(token: string) {
  return `${appUrl()}/verify-email?token=${token}`;
}

export async function sendVerifyEmail(user: { fullName: string; email: string }, token: string) {
  const url = verifyUrl(token);
  await deliverMail(
    "Verify Your DANDY Account",
    user.email,
    `Hello ${user.fullName},\n\nVerify your DANDY account:\n${url}\n\nThis link expires in 24 hours.\n\nBAGS FOR EVERY JOURNEY`,
  );
  return url;
}

export async function sendResetEmail(user: { fullName: string; email: string }, token: string) {
  const url = `${appUrl()}/reset-password?token=${token}`;
  await deliverMail(
    "Reset your DANDY password",
    user.email,
    `Hello ${user.fullName},\n\nReset your password:\n${url}\n\nThis link expires in 1 hour. If you did not ask for this, ignore the email.\n\nBAGS FOR EVERY JOURNEY`,
  );
  return url;
}

export async function sendOrderConfirmation(input: {
  to: string;
  orderId: string;
  paymentStatus: string;
  totalLabel: string;
  items: { name: string; qty: number }[];
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
  };
  trackingUrl?: string;
}) {
  const itemLines = input.items.map((i) => `  - ${i.name} x${i.qty}`).join("\n");
  const text = `Hello ${input.shippingAddress.fullName},\n\nYour DANDY order has been placed.\n\nOrder ID: ${input.orderId}\nPayment: ${input.paymentStatus}\nTotal: ${input.totalLabel}\n\nItems:\n${itemLines}\n\nDelivery to:\n${input.shippingAddress.fullName}\n${input.shippingAddress.line1}${input.shippingAddress.line2 ? ", " + input.shippingAddress.line2 : ""}\n${input.shippingAddress.city}, ${input.shippingAddress.state} ${input.shippingAddress.pincode}\nPhone: ${input.shippingAddress.phone}\n${
    input.trackingUrl ? `\nTrack your order:\n${input.trackingUrl}\n` : "\nTracking updates will be shared once dispatched.\n"
  }\nBAGS FOR EVERY JOURNEY`;

  await deliverMail(`Order confirmation ${input.orderId}`, input.to, text);
}
