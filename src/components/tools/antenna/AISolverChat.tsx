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
import { supabase } from "@/integrations/supabase/client";

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
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/antenna-solver`;

const SUGGESTIONS = [
  "Gain of a half-wave dipole at 2.4 GHz?",
  "Friis link budget: 20 W TX, 16 dBi antennas, 10 km, 5.8 GHz",
  "Required VOR antenna gain for 30 NM coverage at FL100?",
  "RCS of a 1 m metallic sphere at 10 GHz",
];

function extractStructured(text: string): SolverStructured | null {
  const m = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as SolverStructured;
  } catch {
    return null;
  }
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
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token
        ? `Bearer ${session.access_token}`
        : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          context: context ?? undefined,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) throw new Error("Rate limit exceeded — please wait a moment.");
        if (resp.status === 402) throw new Error("AI credits exhausted — top up in Settings → Workspace → Usage.");
        const j = await resp.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Solver unavailable");
      }

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

      const structured = extractStructured(acc);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: acc, structured } : m)),
      );
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs p-2 rounded border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-colors text-gray-300"
                >
                  {s}
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