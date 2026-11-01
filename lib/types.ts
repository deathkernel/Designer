import type { LucideIcon } from "lucide-react";

export type ProjectStatus = "Planning" | "In progress" | "On hold" | "Completed";
export type ModuleId =
  | "overview" | "brief" | "requirements" | "scope" | "work-breakdown"
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
