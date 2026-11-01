import {
  AlertTriangle, BookOpen, Boxes, CalendarDays, ChartNoAxesCombined,
  ClipboardList, FileText, Flag, GitBranch, GitMerge, Gauge, KeyRound, Layers3,
  LayoutDashboard, Network, PlugZap, ShieldCheck, TestTube2, Target, Users,
  Wallet, Workflow, Wrench
} from "lucide-react";
import type { ModuleId, ModuleMeta, NavItem } from "@/lib/types";

export const navigation: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, section: "CORE PLANNING" },
  { id: "design-studio", label: "Design Studio", icon: Layers3, section: "CORE PLANNING" },
  { id: "portfolio", label: "Portfolio intelligence", icon: ChartNoAxesCombined, section: "CORE PLANNING" },
  { id: "brief", label: "Project definition", icon: ClipboardList, section: "CORE PLANNING", children: [
    { id: "brief", label: "Project brief" }, { id: "requirements", label: "Requirements" },
    { id: "scope", label: "Scope & boundaries" }, { id: "work-breakdown", label: "Work breakdown" }
  ]},
  { id: "timeline", label: "Execution plan", icon: CalendarDays, section: "CORE PLANNING", children: [
    { id: "roadmap", label: "AI roadmap" }, { id: "timeline", label: "Timeline & schedule" }, { id: "milestones", label: "Milestones" },
    { id: "resources", label: "People & resources" }
  ]},
  { id: "risks", label: "Governance", icon: ShieldCheck, section: "CORE PLANNING", children: [
    { id: "risks", label: "Risk register" }, { id: "security", label: "Security & access" },
    { id: "testing", label: "Quality & testing" }, { id: "decisions", label: "Decision log" }
  ]},
  { id: "budget", label: "Evaluation", icon: ChartNoAxesCombined, section: "CORE PLANNING", children: [
    { id: "budget", label: "Cost & budget" }, { id: "feasibility", label: "Feasibility" }
  ]},
  { id: "documentation", label: "Blueprint & docs", icon: BookOpen, section: "CORE PLANNING" },
  { id: "architecture", label: "Systems & processes", icon: Network, section: "SPECIALIST PLANNING", children: [
    { id: "architecture", label: "Architecture map" }, { id: "components", label: "Components" },
    { id: "connections", label: "Connections" }, { id: "data-flows", label: "Information flows" }
  ]},
  { id: "integrations", label: "Integrations & tools", icon: PlugZap, section: "SPECIALIST PLANNING", children: [
    { id: "integrations", label: "Integration overview" }, { id: "api-planner", label: "API planner" },
    { id: "call-flows", label: "Call sequences" }, { id: "tool-selection", label: "Tool selection" }
  ]}
];

