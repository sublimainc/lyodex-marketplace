import nodemailer from "nodemailer";
import { logger } from "./logger";

// ─── Email address constants ──────────────────────────────────────────────────
// All outbound mail uses one of these four addresses.
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment to enable sending.
export const EMAIL_INFO      = "info@lyodex.com";      // General platform / marketing
export const EMAIL_SUPPORT   = "support@lyodex.com";   // Buyer & operator transactional
export const EMAIL_DISPUTE   = "dispute@lyodex.com";   // Dispute-related communications
export const EMAIL_AUDIT     = "audit@lyodex.com";     // Internal admin alerts & audit events

function createTransporter(fromAddress: string) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return {
    transporter: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }),
    from: fromAddress,
  };
}

// ─── Shared HTML footer ───────────────────────────────────────────────────────
function emailFooter() {
  return `<div class="footer"><p><a href="https://lyodex.com">lyodex.com</a> &mdash; The freeze-drying marketplace</p></div>`;
}

function emailFooterText() {
  return "https://lyodex.com";
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────
function emailStyles() {
  return `
    body { font-family: Inter, Helvetica, Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 32px 16px; }
    .card { background: #ffffff; border-radius: 8px; max-width: 560px; margin: 0 auto; padding: 40px; }
    .header { border-bottom: 2px solid #0F6E56; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 700; color: #0F6E56; letter-spacing: -0.5px; }
    h2 { font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 4px; }
    p { color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding: 8px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    td { padding: 10px 12px; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6; }
    .highlight { background: #f0fdf8; }
    .highlight td { color: #0F6E56; font-weight: 600; }
    .ref { font-family: monospace; font-size: 12px; color: #6b7280; word-break: break-all; }
    .btn { display: inline-block; background: #0F6E56; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; margin-top: 8px; }
    .footer { margin-top: 32px; font-size: 12px; color: #9ca3af; text-align: center; }
    .footer a { color: #0F6E56; text-decoration: none; }
  `;
}

// ─── Fee receipt email — from support@ ───────────────────────────────────────
export interface FeeReceiptEmailParams {
  operatorEmail: string;
  operatorName: string;
  bidId: number;
  materialType: string;
  quantityKg: number;
  pricePerKg: number;
  contractValue: number;
  feeAmount: number;
  stripeSessionId: string;
  turnaroundDays: number;
}

export async function sendFeeReceiptEmail(params: FeeReceiptEmailParams): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_SUPPORT);

  if (!smtpConfig) {
    logger.warn({ bidId: params.bidId }, "SMTP not configured — skipping fee receipt email. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to enable.");
    return;
  }

  const { transporter, from } = smtpConfig;

  const feeFormatted = (params.feeAmount / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
  const contractFormatted = params.contractValue.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
  const pricePerKgFormatted = params.pricePerKg.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

  const subject = `LyoDex Platform Fee Receipt — Bid #${params.bidId}`;

  const text = [
    `Hello ${params.operatorName},`,
    "",
    "Thank you for your payment. This is your official receipt for the LyoDex platform fee.",
    "",
    "— Contract Details —",
    `Material:       ${params.materialType}`,
    `Quantity:       ${params.quantityKg} kg`,
    `Your bid:       ${pricePerKgFormatted}/kg`,
    `Contract value: ${contractFormatted}`,
    `Turnaround:     ${params.turnaroundDays} days`,
    "",
    "— Payment Summary —",
    `Platform fee (9%): ${feeFormatted}`,
    `Stripe reference:  ${params.stripeSessionId}`,
    "",
    "Please keep this email for your records.",
    "",
    "Questions? Reply to this email or contact support@lyodex.com",
    "",
    "The LyoDex Team",
    emailFooterText(),
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="header"><div class="logo">LyoDex</div></div>
    <h2>Platform Fee Receipt</h2>
    <p>Hello ${params.operatorName},</p>
    <p>Thank you for your payment. Below is your receipt for the LyoDex platform fee on Bid #${params.bidId}.</p>
    <table>
      <thead><tr><th colspan="2">Contract Details</th></tr></thead>
      <tbody>
        <tr><td>Material</td><td>${params.materialType}</td></tr>
        <tr><td>Quantity</td><td>${params.quantityKg} kg</td></tr>
        <tr><td>Your bid</td><td>${pricePerKgFormatted}/kg</td></tr>
        <tr><td>Contract value</td><td>${contractFormatted}</td></tr>
        <tr><td>Turnaround</td><td>${params.turnaroundDays} days</td></tr>
      </tbody>
    </table>
    <table>
      <thead><tr><th colspan="2">Payment Summary</th></tr></thead>
      <tbody>
        <tr class="highlight"><td>Platform fee (9%)</td><td>${feeFormatted}</td></tr>
        <tr><td>Stripe reference</td><td class="ref">${params.stripeSessionId}</td></tr>
      </tbody>
    </table>
    <p>Please keep this email for your accounting records. Questions? Contact <a href="mailto:support@lyodex.com">support@lyodex.com</a>.</p>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: params.operatorEmail, subject, text, html });
    logger.info({ bidId: params.bidId, to: params.operatorEmail }, "Fee receipt email sent");
  } catch (err) {
    logger.error({ err, bidId: params.bidId, to: params.operatorEmail }, "Failed to send fee receipt email");
    throw err;
  }
}

