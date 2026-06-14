import type { Metadata } from "next";
export const metadata: Metadata = { title: "Aria — Agentic SA Generator", description: "Autonomous solution architecture generation using Claude tool use" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "'Inter', system-ui, sans-serif", background: "#0D0B07", color: "#E8DCC8" }}>
        {children}
      </body>
    </html>
  );
}
