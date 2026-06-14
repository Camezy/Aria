"use client";
import { useState, useRef, useEffect } from "react";

interface AgentEvent {
  type: "thinking" | "tool_call" | "tool_result" | "gate_passed" | "gate_blocked" | "final_output" | "error";
  content: string;
  tool?: string;
  metadata?: Record<string, unknown>;
}

const ICON: Record<string, string> = {
  thinking: "💭", tool_call: "🔧", tool_result: "📥",
  gate_passed: "✅", gate_blocked: "⛔", final_output: "📋", error: "❌",
};

const EVENT_COLOR: Record<string, string> = {
  thinking: "#5A4A2A", tool_call: "#1A3A5A", tool_result: "#1A3A2A",
  gate_passed: "#0D3A1A", gate_blocked: "#3A1A1A", final_output: "#2A1A3A", error: "#3A0D0D",
};

const EVENT_BORDER: Record<string, string> = {
  thinking: "#7A6A3A", tool_call: "#2A5A8A", tool_result: "#2A6A3A",
  gate_passed: "#1A6A2A", gate_blocked: "#6A1A1A", final_output: "#4A2A6A", error: "#6A1A1A",
};

const SAMPLE_PAIN_POINTS = [
  "Manual compliance document review takes 3-5 days per filing",
  "Growing regulatory requirements increasing review volume 40% YoY",
  "Current ML team can't scale to meet demand",
  "Need audit trail and explainability for regulatory submissions",
];

const SAMPLE_COMPANY = "FinanceFlow is a Series B fintech startup with 350 employees, processing $2B in annual transactions. They build compliance automation software for mid-market financial institutions.";

