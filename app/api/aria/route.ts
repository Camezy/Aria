import { NextRequest } from "next/server";
import { runAriaAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { company, painPoints } = await req.json();

  if (!company?.trim()) {
    return new Response(JSON.stringify({ error: "company is required" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        for await (const event of runAriaAgent(company, painPoints || [])) {
          send(event);
        }
      } catch (err) {
        send({ type: "error", content: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
