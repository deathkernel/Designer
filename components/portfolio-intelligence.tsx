"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, CalendarDays, CircleDollarSign, FolderKanban, Gauge, Plus, ShieldCheck, Trash2, Users, Wallet } from "lucide-react";
import type { Project, ProjectBudgetPlan, ProjectResourceAllocation } from "@/lib/types";
import { addDays, calculateRoadmapSchedule } from "@/lib/roadmap";

type Props = {
  projects: Project[];
  onUpdateProject: (projectId: string, patch: Partial<Project>) => void;
  onOpenProject: (projectId: string) => void;
};
type Tab = "Overview" | "Budgets" | "Resources" | "Bottlenecks";
type Health = { score: number; label: string; reasons: string[] };

const emptyBudget: ProjectBudgetPlan = { currency: "INR", estimatedAmount: 0, actualSpent: 0, contingencyPercent: 10 };

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return (currency || "INR") + " " + (value || 0).toLocaleString("en-IN");
  }
}

function projectHealth(project: Project): Health {
  const reasons: string[] = [];
  let score = 100;
  const roadmap = project.roadmap;

  if (!project.intake?.analysis) {
    score -= 12;
    reasons.push("Project discovery is incomplete");
  }
  if (!roadmap?.tasks.length) {
    score -= 18;
    reasons.push("No execution roadmap yet");
  } else {
    const byId = new Map(roadmap.tasks.map((task) => [task.id, task]));
    const blocked = roadmap.tasks.filter((task) => task.status !== "done" && task.dependsOn.some((id) => byId.get(id)?.status !== "done")).length;
    const highPriorityOpen = roadmap.tasks.filter((task) => task.priority === "high" && task.status !== "done").length;
    if (blocked) {
      score -= Math.min(24, blocked * 4);
      reasons.push(blocked + " task(s) waiting on unfinished predecessors");
    }
    if (highPriorityOpen) {
      score -= Math.min(12, highPriorityOpen * 2);
      reasons.push(highPriorityOpen + " high-priority task(s) remain open");
    }
    const schedule = calculateRoadmapSchedule(roadmap);
    if (!schedule.hasCycle && schedule.totalDurationDays > 0 && roadmap.targetEndDate) {
      const finish = addDays(roadmap.startDate, schedule.totalDurationDays - 1);
      if (finish > roadmap.targetEndDate) {
        const late = Math.max(1, Math.ceil((new Date(finish + "T12:00:00").getTime() - new Date(roadmap.targetEndDate + "T12:00:00").getTime()) / 86400000));
        score -= Math.min(30, 12 + late);
        reasons.push("Projected finish is " + late + " calendar day(s) beyond target");
      }
    }
  }

  if (project.intake?.analysis.confidence === "low") {
    score -= 8;
    reasons.push("Initial analysis has low confidence");
  }
  if (project.status === "On hold") {
    score -= 15;
    reasons.push("Project is currently on hold");
  }
  if (project.status === "Completed" && roadmap?.tasks.every((task) => task.status === "done")) {
    score = 100;
    reasons.length = 0;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, label: score >= 80 ? "Healthy" : score >= 55 ? "Needs attention" : "At risk", reasons };
}

function collectBottlenecks(projects: Project[]) {
  return projects.flatMap((project) => {
    const roadmap = project.roadmap;
    if (!roadmap?.tasks.length) return [];
    const schedule = calculateRoadmapSchedule(roadmap);
    if (schedule.hasCycle) return [{
      projectId: project.id, projectName: project.name, taskId: "cycle-" + project.id,
      title: "Circular dependency detected", detail: "Correct the dependency graph before trusting the schedule.",
      severity: "high" as const, blocked: true
    }];
    const byId = new Map(roadmap.tasks.map((task) => [task.id, task]));
    const successors = new Map<string, number>();
    roadmap.tasks.forEach((task) => successors.set(task.id, 0));
    roadmap.tasks.forEach((task) => task.dependsOn.forEach((id) => successors.set(id, (successors.get(id) ?? 0) + 1)));
    return roadmap.tasks.flatMap((task) => {
      if (task.status === "done") return [];
      const blockedBy = task.dependsOn.map((id) => byId.get(id)).filter((entry) => entry && entry.status !== "done");
      const downstream = successors.get(task.id) ?? 0;
      const critical = schedule.taskById[task.id]?.critical ?? false;
      if (!blockedBy.length && downstream < 2 && !(critical && task.priority === "high")) return [];
      return [{
        projectId: project.id, projectName: project.name, taskId: task.id, title: task.title,
        detail: blockedBy.length ? "Waiting for " + blockedBy.map((entry) => entry?.title).join(", ") : downstream + " downstream task(s) depend on this task",
        severity: task.priority === "high" || blockedBy.length ? "high" as const : "medium" as const,
        blocked: blockedBy.length > 0
      }];
    });
  }).sort((a, b) => Number(b.blocked) - Number(a.blocked) || Number(b.severity === "high") - Number(a.severity === "high")).slice(0, 16);
}

