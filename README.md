# PlanForge

PlanForge is an **all-purpose project planning and project intelligence workspace**. It helps turn ideas into structured, reviewable plans across business, education, research, events, operations, construction, community, personal and software projects.

It is not a SQL designer and it is not a coding assistant. Technical architecture, databases, APIs and integrations are optional specialist planning areas only when relevant to a project.

## Product principles

- Deep planning with a clean, progressive-disclosure interface.
- Adapt modules to the project domain; do not force technical workflows.
- Local-first project workspaces using browser storage.
- Local Qwen model through Ollama for planning conversations and structured project intake.
- Public APIs and external services are considered only when needed and verified against authoritative documentation.
- Distinguish facts, assumptions, estimates, recommendations and open questions.
- Keep credentials server-side.

## Current foundation

- General project creation and local persistence.
- Nested navigation for definition, execution, governance, evaluation, systems/processes, integrations and documentation.
- Project-specific planning items and working notes.
- AI Project Intake: idea analysis, objectives, deliverables, workstreams, risks, assumptions, evidence needs and clarification questions.
- AI Roadmap: converts the saved intake into phases, tasks, milestones, dependencies and suggested resource roles.
- Deterministic schedule calculation: earliest start/finish, slack, critical path and target-deadline comparison. Weekend days are skipped; public holidays are not currently modelled.
- Timeline view with task progress tracking; generated tasks can be copied into Work Breakdown.
- Refine the intake analysis with user answers and persist it in the project workspace.
- Apply proposed workstream tasks to the Work Breakdown module.
- Ollama status check and Qwen chat/intake endpoints.

## Local setup

Requirements: Node.js 20.9+ and Ollama.

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows CMD:

```cmd
copy .env.example .env.local
```

Open http://localhost:3000.

Make sure Ollama is running and the model is installed:

```cmd
ollama list
ollama run hf.co/bartowski/Qwen_Qwen3.5-9B-GGUF:Q6_K
```

Default local model configuration:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=hf.co/bartowski/Qwen_Qwen3.5-9B-GGUF:Q6_K
```

## AI endpoints

- `GET /api/ai/status` checks whether Ollama is reachable and whether the configured model appears in `/api/tags`.
- `POST /api/ai/chat` sends current project context and a planning question to Ollama's `/api/chat` endpoint.
- `POST /api/ai/intake` sends a project idea, context and clarification answers to the local model and validates a structured JSON planning brief.
- `POST /api/ai/roadmap` converts saved intake into a dependency-aware roadmap and rejects circular dependency graphs.

The browser calls only local Next.js routes. Ollama settings remain server-side. No public external API is called automatically in this foundation.

## Planning areas

**Core planning:** project brief, requirements, scope, work breakdown, timeline, milestones, resources, risk register, security, quality/testing, decisions, budget and feasibility.

**Specialist planning:** architecture, components, connections, information flows, integrations, API planning, call sequences and tool selection.

## Current limitations

This is an iterative foundation, not the finished planning engine. Projects and intake analyses are stored in the current browser. The roadmap currently provides a compact Gantt-style timeline and deterministic dependency/critical-path calculations. Full drag-and-drop Gantt editing, resource capacity balancing, source-backed API research, automated cost estimation, export, cloud sync and collaborative workspaces are later milestones.


## Execution control and project backups

The AI roadmap includes an editable task workbench. Tasks can be added, edited, moved between phases, assigned an owner role, estimated, prioritized, and linked to predecessor tasks. Dependency cycles are rejected before changes are saved. The timeline supports dragging task bars to request a planned start offset; dependency constraints still determine the earliest valid start. The schedule, slack and critical path are recalculated from the saved roadmap.

Roadmap completion updates the project's progress and status. Project status can also be changed manually from the workspace context strip.

Use the dashboard's **Local project backup** controls to export all projects to a versioned JSON file or import a PlanForge backup as additional copies. Import never overwrites existing projects. Keep exported backups in a separate safe location; project data remains browser-local.