// ─── New bid notification email — from support@ ───────────────────────────────
export interface NewBidEmailParams {
  buyerEmail: string;
  bidId: number;
  requestId: number;
  operatorName: string;
  pricePerKg: number;
  turnaroundDays: number;
  materialType: string;
  quantityKg: number;
}

export async function sendNewBidEmail(params: NewBidEmailParams): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_SUPPORT);

  if (!smtpConfig) {
    logger.warn({ bidId: params.bidId }, "SMTP not configured — skipping new bid email. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to enable.");
    return;
  }

  const { transporter, from } = smtpConfig;

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domain ? `https://${domain}` : "https://lyodex.com";
  const requestUrl = `${baseUrl}/requests/${params.requestId}`;

  const priceFormatted = params.pricePerKg.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

  const subject = `New bid on your LyoDex request — ${params.materialType}`;

  const text = [
    "Hello,",
    "",
    `You have received a new bid on your LyoDex request for ${params.materialType}.`,
    "",
    "— Bid Details —",
    `Operator:   ${params.operatorName}`,
    `Bid price:  ${priceFormatted}/kg`,
    `Turnaround: ${params.turnaroundDays} days`,
    `Quantity:   ${params.quantityKg} kg`,
    "",
    "Log in to review the bid and accept or compare other offers:",
    requestUrl,
    "",
    "Need help? Contact support@lyodex.com",
    "",
    "The LyoDex Team",
    emailFooterText(),
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="header"><div class="logo">LyoDex</div></div>
    <h2>New Bid Received</h2>
    <p>You have received a new bid on your request for <strong>${params.materialType}</strong>.</p>
    <table>
      <thead><tr><th colspan="2">Bid Details</th></tr></thead>
      <tbody>
        <tr><td>Operator</td><td>${params.operatorName}</td></tr>
        <tr class="highlight"><td>Bid price</td><td>${priceFormatted}/kg</td></tr>
        <tr><td>Turnaround</td><td>${params.turnaroundDays} days</td></tr>
        <tr><td>Quantity</td><td>${params.quantityKg} kg</td></tr>
      </tbody>
    </table>
    <p>Log in to review this bid alongside any others and accept when ready.</p>
    <a href="${requestUrl}" class="btn">Review Bid</a>
    <p style="margin-top:24px; font-size:13px; color:#6b7280;">Need help? <a href="mailto:support@lyodex.com">support@lyodex.com</a></p>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: params.buyerEmail, subject, text, html });
    logger.info({ bidId: params.bidId, to: params.buyerEmail }, "New bid notification email sent to buyer");
  } catch (err) {
    logger.error({ err, bidId: params.bidId, to: params.buyerEmail }, "Failed to send new bid notification email to buyer");
    throw err;
  }
}

