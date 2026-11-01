import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const model = process.env.OLLAMA_MODEL || "hf.co/bartowski/Qwen_Qwen3.5-9B-GGUF:Q6_K";

export async function GET() {
  try {
    const response = await fetch(baseUrl + "/api/tags", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      return NextResponse.json({ connected: false, installed: false, model });
    }
    const data = await response.json() as { models?: { name?: string; model?: string }[] };
    const installed = (data.models ?? []).some((entry) => entry.name === model || entry.model === model);
    return NextResponse.json({ connected: true, installed, model });
  } catch {
    return NextResponse.json({ connected: false, installed: false, model });
  }
}
