"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowRight, CalendarDays, Check, CheckCircle2,
  Circle, Clock3, Flag, GitBranch, Layers3, LoaderCircle, RefreshCw,
  ShieldCheck, Sparkles, Users, WandSparkles, XCircle
} from "lucide-react";
import type {
  Project, ProjectRoadmap, RoadmapTaskStatus, PlanningItem
} from "@/lib/types";
import { addDays, calculateRoadmapSchedule, formatScheduleDate } from "@/lib/roadmap";
import { RoadmapWorkbench } from "@/components/roadmap-workbench";

type Props = {
  project: Project;
  onSave: (roadmap: ProjectRoadmap) => void;
  onApplyTasks: (items: PlanningItem[]) => void;
  onGoToBrief: () => void;
};

type RoadmapTab = "Roadmap" | "Timeline" | "Task editor" | "Dependencies & resources";

function localToday() {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}

function nextStatus(status: RoadmapTaskStatus): RoadmapTaskStatus {
  return status === "not-started" ? "in-progress" : status === "in-progress" ? "done" : "not-started";
}

export function AiRoadmapPlanner({ project, onSave, onApplyTasks, onGoToBrief }: Props) {
  const [tab, setTab] = useState<RoadmapTab>("Roadmap");
  const [startDate, setStartDate] = useState(project.roadmap?.startDate || addDays(localToday(), 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setStartDate(project.roadmap?.startDate || addDays(localToday(), 0));
    setError("");
  }, [project.id, project.roadmap?.generatedAt]);

  const roadmap = project.roadmap;
  const schedule = useMemo(() => roadmap ? calculateRoadmapSchedule(roadmap) : null, [roadmap]);
  const completed = roadmap?.tasks.filter((task) => task.status === "done").length ?? 0;
  const progress = roadmap?.tasks.length ? Math.round((completed / roadmap.tasks.length) * 100) : 0;
  const projectedEnd = roadmap && schedule && schedule.totalDurationDays > 0
    ? addDays(startDate, schedule.totalDurationDays - 1)
    : "";
  const deadlineMissed = Boolean(roadmap?.targetEndDate && projectedEnd && projectedEnd > roadmap.targetEndDate);

  async function generate() {
    if (!project.intake?.analysis || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          projectType: project.type,
          objective: project.objective,
          startDate,
          targetEndDate: project.intake.deadline,
          budget: project.intake.budget,
          intake: project.intake
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The roadmap could not be generated.");
      const nextRoadmap = data.roadmap as ProjectRoadmap;
      if (!nextRoadmap || !Array.isArray(nextRoadmap.tasks) || !Array.isArray(nextRoadmap.phases)) {
        throw new Error("The local model returned an incomplete roadmap. Try again.");
      }
      const checked = calculateRoadmapSchedule(nextRoadmap);
      if (checked.hasCycle) throw new Error("The generated roadmap contains circular dependencies. Refine the project brief and generate it again.");
      onSave(nextRoadmap);
      setTab("Roadmap");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate the roadmap.");
    } finally {
      setBusy(false);
    }
  }

  function updateStatus(taskId: string) {
    if (!roadmap) return;
    const nextTasks = roadmap.tasks.map((task) => task.id === taskId
      ? { ...task, status: nextStatus(task.status) }
      : task);
    onSave({ ...roadmap, tasks: nextTasks });
  }

  function changeStartDate(value: string) {
    const normalized = addDays(value, 0) || value;
    setStartDate(normalized);
    if (roadmap && normalized) onSave({ ...roadmap, startDate: normalized });
  }

  function applyTasks() {
    if (!roadmap) return;
    const seenTitles = new Set(project.items.filter((item) => item.moduleId === "work-breakdown").map((item) => item.title.toLowerCase()));
    const phaseMap = new Map(roadmap.phases.map((phase) => [phase.id, phase]));
    const items: PlanningItem[] = roadmap.tasks
      .filter((task) => {
        const key = task.title.toLowerCase();
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      })
      .map((task) => ({
        id: crypto.randomUUID(),
        moduleId: "work-breakdown" as const,
        title: task.title,
        detail: [
          phaseMap.get(task.phaseId)?.title ? "Phase: " + phaseMap.get(task.phaseId)?.title : "",
          task.description,
          "Estimate: " + task.durationDays + " working day(s)",
          "Suggested owner role: " + task.ownerRole,
          task.dependsOn.length ? "Depends on: " + task.dependsOn.map((id) => roadmap.tasks.find((entry) => entry.id === id)?.title || id).join(", ") : ""
        ].filter(Boolean).join(". "),
        createdAt: new Date().toISOString()
      }));
    if (items.length) onApplyTasks(items);
  }

  if (!project.intake?.analysis) {
    return <div className="roadmap-empty">
      <div className="roadmap-empty-icon"><WandSparkles size={22}/></div>
      <h3>Start with project discovery</h3>
      <p>The roadmap is generated from the saved AI Project Intake so the phases, estimates and dependencies reflect your actual project rather than a generic template.</p>
      <button className="button button-primary" onClick={onGoToBrief}>Open Project Brief <ArrowRight size={15}/></button>
    </div>;
  }

  return <section className="roadmap-workspace">
    <div className="roadmap-control-panel">
      <div className="roadmap-control-copy">
        <div className="roadmap-kicker"><Sparkles size={12}/> AI-ASSISTED EXECUTION DESIGN</div>
        <h3>{roadmap ? "Your project roadmap" : "Turn the brief into a delivery plan"}</h3>
        <p>{roadmap ? "Qwen proposed the work structure. PlanForge calculated its dependency-aware schedule." : "Generate realistic phases, tasks, milestones and resource roles from the saved project discovery."}</p>
      </div>
      <div className="roadmap-generate-actions">
        <label className="roadmap-date-field"><span>PLANNED START</span><input type="date" value={startDate} onChange={(event) => changeStartDate(event.target.value)}/></label>
        <button className="button button-primary" onClick={generate} disabled={busy}>
          {busy ? <><LoaderCircle className="roadmap-spinner" size={15}/> Building roadmap...</> : roadmap ? <><RefreshCw size={14}/> Regenerate roadmap</> : <><WandSparkles size={15}/> Generate roadmap</>}
        </button>
      </div>
    </div>

    {error && <div className="roadmap-error"><AlertTriangle size={15}/><span>{error}</span></div>}

    {!roadmap ? <div className="roadmap-first-run">
      <div className="roadmap-first-run-icon"><Layers3 size={20}/></div>
      <div><strong>Ready to build the execution plan</strong><p>Your saved objectives, deliverables, workstreams, constraints and clarification answers will be used as the planning baseline.</p></div>
    </div> : !schedule ? null : schedule.hasCycle ? <div className="roadmap-error"><XCircle size={15}/>Dependency cycle found. Regenerate the roadmap.</div> : <>
      <div className="roadmap-summary-grid">
        <div className="roadmap-summary-stat"><span>PHASES</span><strong>{roadmap.phases.length}</strong><small>Major delivery stages</small></div>
        <div className="roadmap-summary-stat"><span>TASKS</span><strong>{roadmap.tasks.length}</strong><small>{completed} completed · {progress}% progress</small></div>
        <div className="roadmap-summary-stat"><span>ESTIMATED DURATION</span><strong>{schedule.totalDurationDays}<em> days</em></strong><small>Working days · weekends excluded</small></div>
        <div className="roadmap-summary-stat"><span>CRITICAL TASKS</span><strong>{schedule.criticalPath.length}</strong><small>Zero schedule slack</small></div>
      </div>

      <div className="roadmap-summary-banner">
        <div><div className="roadmap-kicker"><CheckCircle2 size={12}/> ROADMAP SUMMARY</div><p>{roadmap.summary}</p></div>
        <div className="roadmap-deadline-status">
          <span>PROJECTED FINISH</span><strong>{projectedEnd ? new Date(projectedEnd + "T12:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}) : "Not scheduled"}</strong>
          {roadmap.targetEndDate && <small className={deadlineMissed ? "deadline-late" : "deadline-ok"}>{deadlineMissed ? "Beyond target deadline" : "Within target deadline"}</small>}
        </div>
      </div>

      <div className="roadmap-tabs" role="tablist">
        {(["Roadmap","Timeline","Task editor","Dependencies & resources"] as RoadmapTab[]).map((value) => <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "roadmap-tab roadmap-tab-active" : "roadmap-tab"} onClick={() => setTab(value)}>{value}</button>)}
        <button className="roadmap-export-placeholder" onClick={applyTasks}><ArrowDown size={13}/> Add tasks to Work Breakdown</button>
      </div>

      {tab === "Roadmap" && <div className="roadmap-section-grid">
        <section className="roadmap-pane">
          <div className="roadmap-pane-heading"><div><h4>Delivery phases</h4><p>Tasks grouped by the outcome each phase delivers.</p></div><span>{roadmap.phases.length} phases</span></div>
          <div className="roadmap-phase-list">{roadmap.phases.map((phase,index) => {
            const phaseTasks = roadmap.tasks.filter((task) => task.phaseId === phase.id);
            const phaseSchedule = schedule.tasks.filter((item) => item.task.phaseId === phase.id);
            const phaseStart = phaseSchedule.length ? Math.min(...phaseSchedule.map((item) => item.startDay)) : 0;
            const phaseEnd = phaseSchedule.length ? Math.max(...phaseSchedule.map((item) => item.finishDay)) : 0;
            const phaseDone = phaseTasks.filter((task) => task.status === "done").length;
            return <article className="roadmap-phase-card" key={phase.id}>
              <div className="roadmap-phase-top"><span className="roadmap-phase-index">{String(index+1).padStart(2,"0")}</span><div className="roadmap-phase-title"><strong>{phase.title}</strong><small>{phaseTasks.length} tasks · Day {phaseStart+1}–{phaseEnd}</small></div><span className="roadmap-phase-progress">{phaseTasks.length ? Math.round((phaseDone/phaseTasks.length)*100) : 0}%</span></div>
              <p>{phase.goal}</p>
              <div className="roadmap-phase-progress-track"><span style={{width:(phaseTasks.length ? phaseDone/phaseTasks.length*100 : 0)+"%"}}/></div>
              <div className="roadmap-task-stack">{phaseTasks.map((task) => {
                const scheduled = schedule.taskById[task.id];
                return <div className="roadmap-task-row" key={task.id}>
                  <button className={"roadmap-task-status task-status-"+task.status} aria-label={"Change status for "+task.title} onClick={() => updateStatus(task.id)}>{task.status === "done" ? <Check size={12}/> : task.status === "in-progress" ? <span/> : <Circle size={12}/>}</button>
                  <div className="roadmap-task-copy"><strong>{task.title}</strong><small>{task.ownerRole} · {task.durationDays}d{scheduled?.critical ? " · Critical path" : ""}</small></div>
                  <span className={"roadmap-priority priority-"+task.priority}>{task.priority}</span>
                </div>;
              })}</div>
            </article>;
          })}</div>
        </section>
        <aside className="roadmap-side-stack">
          <div className="roadmap-pane roadmap-milestones-pane"><div className="roadmap-pane-heading"><div><h4>Milestone gates</h4><p>Acceptance points</p></div><Flag size={15}/></div>
            {roadmap.milestones.map((milestone) => {
              const finish = Math.max(0,...milestone.afterTaskIds.map((id)=>schedule.taskById[id]?.finishDay ?? 0));
              return <div className="roadmap-milestone" key={milestone.id}><span className="milestone-marker"><Flag size={12}/></span><div><strong>{milestone.title}</strong><p>{milestone.description}</p><small>{formatScheduleDate(startDate,Math.max(0,finish-1))}</small></div></div>;
            })}
            {!roadmap.milestones.length && <p className="roadmap-muted-empty">No milestone gates were proposed.</p>}
          </div>
          <div className="roadmap-pane"><div className="roadmap-pane-heading"><div><h4>Planning assumptions</h4><p>Review before committing</p></div><ShieldCheck size={15}/></div>
            {[...roadmap.assumptions,...roadmap.externalConstraints].slice(0,8).map((item,index)=><div className="roadmap-assumption" key={index}>{item}</div>)}
            {!roadmap.assumptions.length && !roadmap.externalConstraints.length && <p className="roadmap-muted-empty">No extra assumptions were identified.</p>}
          </div>
        </aside>
      </div>}

      {tab === "Timeline" && <div className="roadmap-pane roadmap-gantt-pane">
        <div className="roadmap-pane-heading"><div><h4>Dependency-aware timeline</h4><p>Bars show calculated working days from the planned start date. Critical path tasks are highlighted.</p></div><span>{schedule.totalDurationDays} working days</span></div>
        <div className="gantt-date-head"><div>TASK / OWNER</div><div className="gantt-scale"><span>DAY 1</span><span>DAY {Math.max(1,Math.ceil(schedule.totalDurationDays/2))}</span><span>DAY {schedule.totalDurationDays}</span></div><div>DURATION</div></div>
        <div className="gantt-rows">{roadmap.phases.map((phase)=> <div className="gantt-phase-group" key={phase.id}>
          <div className="gantt-phase-label"><strong>{phase.title}</strong><span>{phase.goal}</span></div>
          {schedule.tasks.filter((entry)=>entry.task.phaseId===phase.id).map((entry)=>{
            const left=entry.startDay/Math.max(1,schedule.totalDurationDays)*100;
            const width=Math.max(1.5,entry.task.durationDays/Math.max(1,schedule.totalDurationDays)*100);
            return <div className="gantt-row" key={entry.task.id}>
              <div className="gantt-task-label"><strong>{entry.task.title}</strong><small>{entry.task.ownerRole}</small></div>
              <div className="gantt-track"><div className={"gantt-bar "+(entry.critical?"gantt-critical":"")+(entry.task.status==="done"?" gantt-done":"")} style={{left:left+"%",width:Math.min(100-left,width)+"%"}} title={entry.task.title+" · Day "+(entry.startDay+1)+"–"+entry.finishDay}/></div>
              <div className="gantt-duration">{entry.task.durationDays}d</div>
            </div>;
          })}
        </div>)}</div>
        <div className="gantt-legend"><span><i className="legend-critical"/> Critical path</span><span><i className="legend-standard"/> Other work</span><span><i className="legend-done"/> Completed</span></div>
      </div>}

      {tab === "Task editor" && <RoadmapWorkbench roadmap={roadmap} schedule={schedule} onChange={onSave}/>}

      {tab === "Dependencies & resources" && <div className="roadmap-dependency-grid">
        <section className="roadmap-pane"><div className="roadmap-pane-heading"><div><h4>Task dependencies</h4><p>Predecessors, calculated slack and critical path.</p></div><GitBranch size={15}/></div>
          {schedule.tasks.map((entry)=> <div className="dependency-row" key={entry.task.id}><div className="dependency-task"><strong>{entry.task.title}</strong><small>{entry.task.phaseId} · {entry.slackDays}d slack</small></div><ArrowRight size={13}/><div className="dependency-predecessors">{entry.task.dependsOn.length ? entry.task.dependsOn.map((id)=>roadmap.tasks.find((task)=>task.id===id)?.title || id).join(", ") : "No predecessor"}</div>{entry.critical && <span className="critical-label">CRITICAL</span>}</div>)}
          {schedule.warnings.map((warning,index)=><div className="roadmap-warning" key={index}><AlertTriangle size={13}/>{warning}</div>)}
        </section>
        <section className="roadmap-pane"><div className="roadmap-pane-heading"><div><h4>Resource roles</h4><p>Suggested responsibilities, not confirmed assignments.</p></div><Users size={15}/></div>
          {roadmap.resourceRoles.map((resource)=> <article className="roadmap-resource" key={resource.id}><div className="roadmap-resource-icon"><Users size={15}/></div><div><strong>{resource.role}</strong><p>{resource.responsibilities}</p>{resource.skills.length>0&&<small>{resource.skills.join(" · ")}</small>}</div></article>)}
          {!roadmap.resourceRoles.length && <p className="roadmap-muted-empty">No dedicated resource roles were proposed.</p>}
        </section>
      </div>}
      <div className="roadmap-footer"><span><CheckCircle2 size={13}/> Roadmap saved with this project · Generated {new Date(roadmap.generatedAt).toLocaleString()}</span><span>Working days exclude weekends; public holidays are not modelled. Estimates are not commitments.</span></div>
    </>}
  </section>;
}