export function PortfolioIntelligence({ projects, onUpdateProject, onOpenProject }: Props) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [resourceProjectId, setResourceProjectId] = useState(projects[0]?.id ?? "");
  const [resourceName, setResourceName] = useState("");
  const [resourceRole, setResourceRole] = useState("");
  const [allocation, setAllocation] = useState(50);
  const [hours, setHours] = useState(20);
  const [formError, setFormError] = useState("");

  const health = useMemo(() => new Map(projects.map((project) => [project.id, projectHealth(project)])), [projects]);
  const bottlenecks = useMemo(() => collectBottlenecks(projects), [projects]);
  const atRisk = projects.filter((project) => (health.get(project.id)?.score ?? 0) < 55).length;
  const attention = projects.filter((project) => {
    const score = health.get(project.id)?.score ?? 0;
    return score >= 55 && score < 80;
  }).length;
  const budgets = projects.filter((project) => project.budgetPlan);
  const currencyTotals = new Map<string, { planned: number; spent: number }>();
  budgets.forEach((project) => {
    const budget = project.budgetPlan ?? emptyBudget;
    const total = currencyTotals.get(budget.currency) ?? { planned: 0, spent: 0 };
    total.planned += budget.estimatedAmount || 0;
    total.spent += budget.actualSpent || 0;
    currencyTotals.set(budget.currency, total);
  });

  const resourceLoads = useMemo(() => {
    const map = new Map<string, { name: string; percent: number; hours: number; assignments: { project: Project; allocation: ProjectResourceAllocation }[] }>();
    projects.forEach((project) => (project.resourceAllocations ?? []).forEach((entry) => {
      const key = entry.resourceName.trim().toLowerCase();
      if (!key) return;
      const value = map.get(key) ?? { name: entry.resourceName, percent: 0, hours: 0, assignments: [] };
      value.percent += entry.allocationPercent;
      value.hours += entry.hoursPerWeek;
      value.assignments.push({ project, allocation: entry });
      map.set(key, value);
    }));
    return [...map.values()].sort((a, b) => b.percent - a.percent);
  }, [projects]);

  function updateBudget(project: Project, patch: Partial<ProjectBudgetPlan>) {
    onUpdateProject(project.id, { budgetPlan: { ...emptyBudget, ...project.budgetPlan, ...patch } });
  }

  function addResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resourceProjectId || !resourceName.trim() || !resourceRole.trim()) {
      setFormError("Choose a project and enter a resource name and role.");
      return;
    }
    const project = projects.find((entry) => entry.id === resourceProjectId);
    if (!project) return;
    const item: ProjectResourceAllocation = {
      id: crypto.randomUUID(),
      resourceName: resourceName.trim(),
      role: resourceRole.trim(),
      allocationPercent: Math.min(100, Math.max(1, allocation)),
      hoursPerWeek: Math.min(80, Math.max(1, hours))
    };
    onUpdateProject(project.id, { resourceAllocations: [...(project.resourceAllocations ?? []), item] });
    setResourceName("");
    setResourceRole("");
    setAllocation(50);
    setHours(20);
    setFormError("");
  }

  function updateResource(project: Project, id: string, patch: Partial<ProjectResourceAllocation>) {
    onUpdateProject(project.id, { resourceAllocations: (project.resourceAllocations ?? []).map((entry) => entry.id === id ? { ...entry, ...patch } : entry) });
  }

  function removeResource(project: Project, id: string) {
    onUpdateProject(project.id, { resourceAllocations: (project.resourceAllocations ?? []).filter((entry) => entry.id !== id) });
  }

  if (!projects.length) {
    return <div className="page-wrap portfolio-page"><div className="module-breadcrumb"><span>Workspace</span><ArrowRight size={13}/><span>PORTFOLIO</span></div><div className="portfolio-empty"><span><Gauge size={26}/></span><h2>Your portfolio starts with a project</h2><p>Create a project first. Once plans, budgets and resource assignments exist, this workspace will connect the dots across them.</p></div></div>;
  }

  return <div className="page-wrap portfolio-page">
    <div className="portfolio-heading">
      <div><div className="eyebrow">WORKSPACE INTELLIGENCE</div><h1>Portfolio <span>command centre.</span></h1><p className="page-intro">See delivery health, budget exposure, shared capacity and work that could slow the portfolio down.</p></div>
      <div className="portfolio-heading-meta"><span><i className="portfolio-live-dot"/> LOCAL WORKSPACE DATA</span><small>{projects.length} project(s) in view</small></div>
    </div>
    <div className="portfolio-tabs" role="tablist" aria-label="Portfolio views">
      {(["Overview", "Budgets", "Resources", "Bottlenecks"] as Tab[]).map((value) => <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "portfolio-tab portfolio-tab-active" : "portfolio-tab"} onClick={() => setTab(value)}>{value}</button>)}
    </div>
    <div className="portfolio-metrics">
      <article className="portfolio-metric"><span><FolderKanban size={17}/></span><small>ACTIVE PROJECTS</small><strong>{projects.filter((project) => project.status !== "Completed").length}</strong><em>{projects.length} total</em></article>
      <article className="portfolio-metric"><span><ShieldCheck size={17}/></span><small>AT RISK</small><strong>{atRisk}</strong><em>{attention} need attention</em></article>
      <article className="portfolio-metric"><span><Wallet size={17}/></span><small>TRACKED BUDGETS</small><strong>{budgets.length}</strong><em>{budgets.length} of {projects.length} projects</em></article>
      <article className="portfolio-metric"><span><Users size={17}/></span><small>SHARED RESOURCES</small><strong>{resourceLoads.length}</strong><em>{resourceLoads.filter((entry) => entry.percent > 100).length} over allocated</em></article>
    </div>

    {tab === "Overview" && <div className="portfolio-content-grid">
      <section className="portfolio-panel">
        <div className="portfolio-panel-heading"><div><h3>Project health</h3><p>Rule-based signals from planning readiness, deadline outlook and dependency blockers.</p></div><Gauge size={17}/></div>
        {projects.map((project) => {
          const result = health.get(project.id) ?? projectHealth(project);
          const progress = project.roadmap?.tasks.length ? Math.round(project.roadmap.tasks.filter((task) => task.status === "done").length / project.roadmap.tasks.length * 100) : project.progress;
          return <article className="portfolio-project-row" key={project.id}>
            <div className="portfolio-project-title"><button onClick={() => onOpenProject(project.id)}>{project.name}</button><span>{project.type}</span></div>
            <div className="portfolio-health-cell"><div className="portfolio-health-top"><strong>{result.score}/100</strong><span className={"health-label health-" + result.label.toLowerCase().replaceAll(" ", "-")}>{result.label}</span></div><div className="portfolio-health-track"><i style={{ width: result.score + "%" }}/></div><small>{result.reasons[0] ?? "No major planning warning detected"}</small></div>
            <div className="portfolio-progress-cell"><strong>{progress}%</strong><div className="portfolio-health-track"><i style={{ width: Math.min(100, Math.max(0, progress)) + "%" }}/></div><small>{project.status}</small></div>
            <button className="portfolio-open-button" onClick={() => onOpenProject(project.id)} aria-label={"Open " + project.name}><ArrowRight size={15}/></button>
          </article>;
        })}
      </section>
      <section className="portfolio-side-stack">
        <div className="portfolio-panel"><div className="portfolio-panel-heading"><div><h3>Budget exposure</h3><p>Totals stay separated by currency.</p></div><CircleDollarSign size={17}/></div>
          {[...currencyTotals.entries()].map(([currency, total]) => <div className="portfolio-currency-row" key={currency}><span>{currency}</span><strong>{money(total.spent, currency)}</strong><small>of {money(total.planned, currency)}</small><i><b style={{ width: (total.planned > 0 ? Math.min(100, total.spent / total.planned * 100) : 0) + "%" }}/></i></div>)}
          {!currencyTotals.size && <p className="portfolio-empty-note">Add project budgets to see portfolio spend.</p>}
          <button className="portfolio-text-action" onClick={() => setTab("Budgets")}>Manage budgets <ArrowRight size={13}/></button>
        </div>
        <div className="portfolio-panel"><div className="portfolio-panel-heading"><div><h3>Delivery bottlenecks</h3><p>Open work with dependency pressure.</p></div><AlertTriangle size={17}/></div>
          {bottlenecks.slice(0, 4).map((item) => <div className="portfolio-bottleneck-line" key={item.projectId + item.taskId}><i className={item.severity === "high" ? "bottleneck-dot bottleneck-high" : "bottleneck-dot"}/><div><strong>{item.title}</strong><small>{item.projectName} · {item.blocked ? "Blocked" : "Downstream dependency"}</small></div></div>)}
          {!bottlenecks.length && <p className="portfolio-empty-note">No active dependency bottlenecks were identified.</p>}
          <button className="portfolio-text-action" onClick={() => setTab("Bottlenecks")}>View bottlenecks <ArrowRight size={13}/></button>
        </div>
      </section>
    </div>}

    {tab === "Budgets" && <section className="portfolio-panel">
      <div className="portfolio-panel-heading"><div><h3>Project budget controls</h3><p>Enter planned and actual amounts. Different currencies are never combined.</p></div><Wallet size={17}/></div>
      {projects.map((project) => {
        const budget = { ...emptyBudget, ...project.budgetPlan };
        const remaining = budget.estimatedAmount - budget.actualSpent;
        const burn = budget.estimatedAmount > 0 ? budget.actualSpent / budget.estimatedAmount * 100 : 0;
        return <article className="portfolio-budget-row" key={project.id}>
          <div className="portfolio-budget-project"><strong>{project.name}</strong><small>{project.status}</small></div>
          <label>Currency<select value={budget.currency} onChange={(event) => updateBudget(project, { currency: event.target.value })}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option><option>JPY</option><option>CAD</option><option>AUD</option></select></label>
          <label>Planned budget<input type="number" min="0" step="0.01" value={budget.estimatedAmount} onChange={(event) => updateBudget(project, { estimatedAmount: Math.max(0, Number(event.target.value) || 0) })}/></label>
          <label>Actual spent<input type="number" min="0" step="0.01" value={budget.actualSpent} onChange={(event) => updateBudget(project, { actualSpent: Math.max(0, Number(event.target.value) || 0) })}/></label>
          <label>Contingency %<input type="number" min="0" max="100" value={budget.contingencyPercent} onChange={(event) => updateBudget(project, { contingencyPercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })}/></label>
          <div className="portfolio-budget-result"><div><span>{money(remaining, budget.currency)} remaining</span><strong>{Math.round(burn)}% spent</strong></div><div className="portfolio-health-track"><i className={burn > 100 ? "budget-overrun" : ""} style={{ width: Math.min(100, Math.max(0, burn)) + "%" }}/></div>{burn > 100 && <small className="portfolio-overrun-warning">Actual spend exceeds the planned budget.</small>}</div>
        </article>;
      })}
    </section>}

    {tab === "Resources" && <div className="portfolio-resource-layout">
      <section className="portfolio-panel">
        <div className="portfolio-panel-heading"><div><h3>Shared resource load</h3><p>Resource names are combined across projects.</p></div><Users size={17}/></div>
        {resourceLoads.map((person) => <article className="portfolio-resource-load" key={person.name.toLowerCase()}>
          <div><strong>{person.name}</strong><small>{person.assignments.length} assignment(s) · {person.hours} listed hours/week</small></div>
          <div className="portfolio-resource-meter"><div><i style={{ width: Math.min(100, person.percent) + "%" }} className={person.percent > 100 ? "resource-overload" : ""}/></div><strong className={person.percent > 100 ? "resource-overload-text" : ""}>{person.percent}%</strong></div>
          {person.assignments.map((assignment) => <small className="portfolio-resource-assignment" key={assignment.allocation.id}>{assignment.project.name} · {assignment.allocation.role} · {assignment.allocation.allocationPercent}%</small>)}
          {person.percent > 100 && <span className="portfolio-overrun-warning">Over-allocated across projects</span>}
        </article>)}
        {!resourceLoads.length && <p className="portfolio-empty-note">No resources assigned yet. Add the first assignment.</p>}
      </section>
      <section className="portfolio-panel">
        <div className="portfolio-panel-heading"><div><h3>Add resource assignment</h3><p>Assign a person, team or shared resource.</p></div><Users size={17}/></div>
        <form className="portfolio-resource-form" onSubmit={addResource}>
          <label>Project<select value={resourceProjectId} onChange={(event) => setResourceProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Person / resource name<input value={resourceName} onChange={(event) => setResourceName(event.target.value)} placeholder="e.g. Design team" maxLength={80}/></label>
          <label>Role<input value={resourceRole} onChange={(event) => setResourceRole(event.target.value)} placeholder="e.g. Project lead" maxLength={80}/></label>
          <div className="portfolio-resource-form-grid"><label>Allocation %<input type="number" min="1" max="100" value={allocation} onChange={(event) => setAllocation(Number(event.target.value))}/></label><label>Hours / week<input type="number" min="1" max="80" value={hours} onChange={(event) => setHours(Number(event.target.value))}/></label></div>
          {formError && <p className="portfolio-form-error">{formError}</p>}
          <button className="button button-primary" type="submit"><Plus size={14}/> Add assignment</button>
        </form>
      </section>
      <section className="portfolio-panel portfolio-resource-assignments">
        <div className="portfolio-panel-heading"><div><h3>Project assignments</h3><p>Edit or remove the allocation records.</p></div><Users size={17}/></div>
        {projects.map((project) => (project.resourceAllocations ?? []).map((entry) => <div className="portfolio-assignment-row" key={entry.id}>
          <div><strong>{project.name}</strong><small>{entry.resourceName}</small></div>
          <label>Role<input value={entry.role} onChange={(event) => updateResource(project, entry.id, { role: event.target.value })}/></label>
          <label>Allocation %<input type="number" min="1" max="100" value={entry.allocationPercent} onChange={(event) => updateResource(project, entry.id, { allocationPercent: Math.min(100, Math.max(1, Number(event.target.value) || 1)) })}/></label>
          <label>Hours / week<input type="number" min="1" max="80" value={entry.hoursPerWeek} onChange={(event) => updateResource(project, entry.id, { hoursPerWeek: Math.min(80, Math.max(1, Number(event.target.value) || 1)) })}/></label>
          <button type="button" className="icon-button" onClick={() => removeResource(project, entry.id)} aria-label={"Remove " + entry.resourceName}><Trash2 size={14}/></button>
        </div>))}
      </section>
    </div>}

    {tab === "Bottlenecks" && <section className="portfolio-panel">
      <div className="portfolio-panel-heading"><div><h3>Delivery pressure points</h3><p>Open blockers, critical work and tasks with multiple downstream dependencies.</p></div><AlertTriangle size={17}/></div>
      {bottlenecks.map((item) => <article className="portfolio-bottleneck-row" key={item.projectId + item.taskId}>
        <i className={item.severity === "high" ? "bottleneck-dot bottleneck-high" : "bottleneck-dot"}/>
        <div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.projectName}</small></div>
        <button className="button button-secondary button-small" onClick={() => onOpenProject(item.projectId)}>Open project <ArrowRight size={13}/></button>
      </article>)}
      {!bottlenecks.length && <p className="portfolio-empty-note">No active dependency bottlenecks were identified from saved roadmaps.</p>}
    </section>}
    <div className="portfolio-footnote"><ShieldCheck size={13}/> Health scores and bottlenecks are rule-based signals from local data, not guarantees. Budget and capacity figures are estimates entered by the workspace owner.</div>
  </div>;
}
