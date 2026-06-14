# Aria — Agentic Solution Architecture Generator

> An agentic system where Claude autonomously completes a full SA pre-sales
> workflow using tool use: research → case studies → pricing → confidence gate
> → architecture generation. Streams every step to the UI in real time.

## The meta-narrative (use this in interviews)

> "I built an AI that does a meaningful part of the SA job. Not a gimmick — a genuine
> agentic workflow that takes a company description and pain points as input and
> produces a draft solution architecture with cost estimates and case study references
> as output. And I can show you every step it took to get there, in real time."

---

## Architecture

```
User Input (company description + pain points)
  ↓
Claude (claude-sonnet-4-5) with 5 registered tools
  ↓ tool calls ↓
  search_web          Company/tech research
  lookup_company      Structured company enrichment
  query_aws_pricing   AWS cost estimates
  search_case_studies Analogous customer patterns
  run_confidence_gate REQUIRED before architecture output
                      (scores 4 dimensions 1-5; pauses if any < 3)
  ↓
SSE stream → Next.js UI (real-time tool call visualization)
  ↓
Final architecture output
```

---

## Setup (new machine)

### Prerequisites
- Node.js 20+
- Anthropic API key → https://console.anthropic.com

### 1. Clone and configure
```bash
git clone https://github.com/Camezy/Aria
cd Aria
cp .env.example .env.local
# Add ANTHROPIC_API_KEY to .env.local
```

### 2. Install and run
```bash
npm install
npm run dev
# UI at http://localhost:3002
```

### 3. CLI demo (no UI)
```bash
npx tsx lib/agent.ts
```

---

## Key design decisions (interview talking points)

**Why split tools instead of combining them?**
Early version had a `research_and_price` combined tool. When research results were
thin, the model skipped pricing — silent failure, incomplete output. Splitting tools
forces explicit invocation of each step. Separation of concerns applies to tool
architecture, not just software design.

**Why the confidence gate?**
A hallucinated cost estimate that reaches a customer is a relationship-ending error.
The gate scores company context, pricing data, case study relevance, and use case
clarity on a 1-5 scale. Any dimension below 3 → pause and surface a clarifying
question instead of generating confident output from insufficient information.
This is what Anthropic means by "steerable AI."

**Why SSE streaming?**
Interpretability as a design principle. The user (or enterprise customer watching
the demo) sees every tool call, every result, the confidence gate check — not just
the final output. Real-time visibility is a trust signal.

**Why exponential backoff on tool retries?**
External APIs fail. A demo that crashes in an interview because an API timed out
is a liability. Retry with backoff is table stakes for production agentic systems.

**Production path:**
- Replace mock tool implementations with real APIs:
  - search_web → Brave Search API ($3/1k queries)
  - lookup_company → Clearbit or Apollo.io
  - query_aws_pricing → AWS Price List API (public, no auth)
  - search_case_studies → Your own vector store of sanitized case studies
