import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const model = process.env.OLLAMA_MODEL || "hf.co/bartowski/Qwen_Qwen3.5-9B-GGUF:Q6_K";

type ChatInput = {
  question?: string;
  module?: string;
  project?: {
    name?: string;
    type?: string;
    objective?: string;
    status?: string;
    intake?: { idea?: string; analysis?: { executiveSummary?: string; problemStatement?: string; desiredOutcome?: string; objectives?: { title?: string; successMeasure?: string }[]; openQuestions?: { question?: string; priority?: string }[] } };
    items?: { title?: string; detail?: string; moduleId?: string }[];
  } | null;
};

export async function POST(request: Request) {
  let input: ChatInput;
  try {
    input = await request.json() as ChatInput;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const question = input.question?.trim();
  if (!question || question.length > 8000) {
    return NextResponse.json({ error: "A question between 1 and 8,000 characters is required." }, { status: 400 });
  }

  const project = input.project;
  const projectContext = project ? [
    "Project: " + (project.name || "Untitled"),
    "Type: " + (project.type || "Not specified"),
    "Objective: " + (project.objective || "Not yet defined"),
    "Status: " + (project.status || "Planning"),
    "Intake idea: " + (project.intake?.idea || "Not captured"),
    "Intake summary: " + (project.intake?.analysis?.executiveSummary || "No AI intake analysis saved"),
    "Problem statement: " + (project.intake?.analysis?.problemStatement || "Not yet clarified"),
    "Desired outcome from intake: " + (project.intake?.analysis?.desiredOutcome || "Not yet clarified"),
    "Objectives: " + ((project.intake?.analysis?.objectives ?? []).map((item) => item.title + " — " + item.successMeasure).join("; ") || "None captured"),
    "Open clarification questions: " + ((project.intake?.analysis?.openQuestions ?? []).map((item) => "[" + item.priority + "] " + item.question).join("; ") || "None captured"),
    "Current work items: " + ((project.items ?? []).slice(0, 40).map((item) =>
      "- [" + (item.moduleId || "general") + "] " + (item.title || "Untitled") + ": " + (item.detail || "No detail")
    ).join("\n") || "None yet")
  ].join("\n") : "No project has been selected yet.";

  const system = `You are PlanForge, a rigorous all-purpose project planning advisor. You are NOT a coding agent. Do not write application code unless the user explicitly asks for a small illustrative example. Help plan business, academic, research, events, operations, construction, community, personal and software projects. Adapt depth and terminology to the domain; do not force software architecture, databases or APIs into projects that do not need them.

Planning method:
1. Clarify desired outcome, users and stakeholders, scope, constraints and success measures.
2. Decompose outcomes into deliverables, work packages, tasks, owners and acceptance conditions.
3. Describe dependencies, sequence, estimated effort and duration, and critical path where possible.
4. For connections, specify source, destination, trigger, method/tool, inputs, transformations, outputs, approvals, failure paths, retries and fallback.
5. Recommend external APIs or tools only when a real need exists. Prefer official documentation and current verified facts for pricing, limits, licensing and compatibility. Never invent endpoint names, API limits or prices.
6. Separate VERIFIED FACTS, ASSUMPTIONS, ESTIMATES, RECOMMENDATIONS and OPEN QUESTIONS. Include confidence and verification steps when appropriate.
7. Surface risks, mitigations, contingencies, resources, budget, quality checks and change impact.
8. Give a practical next step.

Project context:
${projectContext}

Current workspace module: ${input.module || "General planning"}.

Respond in clear structured Markdown. Be specific and useful. Ask only essential clarification questions; when enough information exists, make labelled assumptions and continue planning.`;

  try {
    const response = await fetch(baseUrl + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: question }
        ],
        options: { temperature: 0.25, num_ctx: 4096 }
      }),
      signal: AbortSignal.timeout(120000)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ error: "Ollama request failed (" + response.status + "). " + detail.slice(0, 400) }, { status: 502 });
    }

    const data = await response.json() as { message?: { content?: string }; error?: string };
    const result = data.message?.content?.trim();
    if (!result) return NextResponse.json({ error: data.error || "The model returned an empty response." }, { status: 502 });
    return NextResponse.json({ response: result, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Ollama connection error.";
    return NextResponse.json({ error: "Could not reach Ollama: " + message }, { status: 502 });
  }
}
