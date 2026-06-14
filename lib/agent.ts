/**
 * Aria — Agentic Solution Architecture Generator
 * 
 * Architecture: Claude uses tool use to complete a full SA pre-sales workflow.
 * Five tools, one confidence gate, SSE streaming for real-time visibility.
 * 
 * Key design decision: Each tool has ONE responsibility.
 * 
 * Early version had a combined research_and_price tool. It failed unpredictably —
 * when research results were thin, the model would skip pricing, creating
 * inconsistent outputs. Splitting the tools forces explicit invocation of each step.
 * This is separation of concerns applied to agentic architecture.
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ─── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_web",
    description:
      "Search the web for information about a company, technology, or topic. " +
      "Use for company research, recent news, and technology landscape analysis.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query, 3-8 words" },
        focus: {
          type: "string",
          enum: ["company", "technology", "news", "industry"],
          description: "Type of information to prioritize",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "lookup_company",
    description:
      "Retrieve structured company information: size, industry, tech stack, " +
      "recent funding, growth signals. Use before architecture recommendations.",
    input_schema: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        domain: { type: "string", description: "Company domain if known" },
      },
      required: ["company_name"],
    },
  },
  {
    name: "query_aws_pricing",
    description:
      "Get AWS pricing estimates for specific services and usage patterns. " +
      "Always call this before including cost estimates in architecture output.",
    input_schema: {
      type: "object",
      properties: {
        services: {
          type: "array",
          items: { type: "string" },
          description: "AWS service names (e.g. ['Bedrock', 'Lambda', 'S3'])",
        },
        usage_profile: {
          type: "string",
          description: "Usage description: e.g. '10M tokens/month, 100k Lambda invocations'",
        },
        region: { type: "string", default: "us-east-1" },
      },
      required: ["services", "usage_profile"],
    },
  },
  {
    name: "search_case_studies",
    description:
      "Find analogous customer case studies and reference architectures for a " +
      "given use case and industry. Returns relevant patterns and outcomes.",
    input_schema: {
      type: "object",
      properties: {
        use_case: { type: "string", description: "Primary use case to match" },
        industry: { type: "string", description: "Customer industry vertical" },
        scale: {
          type: "string",
          enum: ["startup", "mid-market", "enterprise"],
        },
      },
      required: ["use_case", "industry"],
    },
  },
  {
    name: "run_confidence_gate",
    description:
      "REQUIRED: Run this before generate_architecture. Scores confidence across " +
      "four dimensions. If any dimension scores below 3, surface a clarifying question " +
      "instead of proceeding with architecture generation.",
    input_schema: {
      type: "object",
      properties: {
        company_context_quality: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "How well do we understand the company? 1=almost nothing, 5=comprehensive",
        },
        pricing_data_completeness: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "Do we have sufficient pricing data for a credible estimate?",
        },
        case_study_relevance: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "How relevant are the found case studies to this use case?",
        },
        use_case_clarity: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "How clearly defined is the customer's use case and success criteria?",
        },
        clarifying_question: {
          type: "string",
          description: "Required if any score < 3: what question should we ask the customer?",
        },
      },
      required: [
        "company_context_quality",
        "pricing_data_completeness",
        "case_study_relevance",
        "use_case_clarity",
      ],
    },
  },
];

// ─── Tool execution (mock implementations for demo) ───────────────────────────

/**
 * Why mock implementations?
 * 
 * In a real deployment:
 * - search_web → Brave Search API or SerpAPI
 * - lookup_company → Clearbit or Apollo.io
 * - query_aws_pricing → AWS Price List API (public, no auth required)
 * - search_case_studies → Your own vector store of sanitized case studies
 * 
 * For the interview demo, mocks return realistic-looking data so the
 * agentic reasoning is visible without requiring API keys in the demo env.
 * The architecture is identical — just swap mock → real API call.
 */

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  switch (toolName) {
    case "search_web":
      return JSON.stringify({
        results: [
          {
            title: `${toolInput.query} — Industry Analysis 2026`,
            snippet: `Key findings for ${toolInput.query}: growing 34% YoY, driven by AI adoption in ${toolInput.focus || "enterprise"} sector. Major players consolidating.`,
            url: "https://example.com/analysis",
          },
          {
            title: "Technology Landscape Report",
            snippet: `Organizations adopting AI APIs report 40% faster time-to-market. Claude and GPT-4o dominating enterprise deployments.`,
            url: "https://example.com/landscape",
          },
        ],
        total_results: 2,
      });

    case "lookup_company":
      return JSON.stringify({
        name: toolInput.company_name,
        industry: "FinTech",
        employee_count: "200-500",
        tech_stack: ["Python", "AWS", "PostgreSQL", "React", "Kubernetes"],
        recent_funding: "$45M Series B (Mar 2026)",
        growth_signals: ["3x headcount in 18 months", "expanding to EU market Q3 2026"],
        pain_points_signals: [
          "Job postings: 8 ML Engineer roles (inference, RAG)",
          "Engineering blog: manual document processing bottleneck",
          "Conference talk: 'scaling our compliance review process'",
        ],
      });

    case "query_aws_pricing":
      return JSON.stringify({
        services: toolInput.services,
        usage_profile: toolInput.usage_profile,
        monthly_estimate_usd: {
          "Amazon Bedrock (Claude Sonnet)": "$1,200 - $2,400",
          "AWS Lambda": "$45 - $120",
          "Amazon S3": "$23 - $80",
          "Amazon OpenSearch (vector)": "$400 - $800",
          total_range: "$1,668 - $3,400",
        },
        annual_range: "$20,016 - $40,800",
        optimization_notes: [
          "Batch API reduces Bedrock cost by up to 50% for non-realtime workloads",
          "S3 Intelligent-Tiering for infrequent document access patterns",
        ],
      });

    case "search_case_studies":
      return JSON.stringify({
        matches: [
          {
            company_type: "Series B FinTech, 300 employees",
            use_case: "Automated compliance document review",
            outcome: "87% reduction in manual review time, $2.1M annual savings",
            architecture: "Claude API → Lambda → OpenSearch → human-in-loop for edge cases",
            implementation_time: "8 weeks",
          },
          {
            company_type: "Mid-market financial services",
            use_case: "AI-assisted regulatory filing",
            outcome: "3x throughput increase, 95% accuracy on structured extraction",
            architecture: "RAG pipeline → Bedrock Claude → S3 audit trail → compliance dashboard",
            implementation_time: "12 weeks",
          },
        ],
        avg_roi_payback_months: 7,
      });

    case "run_confidence_gate":
      const scores = toolInput as {
        company_context_quality: number;
        pricing_data_completeness: number;
        case_study_relevance: number;
        use_case_clarity: number;
        clarifying_question?: string;
      };
      const minScore = Math.min(
        scores.company_context_quality,
        scores.pricing_data_completeness,
        scores.case_study_relevance,
        scores.use_case_clarity
      );
      const avg =
        (scores.company_context_quality +
          scores.pricing_data_completeness +
          scores.case_study_relevance +
          scores.use_case_clarity) / 4;

      return JSON.stringify({
        gate_passed: minScore >= 3,
        min_score: minScore,
        avg_score: Math.round(avg * 10) / 10,
        scores,
        recommendation:
          minScore >= 3
            ? "PROCEED: Sufficient context to generate credible architecture"
            : `PAUSE: ${scores.clarifying_question || "Gather more information before proceeding"}`,
      });

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ─── SSE streaming agent ───────────────────────────────────────────────────────

export interface AgentEvent {
  type:
    | "thinking"
    | "tool_call"
    | "tool_result"
    | "gate_check"
    | "gate_passed"
    | "gate_blocked"
    | "final_output"
    | "error";
  content: string;
  tool?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Why SSE streaming for the agent loop?
 * 
 * Interpretability as a design principle. The user (or enterprise customer
 * watching the demo) can see every tool call, every result, the confidence
 * gate check — not just the final output. That real-time visibility is a
 * trust signal. It's the difference between "trust me, the AI figured it out"
 * and "watch the AI figure it out in front of you."
 * 
 * This is also critical for debugging: when the agent makes a wrong turn,
 * the stream shows exactly where and why.
 */
export async function* runAriaAgent(
  companyDescription: string,
  painPoints: string[]
): AsyncGenerator<AgentEvent> {
  const systemPrompt = `You are Aria, an expert AI Solutions Architect assistant.

Given a company description and their pain points, you will autonomously:
1. Research the company using available tools
2. Retrieve relevant case studies
3. Gather pricing data
4. Run the confidence gate (REQUIRED before architecture generation)
5. If gate passes: generate a structured solution architecture
   If gate fails: output only the clarifying question

IMPORTANT: Always call run_confidence_gate before generating any architecture.
A hallucinated cost estimate that reaches a customer is a relationship-ending error.

Be systematic. Show your reasoning. Each tool call should have a clear purpose.`;

  const userMessage = `Company: ${companyDescription}

Pain points:
${painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Please research this prospect and generate a tailored solution architecture.`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let iterationCount = 0;
  const MAX_ITERATIONS = 15; // Safety: prevent infinite loops

  yield {
    type: "thinking",
    content: `Starting Aria agent for prospect analysis...`,
  };

  while (iterationCount < MAX_ITERATIONS) {
    iterationCount++;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    // Add assistant response to conversation history
    messages.push({ role: "assistant", content: response.content });

    // Process each content block
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        yield { type: "thinking", content: block.text };
      }

      if (block.type === "tool_use") {
        yield {
          type: "tool_call",
          content: `Calling ${block.name}`,
          tool: block.name,
          metadata: { input: block.input },
        };

        // Execute the tool
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>
        );
        const parsed = JSON.parse(result);

        // Special handling for confidence gate
        if (block.name === "run_confidence_gate") {
          if (parsed.gate_passed) {
            yield {
              type: "gate_passed",
              content: `Confidence gate PASSED (avg: ${parsed.avg_score}/5) — proceeding to architecture generation`,
              metadata: parsed,
            };
          } else {
            yield {
              type: "gate_blocked",
              content: `Confidence gate BLOCKED — ${parsed.recommendation}`,
              metadata: parsed,
            };
          }
        } else {
          yield {
            type: "tool_result",
            content: `${block.name} completed`,
            tool: block.name,
            metadata: parsed,
          };
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    // If there were tool calls, continue the loop with results
    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // No more tool calls — agent is done
    if (response.stop_reason === "end_turn") {
      const finalText = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as Anthropic.TextBlock).text)
        .join("\n");

      yield { type: "final_output", content: finalText };
      return;
    }

    // Unexpected stop reason
    yield {
      type: "error",
      content: `Unexpected stop reason: ${response.stop_reason}`,
    };
    return;
  }

  yield {
    type: "error",
    content: `Agent exceeded maximum iterations (${MAX_ITERATIONS}). Partial results may be incomplete.`,
  };
}

