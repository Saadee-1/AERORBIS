/**
 * AISolverChat — Phase 12
 *
 * Natural-language antenna & avionics solver. Streams answers from the
 * `antenna-solver` edge function (Lovable AI Gateway, gemini-2.5-pro) and
 * extracts a structured JSON contract from the final fenced block.
 */

import { useEffect, useRef, useState } from "react";
import { Send, Trash2, Sparkles, Bot, User, Loader2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AeroButton } from "@/components/common/AeroButton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth } from "@/config/firebase";
import { getGroqApiKey } from "@/lib/aerobot-api";

type Role = "user" | "assistant";
interface Msg {
  id: string;
  role: Role;
  content: string;
  structured?: SolverStructured | null;
  ts: number;
}

interface SolverStructured {
  summary?: string;
  numeric_result?: { value: number | null; unit: string | null };
  steps?: string[];
  formulas?: string[];
  assumptions?: string[];
  warnings?: string[];
  suggested_solver?: string | null;
}

const STORAGE_KEY = "aerorbis_antenna_solver_history";
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


const SUGGESTIONS: { label: string; prompt: string; tag: string }[] = [
  { tag: "Friis",       label: "Friis link budget", prompt: "Friis link budget: 20 W TX, 16 dBi antennas at both ends, 10 km, 5.8 GHz. Find Pr in dBm and the link margin assuming -90 dBm sensitivity." },
  { tag: "Radar",       label: "Radar max range",   prompt: "Radar range equation: Pt=10 kW, G=35 dBi, f=10 GHz, σ=2 m², B=1 MHz, NF=3 dB. What is the max detection range for SNR=13 dB?" },
  { tag: "Yagi",        label: "Yagi gain",         prompt: "Estimate gain, F/B and HPBW of a 7-element Yagi-Uda with a 1.5 λ boom at 435 MHz." },
  { tag: "Patch",       label: "Patch antenna",     prompt: "Design a rectangular microstrip patch at 2.45 GHz on εr=4.4, h=1.6 mm. Give W, L, fr, Rin, directivity and fractional bandwidth." },
  { tag: "Horn",        label: "Pyramidal horn",    prompt: "Pyramidal horn with 150×100 mm aperture at 10 GHz. Give gain in dBi and E/H-plane HPBW." },
  { tag: "ITU-R rain",  label: "Ku-band rain fade", prompt: "Compute ITU-R P.838 rain attenuation for a 12 GHz Ku-band link, 25 mm/h rain, 8 km path. Include gaseous loss." },
  { tag: "VOR",         label: "VOR coverage",      prompt: "What is the theoretical VOR coverage range at FL100 (10 000 ft)? Use the FAA 1.23·√h_ft rule." },
  { tag: "GPS",         label: "GPS link margin",   prompt: "GPS L1 (1575.42 MHz) link budget at sea level. SV EIRP=26.8 dBW, RX gain=3 dBi, T_sys=290 K. Required C/N₀=35 dB-Hz. What is the margin?" },
  { tag: "ADS-B",       label: "ADS-B air-to-air",  prompt: "ADS-B 1090 MHz air-to-air at 150 NM, 250 W TX, 0 dBi antennas, sensitivity -84 dBm. What is the link margin?" },
  { tag: "RCS",         label: "RCS sphere",        prompt: "RCS of a 1 m metallic sphere at 10 GHz in optical regime (m² and dBsm). Confirm ka regime." },
  { tag: "Knife-edge",  label: "Knife-edge loss",   prompt: "Knife-edge diffraction loss for an obstacle 15 m above LOS, d1=4 km, d2=6 km, f=900 MHz." },
  { tag: "Doppler",     label: "Doppler shift",     prompt: "Doppler shift on a 5 GHz link when relative closing velocity is 250 m/s." },
];

function extractStructured(text: string): SolverStructured | null {
  // First try to find JSON in code blocks
  const m = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (m) {
    try {
      const parsed = JSON.parse(m[1]);
      return {
        summary: parsed.result ? `${parsed.result} ${parsed.unit || ''}` : parsed.summary || '',
        numeric_result: parsed.result ? { value: parsed.result, unit: parsed.unit || null } : null,
        steps: [],
        formulas: parsed.formula ? [parsed.formula] : [],
        assumptions: [],
        warnings: [],
        suggested_solver: null
      };
    } catch {
      return null;
    }
  }

  // Try to find JSON at the end of the text
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const parsed = JSON.parse(line);
        return {
          summary: parsed.result ? `${parsed.result} ${parsed.unit || ''}` : parsed.summary || '',
          numeric_result: parsed.result ? { value: parsed.result, unit: parsed.unit || null } : null,
          steps: [],
          formulas: parsed.formula ? [parsed.formula] : [],
          assumptions: [],
          warnings: [],
          suggested_solver: null
        };
      } catch {
        continue;
      }
    }
  }

  return null;
}

function stripJsonBlock(text: string): string {
  return text.replace(/```json[\s\S]*?```/i, "").trim();
}

interface Props {
  context?: Record<string, unknown> | null;
}

