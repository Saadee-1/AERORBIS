import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Resend } from "resend";

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5;
const ipBuckets = new Map();

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();
  if (Array.isArray(xff) && xff.length > 0) return String(xff[0]).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function rateLimitOk(ip) {
  const now = Date.now();
  const bucket = ipBuckets.get(ip) || [];
  const fresh = bucket.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  fresh.push(now);
  ipBuckets.set(ip, fresh);
  return fresh.length <= RATE_LIMIT_MAX;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(email) {
  if (typeof email !== "string") return false;
  if (email.length < 3 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json(res, status, body) {
  res.status(status);
  res.set("Content-Type", "application/json");
  res.send(JSON.stringify(body));
}

export const contact = onRequest(
  {
    cors: true,
    secrets: [RESEND_API_KEY],
    region: "us-central1",
  },
  async (req, res) => {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const ip = getClientIp(req);
    if (!rateLimitOk(ip)) return json(res, 429, { error: "Too many requests. Please try again later." });

    const { name, email, category, calculator, subject, message } = req.body || {};
    if (!name || !email || !category || !message) return json(res, 400, { error: "Missing required fields" });
    if (!isValidEmail(email)) return json(res, 400, { error: "Invalid email address" });

    if (String(name).length > 100) return json(res, 400, { error: "Name is too long" });
    if (String(category).length > 60) return json(res, 400, { error: "Category is too long" });
    if (calculator && String(calculator).length > 120) return json(res, 400, { error: "Calculator is too long" });
    if (subject && String(subject).length > 140) return json(res, 400, { error: "Subject is too long" });
    if (String(message).length > 6000) return json(res, 400, { error: "Message is too long" });

    const apiKey = RESEND_API_KEY.value() || process.env.RESEND_API_KEY;
    if (!apiKey) return json(res, 503, { error: "Email service is not configured" });

    const resend = new Resend(apiKey);

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCategory = escapeHtml(category);
    const safeCalculator = calculator ? escapeHtml(calculator) : null;
    const safeSubject = subject ? escapeHtml(subject) : null;
    const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br/>");

    try {
      await resend.emails.send({
        from: "AERORBIS Contact <contact@aerorbis.space>",
        to: "albertienstien123@gmail.com",
        replyTo: email,
        subject: `[${safeCategory}] ${safeSubject || "No Subject"} - from ${safeName}`,
        html: `
          <h2>New Message via AERORBIS Contact Form</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Category:</strong> ${safeCategory}</p>
          <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
          ${safeCalculator ? `<p><strong>Calculator:</strong> ${safeCalculator}</p>` : ""}
          ${safeSubject ? `<p><strong>Subject:</strong> ${safeSubject}</p>` : ""}
          <hr/>
          <p><strong>Message:</strong></p>
          <p>${safeMessage}</p>
        `,
      });
      return json(res, 200, { success: true });
    } catch {
      return json(res, 500, { error: "Failed to send email" });
    }
  },
);