// ─── Dispute opened notification — from dispute@ ─────────────────────────────
export interface DisputeOpenedEmailParams {
  disputeId: number;
  requestId: number;
  buyerEmail: string;
  reason: string;
}

export async function sendDisputeOpenedEmail(params: DisputeOpenedEmailParams): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_DISPUTE);

  if (!smtpConfig) {
    logger.warn({ disputeId: params.disputeId }, "SMTP not configured — skipping dispute opened email.");
    return;
  }

  const { transporter, from } = smtpConfig;

  const subject = `LyoDex Dispute #${params.disputeId} Received — We're On It`;

  const text = [
    "Hello,",
    "",
    `Your dispute (Case #${params.disputeId}) has been received and is under review by the LyoDex team.`,
    "",
    `Request:  #${params.requestId}`,
    `Reason:   ${params.reason}`,
    "",
    "Our team will review the case and respond within 2 business days.",
    "If you have additional evidence or information, reply to this email or write to dispute@lyodex.com.",
    "",
    "The LyoDex Dispute Team",
    emailFooterText(),
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="header"><div class="logo">LyoDex</div></div>
    <h2>Dispute Received — Case #${params.disputeId}</h2>
    <p>Your dispute has been received and is now under review by the LyoDex team.</p>
    <table>
      <thead><tr><th colspan="2">Case Details</th></tr></thead>
      <tbody>
        <tr><td>Case #</td><td>${params.disputeId}</td></tr>
        <tr><td>Request #</td><td>${params.requestId}</td></tr>
        <tr><td>Reason</td><td>${params.reason}</td></tr>
        <tr class="highlight"><td>Status</td><td>Under Review</td></tr>
      </tbody>
    </table>
    <p>Our team will review your case and respond within <strong>2 business days</strong>. If you have additional evidence, reply directly to this email or write to <a href="mailto:dispute@lyodex.com">dispute@lyodex.com</a>.</p>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: params.buyerEmail, subject, text, html });
    logger.info({ disputeId: params.disputeId, to: params.buyerEmail }, "Dispute opened confirmation email sent");
  } catch (err) {
    logger.error({ err, disputeId: params.disputeId }, "Failed to send dispute opened email");
  }
}

// ─── Dispute resolved notification — from dispute@ ───────────────────────────
export interface DisputeResolvedEmailParams {
  disputeId: number;
  requestId: number;
  buyerEmail: string;
  status: string;
  decision: string | null;
}

export async function sendDisputeResolvedEmail(params: DisputeResolvedEmailParams): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_DISPUTE);

  if (!smtpConfig) {
    logger.warn({ disputeId: params.disputeId }, "SMTP not configured — skipping dispute resolved email.");
    return;
  }

  const { transporter, from } = smtpConfig;

  const statusLabel = params.status === "resolved" ? "Resolved" : params.status === "dismissed" ? "Dismissed" : params.status;
  const subject = `LyoDex Dispute #${params.disputeId} — ${statusLabel}`;

  const text = [
    "Hello,",
    "",
    `Your dispute (Case #${params.disputeId}) has been reviewed and a decision has been made.`,
    "",
    `Status:   ${statusLabel}`,
    params.decision ? `Decision: ${params.decision}` : "",
    "",
    "If you have questions about this decision, contact dispute@lyodex.com.",
    "",
    "The LyoDex Dispute Team",
    emailFooterText(),
  ].filter(Boolean).join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="header"><div class="logo">LyoDex</div></div>
    <h2>Dispute ${statusLabel} — Case #${params.disputeId}</h2>
    <p>Your dispute has been reviewed. Here is the outcome:</p>
    <table>
      <thead><tr><th colspan="2">Decision</th></tr></thead>
      <tbody>
        <tr><td>Case #</td><td>${params.disputeId}</td></tr>
        <tr><td>Request #</td><td>${params.requestId}</td></tr>
        <tr class="highlight"><td>Status</td><td>${statusLabel}</td></tr>
        ${params.decision ? `<tr><td>Notes</td><td>${params.decision}</td></tr>` : ""}
      </tbody>
    </table>
    <p>Questions about this decision? Contact <a href="mailto:dispute@lyodex.com">dispute@lyodex.com</a>.</p>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: params.buyerEmail, subject, text, html });
    logger.info({ disputeId: params.disputeId, to: params.buyerEmail }, "Dispute resolved email sent");
  } catch (err) {
    logger.error({ err, disputeId: params.disputeId }, "Failed to send dispute resolved email");
  }
}

