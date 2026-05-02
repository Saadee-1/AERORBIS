import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5;
const ipBuckets = new Map();

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length > 0) return String(xff[0]).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  if (email.length < 3 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, category, calculator, subject, message } = req.body;

  const ip = getClientIp(req);
  if (!rateLimitOk(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  if (!name || !email || !category || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Basic length constraints to reduce abuse
  if (String(name).length > 100) return res.status(400).json({ error: 'Name is too long' });
  if (String(category).length > 60) return res.status(400).json({ error: 'Category is too long' });
  if (calculator && String(calculator).length > 120) return res.status(400).json({ error: 'Calculator is too long' });
  if (subject && String(subject).length > 140) return res.status(400).json({ error: 'Subject is too long' });
  if (String(message).length > 6000) return res.status(400).json({ error: 'Message is too long' });

  try {
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCategory = escapeHtml(category);
    const safeCalculator = calculator ? escapeHtml(calculator) : null;
    const safeSubject = subject ? escapeHtml(subject) : null;
    const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br/>');

    await resend.emails.send({
      from: 'AERORBIS Contact <contact@aerorbis.space>',
      to: 'albertienstien123@gmail.com',
      replyTo: email,
      subject: `[${safeCategory}] ${safeSubject || 'No Subject'} - from ${safeName}`,
      html: `
        <h2>New Message via AERORBIS Contact Form</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Category:</strong> ${safeCategory}</p>
        <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
        ${safeCalculator ? `<p><strong>Calculator:</strong> ${safeCalculator}</p>` : ''}
        ${safeSubject ? `<p><strong>Subject:</strong> ${safeSubject}</p>` : ''}
        <hr/>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      `,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