export default function AriaUI() {
  const [company, setCompany] = useState("");
  const [painPoints, setPainPoints] = useState<string[]>(["", "", ""]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const updatePain = (i: number, val: string) => {
    setPainPoints(prev => prev.map((p, idx) => idx === i ? val : p));
  };

  const loadSample = () => {
    setCompany(SAMPLE_COMPANY);
    setPainPoints(SAMPLE_PAIN_POINTS);
  };

  const run = async () => {
    if (!company.trim()) return;
    setEvents([]);
    setRunning(true);
    setDone(false);

    const filtered = painPoints.filter(p => p.trim());

    try {
      const res = await fetch("/api/aria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, painPoints: filtered }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done: d, value } = await reader.read();
        if (d) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: AgentEvent = JSON.parse(line.slice(6));
              setEvents(prev => [...prev, event]);
              if (event.type === "final_output" || event.type === "error") setDone(true);
            } catch {}
          }
        }
      }
    } catch (err) {
      setEvents(prev => [...prev, { type: "error", content: `Connection error: ${err}` }]);
    }
    setRunning(false);
    setDone(true);
  };

  const S = {
    page: { minHeight: "100vh", display: "grid", gridTemplateColumns: "380px 1fr" },
    sidebar: { background: "#110E07", borderRight: "1px solid #2A2010", padding: 28, display: "flex", flexDirection: "column" as const, gap: 20 },
    main: { padding: "28px 36px", overflowY: "auto" as const, maxHeight: "100vh" },
    title: { fontSize: 24, fontWeight: 700, color: "#E8DCC8", margin: "0 0 4px" },
    subtitle: { fontSize: 13, color: "#7A6A4A", margin: "0 0 24px", lineHeight: 1.5 },
    label: { fontSize: 11, color: "#7A6A4A", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6, display: "block" },
    textarea: { width: "100%", background: "#160F07", border: "1px solid #2A2010", borderRadius: 6, color: "#E8DCC8", padding: 12, fontSize: 13, resize: "vertical" as const, fontFamily: "inherit", boxSizing: "border-box" as const, minHeight: 100 },
    input: { width: "100%", background: "#160F07", border: "1px solid #2A2010", borderRadius: 6, color: "#E8DCC8", padding: "8px 12px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const, marginBottom: 8 },
    btn: { padding: "11px 18px", background: "#7A5A1A", color: "#E8DCC8", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%" },
    btnSample: { padding: "8px 18px", background: "#1E1A10", color: "#7A6A4A", border: "1px solid #2A2010", borderRadius: 6, cursor: "pointer", fontSize: 12, width: "100%" },
    eventCard: (type: string) => ({
      background: EVENT_COLOR[type] || "#1A1A1A",
      border: `1px solid ${EVENT_BORDER[type] || "#333"}`,
      borderRadius: 8, padding: "12px 16px", marginBottom: 10,
    }),
    eventHeader: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6 },
    eventIcon: { fontSize: 16, flexShrink: 0 },
    eventType: (type: string) => ({ fontSize: 10, fontWeight: 600, color: "#7A6A4A", textTransform: "uppercase" as const, letterSpacing: "0.1em" }),
    eventContent: { fontSize: 13, color: "#E8DCC8", lineHeight: 1.6, whiteSpace: "pre-wrap" as const },
    metaBox: { background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: "8px 12px", marginTop: 8, fontSize: 11, color: "#7A6A4A", fontFamily: "monospace" },
    finalBox: { background: "#1A1520", border: "1px solid #4A2A6A", borderRadius: 8, padding: 20 },
    finalText: { fontSize: 14, lineHeight: 1.8, color: "#E8DCC8", whiteSpace: "pre-wrap" as const },
    pulse: { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#D4A017", marginRight: 8, animation: "pulse 1s ease-in-out infinite" },
  };

  const finalOutput = events.find(e => e.type === "final_output");
  const toolCallCount = events.filter(e => e.type === "tool_call").length;

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Sidebar */}
      <div style={S.sidebar}>
        <div>
          <h1 style={S.title}>Aria</h1>
          <p style={S.subtitle}>Agentic SA using Claude tool use to autonomously research a prospect and generate a solution architecture.</p>
        </div>

        <div>
          <label style={S.label}>Company Description</label>
          <textarea style={S.textarea} value={company} onChange={e => setCompany(e.target.value)}
            placeholder="Describe the prospect: industry, size, what they do, tech context..." />
        </div>

        <div>
          <label style={S.label}>Pain Points</label>
          {painPoints.map((p, i) => (
            <input key={i} style={S.input} value={p} onChange={e => updatePain(i, e.target.value)}
              placeholder={`Pain point ${i + 1}...`} />
          ))}
          <button style={{ ...S.btnSample, marginBottom: 0 }}
            onClick={() => setPainPoints(prev => [...prev, ""])}>
            + Add pain point
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button style={S.btn} onClick={run} disabled={running || !company.trim()}>
            {running ? "⟳ Agent running..." : "▶ Run Aria Agent"}
          </button>
          <button style={S.btnSample} onClick={loadSample}>Load sample prospect</button>
        </div>

        {running && (
          <div style={{ fontSize: 12, color: "#7A6A4A", lineHeight: 1.6 }}>
            <span style={S.pulse} />
            Agent active · {toolCallCount} tool calls made
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #2A2010" }}>
          <p style={{ fontSize: 11, color: "#5A4A2A", lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: "#7A6A4A" }}>5 tools registered:</strong><br />
            search_web · lookup_company · query_aws_pricing · search_case_studies · run_confidence_gate
          </p>
        </div>
      </div>

      {/* Main stream */}
      <div style={S.main}>
        {events.length === 0 && !running && (
          <div style={{ textAlign: "center", paddingTop: 80, color: "#5A4A2A" }}>
            <p style={{ fontSize: 15, marginBottom: 8 }}>Configure a prospect in the sidebar and click Run.</p>
            <p style={{ fontSize: 13 }}>Every tool call, reasoning step, and confidence gate check streams here in real time.</p>
          </div>
        )}

        {events.filter(e => e.type !== "final_output").map((event, i) => (
          <div key={i} style={S.eventCard(event.type)}>
            <div style={S.eventHeader}>
              <span style={S.eventIcon}>{ICON[event.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.eventType(event.type)}>{event.type.replace("_", " ")}{event.tool ? ` · ${event.tool}` : ""}</div>
                <div style={{ ...S.eventContent, marginTop: 4 }}>{event.content}</div>
                {event.metadata && (
                  <div style={S.metaBox}>
                    {JSON.stringify(event.metadata, null, 2).split("\n").slice(0, 8).join("\n")}
                    {JSON.stringify(event.metadata, null, 2).split("\n").length > 8 ? "\n..." : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {finalOutput && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#7A6A4A", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              📋 Generated Architecture
            </div>
            <div style={S.finalBox}>
              <div style={S.finalText}>{finalOutput.content}</div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