// ─── Password reset email — from support@ ────────────────────────────────────
export interface PasswordResetEmailParams {
  email: string;
  resetToken: string;
  expiresInMinutes: number;
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_SUPPORT);

  if (!smtpConfig) {
    logger.warn({ email: params.email }, "SMTP not configured — skipping password reset email.");
    return;
  }

  const { transporter, from } = smtpConfig;

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domain ? `https://${domain}` : "https://lyodex.com";
  const resetUrl = `${baseUrl}/reset-password?token=${params.resetToken}`;

  const subject = "LyoDex — Reset your password";

  const text = [
    "Hello,",
    "",
    "You requested a password reset for your LyoDex account.",
    "",
    "Click the link below to set a new password (valid for 30 minutes):",
    resetUrl,
    "",
    "If you did not request this, please ignore this email — your account is safe.",
    "",
    "The LyoDex Team",
    emailFooterText(),
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="header"><div class="logo">LyoDex</div></div>
    <h2>Reset Your Password</h2>
    <p>You requested a password reset for your LyoDex account.</p>
    <p>Click the button below to set a new password. This link is valid for <strong>${params.expiresInMinutes} minutes</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset Password</a>
    <p style="margin-top:24px; font-size:12px; color:#6b7280;">
      Or copy this URL into your browser:<br/>
      <span class="ref">${resetUrl}</span>
    </p>
    <p style="font-size:12px; color:#9ca3af;">If you did not request this reset, you can safely ignore this email.</p>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: params.email, subject, text, html });
    logger.info({ to: params.email }, "Password reset email sent");
  } catch (err) {
    logger.error({ err, to: params.email }, "Failed to send password reset email");
    throw err;
  }
}

// ─── Onboarding incomplete notification — from support@ ──────────────────────
export interface OnboardingIncompleteEmailParams {
  operatorEmail: string;
  operatorName: string;
  bidId: number;
  requestId: number;
  materialType: string;
  contractValue: number;
  operatorPayout: number;
}