// ─── CLI demo ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🤖 Aria — Agentic SA Demo\n" + "─".repeat(50));

  const company =
    "FinanceFlow is a Series B fintech startup with 350 employees, " +
    "processing $2B in annual transactions. They build compliance automation " +
    "software for mid-market financial institutions.";

  const painPoints = [
    "Manual compliance document review takes 3-5 days per filing",
    "Growing regulatory requirements (SEC, FINRA) increasing review volume 40% YoY",
    "Current ML team of 4 can't scale to meet demand",
    "Need audit trail and explainability for regulatory submissions",
  ];

  for await (const event of runAriaAgent(company, painPoints)) {
    const prefix: Record<string, string> = {
      thinking: "💭",
      tool_call: "🔧",
      tool_result: "📥",
      gate_check: "🔍",
      gate_passed: "✅",
      gate_blocked: "⛔",
      final_output: "📋",
      error: "❌",
    };

    console.log(`\n${prefix[event.type] || "•"} [${event.type.toUpperCase()}]`);

    if (event.type === "final_output") {
      console.log("\n" + "─".repeat(50));
      console.log(event.content);
      console.log("─".repeat(50));
    } else {
      console.log(event.content);
      if (event.metadata && event.type !== "thinking") {
        console.log(
          "   →",
          JSON.stringify(event.metadata, null, 2).split("\n").slice(0, 6).join("\n   ")
        );
      }
    }
  }
}

main().catch(console.error);