export const AISolverChat = ({ context }: Props) => {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Msg[];
    } catch {/* ignore */}
    return [];
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch {/* ignore */}
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", ts: Date.now() }]);
    setStreaming(true);
    setThinking(true);

    try {
      const apiKey = getGroqApiKey();
      if (!apiKey) {
        throw new Error("Groq API key not configured. Please set VITE_GROQ_API_KEY in your environment or configure your key in the Aerobot settings.");
      }

      const sysPrompt = context
        ? `${SYSTEM_PROMPT}\n\nCURRENT CONTEXT (JSON):\n${JSON.stringify(context).slice(0, 4000)}`
        : SYSTEM_PROMPT;

      const endpoint = import.meta.env.DEV
        ? "/api-groq/openai/v1/chat/completions"
        : "https://corsproxy.io/?url=https://api.groq.com/openai/v1/chat/completions";

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: sysPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text }
          ],
          temperature: 0.3,
          max_tokens: 4096,
          stream: true,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) throw new Error("Rate limit exceeded — please wait a moment.");
        const j = await resp.json().catch(() => ({}));
        throw new Error((j as { error?: { message?: string } })?.error?.message || "Solver unavailable");
      }

      // Check if response is streaming or JSON
      const contentType = resp.headers.get("content-type");
      if (contentType?.includes("text/event-stream")) {
        // Handle streaming response
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let acc = "";
        let done = false;

        while (!done) {
          const { done: rd, value } = await reader.read();
          if (rd) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") { done = true; break; }
            try {
              const p = JSON.parse(json);
              const delta = p?.choices?.[0]?.delta?.content as string | undefined;
              if (delta) {
                acc += delta;
                setThinking(false);
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
                );
              }
            } catch {
              buf = line + "\n" + buf;
              break;
            }
          }
        }
      } else {
        // Handle JSON response
        const data = await resp.json();
        let content = data.content || "No response generated";

        // Try to extract structured data from the content
        const structured = extractStructured(content);
        if (structured) {
          content = stripJsonBlock(content);
        }

        setThinking(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content, structured } : m)),
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to reach AI solver";
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
      setThinking(false);
    }
  }

  function clearHistory() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function exportHistory() {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aerorbis-solver-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.2em] text-primary/80" style={{ fontFamily: "Rajdhani, sans-serif" }}>
            AI Solver · Antenna & Avionics
          </span>
          {context && <Badge variant="outline" className="border-primary/30 text-[10px]">context attached</Badge>}
        </div>
        <div className="flex gap-2">
          <AeroButton variant="ghost" size="sm" onClick={exportHistory} disabled={!messages.length}>
            <Download className="h-3 w-3 mr-1" /> Export
          </AeroButton>
          <AeroButton variant="ghost" size="sm" onClick={clearHistory} disabled={!messages.length}>
            <Trash2 className="h-3 w-3 mr-1" /> Clear
          </AeroButton>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="h-[420px] overflow-y-auto rounded-md border border-primary/20 bg-slate-950/40 p-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Ask any antenna, propagation, radar, or avionics RF question. Step-by-step
              derivations are returned with formulas and a structured result card.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.prompt)}
                  className="text-left text-xs p-2 rounded border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-colors text-gray-300 group"
                  title={s.prompt}
                >
                  <Badge variant="outline" className="border-primary/40 text-[9px] mr-1 mb-1">{s.tag}</Badge>
                  <div className="text-foreground/90 group-hover:text-primary transition-colors">{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && <Bot className="h-4 w-4 mt-1 text-primary shrink-0" />}
            <div
              className={`max-w-[85%] rounded-md p-3 text-sm whitespace-pre-wrap break-words ${
                m.role === "user"
                  ? "bg-primary/15 border border-primary/30 text-foreground"
                  : "bg-slate-900/60 border border-primary/15 text-gray-200"
              }`}
            >
              {m.role === "assistant" ? stripJsonBlock(m.content) || (streaming ? "…" : "") : m.content}

              {m.role === "assistant" && m.structured && (
                <div className="mt-3 pt-3 border-t border-primary/20 space-y-2">
                  {m.structured.summary && (
                    <div className="text-xs">
                      <span className="text-primary/80 uppercase tracking-wider">Result: </span>
                      <span className="text-foreground">{m.structured.summary}</span>
                    </div>
                  )}
                  {m.structured.numeric_result?.value != null && (
                    <div className="text-lg font-semibold text-primary" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {m.structured.numeric_result.value} {m.structured.numeric_result.unit ?? ""}
                    </div>
                  )}
                  {!!m.structured.formulas?.length && (
                    <div className="text-[11px] font-mono bg-slate-950/60 p-2 rounded border border-primary/10 space-y-1">
                      {m.structured.formulas.map((f, i) => (<div key={i}>· {f}</div>))}
                    </div>
                  )}
                  {!!m.structured.warnings?.length && (
                    <div className="text-[11px] text-amber-400/90">
                      ⚠ {m.structured.warnings.join(" · ")}
                    </div>
                  )}
                  {m.structured.suggested_solver && (
                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                      Suggested solver: {m.structured.suggested_solver}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            {m.role === "user" && <User className="h-4 w-4 mt-1 text-primary shrink-0" />}
          </div>
        ))}

        {streaming && (
          <div className="flex items-center gap-2 text-xs text-primary/70">
            <Loader2 className="h-3 w-3 animate-spin" />
            {thinking ? "Reasoning… (Gemini is working through the derivation)" : "Streaming answer…"}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Solver error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything: antennas, propagation, radar, VOR/ILS/GPS/ADS-B…"
          disabled={streaming}
          className="flex-1 bg-slate-900/40 border-primary/20"
        />
        <AeroButton type="submit" disabled={streaming || !input.trim()}>
          <Send className="h-4 w-4" />
        </AeroButton>
      </form>
    </div>
  );
};