export async function sendOnboardingIncompleteEmail(params: OnboardingIncompleteEmailParams): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_SUPPORT);

  if (!smtpConfig) {
    logger.warn({ bidId: params.bidId }, "SMTP not configured — skipping onboarding-incomplete email.");
    return;
  }

  const { transporter, from } = smtpConfig;

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domain ? `https://${domain}` : "https://lyodex.com";
  const dashboardUrl = `${baseUrl}/dashboard`;

  const contractFormatted = params.contractValue.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
  const payoutFormatted = params.operatorPayout.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

  const subject = `Action required: complete Stripe onboarding to receive your payout — Bid #${params.bidId}`;

  const text = [
    `Hello ${params.operatorName},`,
    "",
    `A buyer has tried to mark your contract complete for Bid #${params.bidId} (${params.materialType}), which would release your payout of ${payoutFormatted} CAD.`,
    "",
    "However, your Stripe payout account is not fully set up yet. To receive this payment, you need to complete Stripe onboarding on your LyoDex dashboard.",
    "",
    "Contract details:",
    `  Bid #:          ${params.bidId}`,
    `  Request #:      ${params.requestId}`,
    `  Material:       ${params.materialType}`,
    `  Contract value: ${contractFormatted}`,
    `  Your payout:    ${payoutFormatted} (after 9% platform fee)`,
    "",
    "To complete onboarding, log in to your dashboard and click 'Set up payouts':",
    dashboardUrl,
    "",
    "Once your Stripe account is approved, the buyer will be able to release the funds and you will receive your payout automatically.",
    "",
    "Questions? Contact support@lyodex.com",
    "",
    "The LyoDex Team",
    emailFooterText(),
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="header"><div class="logo">LyoDex</div></div>
    <h2>Action Required: Complete Stripe Onboarding</h2>
    <p>Hello ${params.operatorName},</p>
    <p>A buyer is ready to mark Bid #${params.bidId} complete and release your payout, but your Stripe payout account is not fully set up yet.</p>
    <table>
      <thead><tr><th colspan="2">Contract Details</th></tr></thead>
      <tbody>
        <tr><td>Bid #</td><td>${params.bidId}</td></tr>
        <tr><td>Request #</td><td>${params.requestId}</td></tr>
        <tr><td>Material</td><td>${params.materialType}</td></tr>
        <tr><td>Contract value</td><td>${contractFormatted}</td></tr>
        <tr class="highlight"><td>Your payout (after 9% fee)</td><td>${payoutFormatted}</td></tr>
      </tbody>
    </table>
    <p>To receive this payment, please finish setting up your Stripe payout account on your dashboard. Once your account is approved, the buyer can release the funds immediately.</p>
    <a href="${dashboardUrl}" class="btn">Complete Stripe Onboarding</a>
    <p style="margin-top:24px; font-size:13px; color:#6b7280;">Questions? <a href="mailto:support@lyodex.com">support@lyodex.com</a></p>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: params.operatorEmail, subject, text, html });
    logger.info({ bidId: params.bidId, to: params.operatorEmail }, "Onboarding-incomplete notification sent to operator");
  } catch (err) {
    logger.error({ err, bidId: params.bidId, to: params.operatorEmail }, "Failed to send onboarding-incomplete email");
  }
}

// ─── Stripe account disconnected notification — from support@ ────────────────
export interface StripeDisconnectedEmailParams {
  operatorEmail: string;
  operatorName: string;
}

export async function sendStripeDisconnectedEmail(params: StripeDisconnectedEmailParams): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_SUPPORT);

  if (!smtpConfig) {
    logger.warn({ operatorEmail: params.operatorEmail }, "SMTP not configured — skipping Stripe disconnected email. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to enable.");
    return;
  }

  const { transporter, from } = smtpConfig;

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domain ? `https://${domain}` : "https://lyodex.com";
  const dashboardUrl = `${baseUrl}/dashboard`;

  const subject = "Action required: your Stripe payout account was disconnected — LyoDex";

  const text = [
    `Hello ${params.operatorName},`,
    "",
    "Your Stripe payout account has been disconnected from LyoDex.",
    "",
    "This means you will not receive payouts for any contracts until you reconnect your account.",
    "If you did not intend to disconnect, please reconnect as soon as possible to avoid missing payments.",
    "",
    "To reconnect, log in to your LyoDex dashboard and click 'Set up payouts':",
    dashboardUrl,
    "",
    "Questions? Contact support@lyodex.com",
    "",
    "The LyoDex Team",
    emailFooterText(),
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="header"><div class="logo">LyoDex</div></div>
    <h2>Stripe Payout Account Disconnected</h2>
    <p>Hello ${params.operatorName},</p>
    <p>Your Stripe payout account has been <strong>disconnected</strong> from LyoDex.</p>
    <p>Until you reconnect, you will not receive payouts for any completed contracts. If this was unintentional, please reconnect your account right away.</p>
    <a href="${dashboardUrl}" class="btn">Reconnect Stripe Account</a>
    <p style="margin-top:24px; font-size:13px; color:#6b7280;">Questions? <a href="mailto:support@lyodex.com">support@lyodex.com</a></p>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: params.operatorEmail, subject, text, html });
    logger.info({ to: params.operatorEmail, operatorName: params.operatorName }, "Stripe disconnected notification email sent to operator");
  } catch (err) {
    logger.error({ err, to: params.operatorEmail }, "Failed to send Stripe disconnected notification email");
  }
}

