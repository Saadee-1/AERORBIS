const functions = require("firebase-functions/v1");
const { Resend } = require("resend");

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(email) {
  if (typeof email !== "string") return false;
  if (email.length < 3 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json(res, status, body) {
  res.status(status).set("Content-Type", "application/json").send(JSON.stringify(body));
}

exports.contact = functions.region("us-central1").https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).send("");
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

  const apiKey = process.env.RESEND_API_KEY;
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
  }
});

const SYSTEM_PROMPT = `You are AERORBIS Antenna & Avionics Solver, a senior RF engineer specialised in:
- Antenna theory: dipole, monopole, patch, horn, reflector, Yagi-Uda, helix, spiral, arrays (mutual coupling, beam steering)
- Numerical methods: Method of Moments (Pocklington/Hallén), Physical Optics for reflectors, GO/GTD for diffraction
- Propagation: Friis free-space, two-ray ground, ITU-R P.525/618/676, rain/atmospheric absorption, Doppler
- Radar & RCS: radar equation (pulse/CW), SAR basics, RCS of canonical shapes (sphere, plate, cylinder, dihedral, trihedral)
- Avionics RF: VOR (108–118 MHz), ILS LOC/GS, GPS L1/L2/L5, ADS-B 1090 MHz, TCAS, radar altimeter (4.2–4.4 GHz), antenna placement, airframe multipath

RULES:
1. Always show step-by-step derivation. Cite the governing formula in plain text (e.g. "Friis: Pr = Pt + Gt + Gr − Lfs").
2. Use SI units; convert if user gives Imperial. State assumptions explicitly.
3. If a question is ambiguous, ask ONE concise clarifying question, otherwise answer.
4. After the prose explanation, ALWAYS append a fenced JSON block with this contract:
\`\`\`json
{
  "summary": "one-line answer",
  "numeric_result": { "value": <number|null>, "unit": "<string|null>" },
  "steps": ["step 1", "step 2", "..."],
  "formulas": ["formula 1", "..."],
  "assumptions": ["..."],
  "warnings": ["..."],
  "suggested_solver": "mom" | "linkBudget" | "polarization" | "coupling" | "po" | "bandwidth" | null
}
\`\`\`
5. Be concise but rigorous — university-level depth. No fluff.
6. If the user attaches CONTEXT (current MoM run, selected antenna, frequency), use those values rather than asking.`;

exports.antennaSolver = functions.region("us-central1").https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    // Optional: Verify Firebase Auth token if needed
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // You can verify Firebase Auth token here if needed
      // For now, we'll allow unauthenticated requests for simplicity
    }

    const { messages, context } = req.body;
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) throw new Error("GROQ_API_KEY is not configured");

    const sys = context
      ? `${SYSTEM_PROMPT}\n\nCURRENT CONTEXT (JSON):\n${JSON.stringify(context).slice(0, 4000)}`
      : SYSTEM_PROMPT;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: sys }, ...messages],
        stream: true,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return json(res, 429, { error: "Rate limit exceeded — wait a moment and retry." });
      }
      if (response.status === 402) {
        return json(res, 402, { error: "AI credits exhausted — top up in Settings → Workspace → Usage." });
      }
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return json(res, 500, { error: "AI service error" });
    }

    // Set up streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
    }

    res.end();
  } catch (error) {
    console.error("antenna-solver error:", error);
    return json(res, 500, { error: error.message || "Unknown error" });
  }
});