export const moduleMeta: Record<ModuleId, ModuleMeta> = {
  overview: { title: "Project overview", eyebrow: "WORKSPACE", description: "A clear view of the work, decisions, dependencies and risks shaping this project.", icon: Gauge, tabs: ["Summary","Activity"], shortLabel: "Overview", prompts: ["Clarify the intended outcome","Identify the next decision","Review what is blocked"] },
  "design-studio": { title: "Project Design Studio", eyebrow: "CREATIVE WORKSPACE", description: "Shape the project visually. Arrange the moving parts, connect ideas and build a blueprint you can explore.", icon: Layers3, tabs: ["Canvas"], shortLabel: "Design block", prompts: ["Make the intended outcome visible","Connect the people, work and deliverables","Show how the pieces depend on one another"] },
  portfolio: { title: "Portfolio intelligence", eyebrow: "WORKSPACE INTELLIGENCE", description: "Connect project health, budget exposure, shared capacity and delivery bottlenecks across the workspace.", icon: ChartNoAxesCombined, tabs: ["Overview"], shortLabel: "Portfolio", prompts: ["Review at-risk projects","Check shared resource capacity","Resolve schedule bottlenecks"] },
  brief: { title: "Project brief", eyebrow: "PROJECT DEFINITION", description: "Define the need, intended outcome, boundaries and measures of success.", icon: FileText, tabs: ["Overview","Objectives","Success criteria"], shortLabel: "Brief", prompts: ["What problem are we solving?","Who benefits from the outcome?","How will success be measured?"] },
  requirements: { title: "Requirements", eyebrow: "PROJECT DEFINITION", description: "Capture needs, expectations, acceptance criteria and non-functional constraints.", icon: ClipboardList, tabs: ["All requirements","Functional","Non-functional","Acceptance"], shortLabel: "Requirement", prompts: ["Separate must-haves from nice-to-haves","Make each requirement testable","Record its source and priority"] },
  scope: { title: "Scope & boundaries", eyebrow: "PROJECT DEFINITION", description: "Make explicit what is included, excluded, assumed and constrained.", icon: Target, tabs: ["In scope","Out of scope","Constraints","Assumptions"], shortLabel: "Scope item", prompts: ["State inclusions and exclusions","Record hard constraints","Separate facts from assumptions"] },
  "work-breakdown": { title: "Work breakdown", eyebrow: "PROJECT DEFINITION", description: "Decompose outcomes into phases, deliverables, work packages and actionable tasks.", icon: GitMerge, tabs: ["Hierarchy","Deliverables","Dependencies"], shortLabel: "Work package", prompts: ["Start from deliverables","Break work into verifiable tasks","Identify dependencies and owners"] },
  roadmap: { title: "AI roadmap", eyebrow: "EXECUTION PLAN", description: "Turn the approved project brief into phases, tasks, dependencies, milestones and a resource-aware schedule.", icon: ChartNoAxesCombined, tabs: ["Roadmap","Timeline","Dependencies & resources"], shortLabel: "Roadmap", prompts: ["Use the saved project intake as the planning baseline","Sequence tasks by real dependencies","Review estimates and resource roles before committing to dates"] },
  timeline: { title: "Timeline & schedule", eyebrow: "EXECUTION PLAN", description: "Sequence the work, estimate durations and make schedule assumptions visible.", icon: CalendarDays, tabs: ["Schedule","Dependencies","Critical path","Scenarios"], shortLabel: "Schedule item", prompts: ["Estimate duration and confidence","Identify predecessor tasks","Include review and contingency time"] },
  milestones: { title: "Milestones", eyebrow: "EXECUTION PLAN", description: "Define meaningful checkpoints, approval gates and measurable outcomes.", icon: Flag, tabs: ["Milestones","Gates","Deliverables"], shortLabel: "Milestone", prompts: ["Define an observable completion condition","Assign an accountable owner","Record required approvals"] },
  resources: { title: "People & resources", eyebrow: "EXECUTION PLAN", description: "Plan roles, skills, capacity, equipment, facilities and availability.", icon: Users, tabs: ["People","Capacity","Equipment"], shortLabel: "Resource", prompts: ["Identify required skills and roles","Check availability and constraints","Avoid over-allocating shared resources"] },
  risks: { title: "Risk register", eyebrow: "GOVERNANCE", description: "Identify uncertainty, assess likelihood and impact, and plan mitigation and response.", icon: AlertTriangle, tabs: ["Register","Mitigation","Contingency"], shortLabel: "Risk", prompts: ["Describe cause, event and impact","Assess likelihood and severity","Assign mitigation and contingency owners"] },
  security: { title: "Security & access", eyebrow: "GOVERNANCE", description: "Plan privacy, permissions, physical safety, confidentiality and operational controls where relevant.", icon: KeyRound, tabs: ["Threats","Access","Controls"], shortLabel: "Control", prompts: ["Identify sensitive assets and people","Define least-privilege access","Verify legal, policy and safety obligations"] },
  testing: { title: "Quality & testing", eyebrow: "GOVERNANCE", description: "Define how outputs will be reviewed, tested, inspected and accepted.", icon: TestTube2, tabs: ["Quality plan","Scenarios","Acceptance gates"], shortLabel: "Quality check", prompts: ["Define quality criteria before delivery","Include edge and failure scenarios","Name evidence required for acceptance"] },
  decisions: { title: "Decision log", eyebrow: "GOVERNANCE", description: "Record options, trade-offs, evidence, decisions and the people accountable for them.", icon: GitBranch, tabs: ["Open decisions","Approved","Superseded"], shortLabel: "Decision", prompts: ["Describe the decision context","Compare alternatives and trade-offs","Record rationale and review date"] },
  budget: { title: "Cost & budget", eyebrow: "EVALUATION", description: "Estimate one-time, recurring, people, material, service and contingency costs.", icon: Wallet, tabs: ["Estimate","Operating cost","Forecast"], shortLabel: "Cost item", prompts: ["Separate one-time and recurring costs","Record currency, source and date","Include contingency and uncertainty ranges"] },
  feasibility: { title: "Feasibility", eyebrow: "EVALUATION", description: "Assess practical, technical, operational, schedule, financial and regulatory viability.", icon: ChartNoAxesCombined, tabs: ["Assessment","Assumptions","Options"], shortLabel: "Assessment", prompts: ["Check capability and resource fit","Validate the schedule and cost envelope","Compare viable alternatives"] },
  architecture: { title: "Architecture map", eyebrow: "SYSTEMS & PROCESSES", description: "Map people, activities, facilities, services, tools and systems that make the project work.", icon: Network, tabs: ["Canvas","Layers","Decisions"], shortLabel: "Component", prompts: ["Name each major component and responsibility","Show boundaries and ownership","Keep optional technical detail out when it is not needed"] },
  components: { title: "Components", eyebrow: "SYSTEMS & PROCESSES", description: "Define the role, inputs, outputs, owner and dependencies of each project element.", icon: Boxes, tabs: ["Inventory","Contracts","Dependencies"], shortLabel: "Component", prompts: ["Describe one responsibility per component","List inputs and outputs","Identify owner and dependencies"] },
  connections: { title: "Connections", eyebrow: "SYSTEMS & PROCESSES", description: "Specify how people, activities, systems and suppliers hand work or information across boundaries.", icon: GitBranch, tabs: ["Connection map","Matrix","Details"], shortLabel: "Connection", prompts: ["Define source and destination","Explain trigger and hand-off method","Record inputs, outputs and failure behaviour"] },
  "data-flows": { title: "Information flows", eyebrow: "SYSTEMS & PROCESSES", description: "Trace how documents, materials, events, records or information move between participants and systems.", icon: Workflow, tabs: ["Flow map","Inputs & outputs","Lineage"], shortLabel: "Flow", prompts: ["Identify where information originates","Show transformations and hand-offs","Define retention and destination"] },
  integrations: { title: "Integration overview", eyebrow: "INTEGRATIONS & TOOLS", description: "Plan the external organizations, services, vendors and systems that need to work together.", icon: PlugZap, tabs: ["Registry","Ownership","Readiness"], shortLabel: "Integration", prompts: ["Explain why an integration is needed","Confirm the owner on each side","Record support and exit arrangements"] },
  "api-planner": { title: "API planner", eyebrow: "INTEGRATIONS & TOOLS", description: "Plan endpoints, operations, authentication, request contracts, responses, limits and alternatives when APIs are relevant.", icon: PlugZap, tabs: ["Catalog","Operations","Authentication","Limits"], shortLabel: "API operation", prompts: ["Verify the official API documentation","Specify method, endpoint and request shape","Check auth, quota, pricing and data terms"] },
  "call-flows": { title: "Call sequences", eyebrow: "INTEGRATIONS & TOOLS", description: "Plan triggers, call order, branches, approvals, retries, timeouts and fallbacks.", icon: Workflow, tabs: ["Sequence","Conditions","Failure paths"], shortLabel: "Call step", prompts: ["Name the trigger and caller","Define expected response and next step","Specify timeout, retry and compensation behaviour"] },
  "tool-selection": { title: "Tool selection", eyebrow: "INTEGRATIONS & TOOLS", description: "Compare tools, vendors and services by fit, cost, risk, licensing and operational impact.", icon: Wrench, tabs: ["Candidates","Comparison","Decision log"], shortLabel: "Tool option", prompts: ["Compare realistic alternatives","Verify current pricing and licensing","Record lock-in and exit costs"] },
  documentation: { title: "Blueprint & docs", eyebrow: "DELIVERABLES", description: "Bring the connected plan together into a coherent, reviewable project blueprint.", icon: BookOpen, tabs: ["Blueprint","Diagrams","Export"], shortLabel: "Document", prompts: ["Summarize the approved plan","Link open questions and assumptions","Keep the blueprint aligned with decisions"] }
};