// ─── Listing approved notification — from support@ ───────────────────────────
export interface ListingApprovedEmailParams {
  operatorEmail: string;
  listingType: "capacity" | "product";
  listingLabel: string;
}

export async function sendListingApprovedEmail(params: ListingApprovedEmailParams): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_SUPPORT);

  if (!smtpConfig) {
    logger.warn({ operatorEmail: params.operatorEmail }, "SMTP not configured — skipping listing-approved email.");
    return;
  }

  const { transporter, from } = smtpConfig;

  const typeLabel = params.listingType === "capacity" ? "capacity listing" : "product listing";
  const subject = `Your LyoDex ${typeLabel} has been approved`;

  const text = [
    "Hello,",
    "",
    `Good news! Your ${typeLabel} (${params.listingLabel}) has been reviewed and approved by the LyoDex team.`,
    "",
    `It is now visible to ${params.listingType === "capacity" ? "buyers browsing the marketplace" : "shoppers in the product catalogue"}.`,
    "",
    "Log in to your dashboard to view your active listings:",
    "https://lyodex.com/dashboard",
    "",
    "Questions? Contact support@lyodex.com",
    "",
    "The LyoDex Team",
    emailFooterText(),
  ].join("\n");

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domain ? `https://${domain}` : "https://lyodex.com";
  const dashboardUrl = `${baseUrl}/dashboard`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}
    .approved { color: #0F6E56; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header"><div class="logo">LyoDex</div></div>
    <h2>Listing Approved</h2>
    <p>Hello,</p>
    <p>Your <strong>${typeLabel}</strong> (<em>${params.listingLabel}</em>) has been reviewed and <span class="approved">approved</span> by the LyoDex team.</p>
    <p>It is now ${params.listingType === "capacity" ? "visible to buyers browsing the marketplace" : "visible in the LyoDex product catalogue"}.</p>
    <a href="${dashboardUrl}" class="btn">View My Listings</a>
    <p style="margin-top:24px; font-size:13px; color:#6b7280;">Questions? <a href="mailto:support@lyodex.com">support@lyodex.com</a></p>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: params.operatorEmail, subject, text, html });
    logger.info({ to: params.operatorEmail, listingType: params.listingType }, "Listing approved email sent to operator");
  } catch (err) {
    logger.error({ err, to: params.operatorEmail }, "Failed to send listing-approved email");
  }
}

// ─── Listing rejected notification — from support@ ────────────────────────────
export interface ListingRejectedEmailParams {
  operatorEmail: string;
  listingType: "capacity" | "product";
  listingLabel: string;
  reason: string;
}

export async function sendListingRejectedEmail(params: ListingRejectedEmailParams): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_SUPPORT);

  if (!smtpConfig) {
    logger.warn({ operatorEmail: params.operatorEmail }, "SMTP not configured — skipping listing-rejected email.");
    return;
  }

  const { transporter, from } = smtpConfig;

  const typeLabel = params.listingType === "capacity" ? "capacity listing" : "product listing";
  const subject = `Your LyoDex ${typeLabel} was not approved`;

  const text = [
    "Hello,",
    "",
    `Your ${typeLabel} (${params.listingLabel}) has been reviewed by the LyoDex team and was not approved at this time.`,
    "",
    "— Reason —",
    params.reason,
    "",
    "You are welcome to update your listing and resubmit for review. Log in to your dashboard to make changes:",
    "https://lyodex.com/dashboard",
    "",
    "If you have questions about this decision, contact support@lyodex.com",
    "",
    "The LyoDex Team",
    emailFooterText(),
  ].join("\n");

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domain ? `https://${domain}` : "https://lyodex.com";
  const dashboardUrl = `${baseUrl}/dashboard`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="header"><div class="logo">LyoDex</div></div>
    <h2>Listing Not Approved</h2>
    <p>Hello,</p>
    <p>Your <strong>${typeLabel}</strong> (<em>${params.listingLabel}</em>) has been reviewed by the LyoDex team and was not approved at this time.</p>
    <table>
      <thead><tr><th>Reason for rejection</th></tr></thead>
      <tbody><tr><td>${params.reason}</td></tr></tbody>
    </table>
    <p>You are welcome to update your listing to address the feedback and resubmit for review.</p>
    <a href="${dashboardUrl}" class="btn">Update My Listing</a>
    <p style="margin-top:24px; font-size:13px; color:#6b7280;">Questions? <a href="mailto:support@lyodex.com">support@lyodex.com</a></p>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: params.operatorEmail, subject, text, html });
    logger.info({ to: params.operatorEmail, listingType: params.listingType }, "Listing rejected email sent to operator");
  } catch (err) {
    logger.error({ err, to: params.operatorEmail }, "Failed to send listing-rejected email");
  }
}

