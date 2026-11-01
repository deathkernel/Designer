import type { LucideIcon } from "lucide-react";

export type ProjectStatus = "Planning" | "In progress" | "On hold" | "Completed";
export type ModuleId =
  | "overview" | "brief" | "requirements" | "scope" | "work-breakdown" | "roadmap"
  | "timeline" | "milestones" | "resources" | "risks" | "security"
  | "testing" | "decisions" | "budget" | "feasibility" | "architecture"
  | "components" | "connections" | "data-flows" | "integrations"
  | "api-planner" | "call-flows" | "tool-selection" | "documentation";

export type PlanningItem = {
  id: string;
  moduleId: ModuleId;
  title: string;
  detail: string;
  createdAt: string;
  source?: string;
  destination?: string;
  trigger?: string;
  tool?: string;
  input?: string;
  output?: string;
  failure?: string;
};

export type IntakePriority = "high" | "medium" | "low";
export type IntakeConfidence = "low" | "medium" | "high";

export type IntakeObjective = {
  title: string;
  detail: string;
  successMeasure: string;
};

export type IntakeDeliverable = {
  title: string;
  description: string;
  acceptanceCriteria: string[];
};

export type IntakeWorkstream = {
  title: string;
  goal: string;
  tasks: string[];
};

export type IntakeRisk = {
  title: string;
  likelihood: string;
  impact: string;
  mitigation: string;
};

export type IntakeQuestion = {
  question: string;
  whyItMatters: string;
  priority: IntakePriority;
};

export type IntakeAnalysis = {
  executiveSummary: string;
  problemStatement: string;
  desiredOutcome: string;
  stakeholders: string[];
  objectives: IntakeObjective[];
  deliverables: IntakeDeliverable[];
  workstreams: IntakeWorkstream[];
  assumptions: string[];
  constraints: string[];
  risks: IntakeRisk[];
  openQuestions: IntakeQuestion[];
  recommendedNextSteps: string[];
  evidenceNeeded: string[];
  confidence: IntakeConfidence;
};

export type ProjectIntake = {
  idea: string;
  context: string;
  deadline: string;
  budget: string;
  answers: Record<string, string>;
  analysis: IntakeAnalysis;
  updatedAt: string;
};

export type RoadmapPriority = "high" | "medium" | "low";
export type RoadmapTaskStatus = "not-started" | "in-progress" | "done";

export type RoadmapTask = {
  id: string;
  phaseId: string;
  title: string;
  description: string;
  durationDays: number;
  ownerRole: string;
  priority: RoadmapPriority;
  dependsOn: string[];
  status: RoadmapTaskStatus;
  startOffsetDays?: number;
};

export type RoadmapPhase = {
  id: string;
  title: string;
  goal: string;
  taskIds: string[];
};

export type RoadmapMilestone = {
  id: string;
  title: string;
  description: string;
  afterTaskIds: string[];
  acceptanceCriteria: string[];
};

export type RoadmapResourceRole = {
  id: string;
  role: string;
  responsibilities: string;
  skills: string[];
};

export type ProjectRoadmap = {
  summary: string;
  generatedAt: string;
  startDate: string;
  targetEndDate: string;
  phases: RoadmapPhase[];
  tasks: RoadmapTask[];
  milestones: RoadmapMilestone[];
  resourceRoles: RoadmapResourceRole[];
  assumptions: string[];
  externalConstraints: string[];
};

export type Project = {
  id: string;
  name: string;
  type: string;
  objective: string;
  status: ProjectStatus;
  progress: number;
  updatedAt: string;
  notes: Partial<Record<ModuleId, string>>;
  items: PlanningItem[];
  intake?: ProjectIntake;
  roadmap?: ProjectRoadmap;
};

export type NavItem = {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
  section: "CORE PLANNING" | "SPECIALIST PLANNING";
  children?: { id: ModuleId; label: string }[];
};

export type ModuleMeta = {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  tabs: string[];
  shortLabel: string;
  prompts: string[];
};