// ─── Scheduled market intelligence report email — from audit@ ────────────────
export interface ScheduledReportEmailParams {
  cadence: "weekly" | "monthly";
  dateRangeStart: string;
  dateRangeEnd: string;
  reportId: number;
  data: {
    sales_volume?: { total_contracts: number; total_quantity_kg: number; total_contract_value: number; platform_fees: number };
    top_materials?: { name: string; value: number }[];
    avg_price_by_category?: { category: string; avg_price: number; count: number }[];
    requests_by_month?: { month: string; value: number }[];
    bids_by_month?: { month: string; value: number }[];
    operator_win_rates?: { name: string; win_rate: number; total_bids: number; won_bids: number }[];
    summary?: string;
  };
}

export async function sendScheduledReportEmail(params: ScheduledReportEmailParams): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_AUDIT);

  if (!smtpConfig) {
    logger.warn({ reportId: params.reportId }, "SMTP not configured — skipping scheduled report email. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to enable.");
    return;
  }

  const { transporter, from } = smtpConfig;
  const adminEmail = process.env.ADMIN_EMAIL ?? EMAIL_AUDIT;

  const cadenceLabel = params.cadence === "weekly" ? "Weekly" : "Monthly";
  const subject = `LyoDex ${cadenceLabel} Market Intelligence Report — ${params.dateRangeStart} to ${params.dateRangeEnd}`;

  const { data } = params;
  const sv = data.sales_volume;
  const contractValueFormatted = sv ? sv.total_contract_value.toLocaleString("en-CA", { style: "currency", currency: "CAD" }) : "N/A";
  const feesFormatted = sv ? sv.platform_fees.toLocaleString("en-CA", { style: "currency", currency: "CAD" }) : "N/A";

  const topMaterials = (data.top_materials ?? []).slice(0, 5).map((m) => `${m.name} (${m.value})`).join(", ") || "N/A";
  const topOperators = (data.operator_win_rates ?? []).slice(0, 3).map((o) => `${o.name} ${o.win_rate}% win rate`).join("; ") || "N/A";
  const avgPrices = (data.avg_price_by_category ?? []).slice(0, 4)
    .map((p) => `${p.category}: $${p.avg_price.toFixed(2)}/kg`)
    .join("; ") || "N/A";

  const text = [
    `LyoDex ${cadenceLabel} Market Intelligence Report`,
    `Period: ${params.dateRangeStart} to ${params.dateRangeEnd}`,
    "",
    "— Volume Summary —",
    `Total contracts:       ${sv?.total_contracts ?? 0}`,
    `Total volume:          ${sv?.total_quantity_kg.toFixed(1) ?? 0} kg`,
    `Total contract value:  ${contractValueFormatted}`,
    `Platform fees:         ${feesFormatted}`,
    "",
    "— Top Materials —",
    topMaterials,
    "",
    "— Avg Prices by Category —",
    avgPrices,
    "",
    "— Top Operators by Win Rate —",
    topOperators,
    "",
    data.summary ?? "",
    "",
    `Full report: https://lyodex.com/admin (Report #${params.reportId})`,
    "",
    "This is an automated scheduled report from LyoDex.",
    emailFooterText(),
  ].join("\n");

  const topMaterialsRows = (data.top_materials ?? []).slice(0, 5).map((m) =>
    `<tr><td>${m.name}</td><td>${m.value} requests</td></tr>`
  ).join("");

  const avgPriceRows = (data.avg_price_by_category ?? []).slice(0, 5).map((p) =>
    `<tr><td>${p.category}</td><td>$${p.avg_price.toFixed(2)}/kg</td><td>${p.count} data points</td></tr>`
  ).join("");

  const winRateRows = (data.operator_win_rates ?? []).slice(0, 5).map((o) =>
    `<tr><td>${o.name}</td><td>${o.win_rate}%</td><td>${o.won_bids}/${o.total_bids}</td></tr>`
  ).join("");

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domain ? `https://${domain}` : "https://lyodex.com";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}
    .badge { display: inline-block; background: #f0fdf8; color: #0F6E56; border: 1px solid #86efca; border-radius: 4px; padding: 2px 8px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">LyoDex</div>
    </div>
    <h2>${cadenceLabel} Market Intelligence Report</h2>
    <p><span class="badge">${params.dateRangeStart} &mdash; ${params.dateRangeEnd}</span></p>
    <p>${data.summary ?? "Automated market intelligence snapshot."}</p>

    <table>
      <thead><tr><th colspan="2">Volume Summary</th></tr></thead>
      <tbody>
        <tr><td>Total contracts</td><td>${sv?.total_contracts ?? 0}</td></tr>
        <tr><td>Total volume</td><td>${sv?.total_quantity_kg.toFixed(1) ?? 0} kg</td></tr>
        <tr class="highlight"><td>Contract value</td><td>${contractValueFormatted}</td></tr>
        <tr class="highlight"><td>Platform fees</td><td>${feesFormatted}</td></tr>
      </tbody>
    </table>

    ${topMaterialsRows ? `
    <table>
      <thead><tr><th>Top Materials</th><th>Requests</th></tr></thead>
      <tbody>${topMaterialsRows}</tbody>
    </table>` : ""}

    ${avgPriceRows ? `
    <table>
      <thead><tr><th>Category</th><th>Avg Price</th><th>Data Points</th></tr></thead>
      <tbody>${avgPriceRows}</tbody>
    </table>` : ""}

    ${winRateRows ? `
    <table>
      <thead><tr><th>Top Operators</th><th>Win Rate</th><th>Won/Total Bids</th></tr></thead>
      <tbody>${winRateRows}</tbody>
    </table>` : ""}

    <a href="${baseUrl}/admin" class="btn">View Full Report in Admin</a>
    <p style="margin-top:24px; font-size:12px; color:#9ca3af;">This is an automated ${cadenceLabel.toLowerCase()} report (Report #${params.reportId}). To change report frequency or disable, visit Site Controls in the admin panel.</p>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: adminEmail, subject, text, html });
    logger.info({ to: adminEmail, reportId: params.reportId, cadence: params.cadence }, "Scheduled report email sent to admin");
  } catch (err) {
    logger.error({ err, to: adminEmail, reportId: params.reportId }, "Failed to send scheduled report email");
    throw err;
  }
}

// ─── Admin alert email — from audit@ ─────────────────────────────────────────
export async function sendAdminAlertEmail(subject: string, body: string): Promise<void> {
  const smtpConfig = createTransporter(EMAIL_AUDIT);

  if (!smtpConfig) {
    logger.warn({ subject }, "SMTP not configured — skipping admin alert email. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to enable.");
    return;
  }

  const { transporter, from } = smtpConfig;
  const adminEmail = process.env.ADMIN_EMAIL ?? EMAIL_AUDIT;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${emailStyles()}
    pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; font-size: 13px; color: #374151; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header"><div class="logo">LyoDex</div></div>
    <h2>${subject}</h2>
    <pre>${body}</pre>
    ${emailFooter()}
  </div>
</body>
</html>`.trim();

  try {
    await transporter.sendMail({ from, to: adminEmail, subject, text: body, html });
    logger.info({ to: adminEmail, subject }, "Admin alert email sent");
  } catch (err) {
    logger.error({ err, to: adminEmail, subject }, "Failed to send admin alert email");
    throw err;
  }
}
