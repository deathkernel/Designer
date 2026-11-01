"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  AlertTriangle, Check, CirclePlus, Clock3, Pencil, Plus, Save, Trash2
} from "lucide-react";
import type {
  ProjectRoadmap, RoadmapPriority, RoadmapTask, RoadmapTaskStatus
} from "@/lib/types";
import { calculateRoadmapSchedule, formatScheduleDate, type RoadmapSchedule } from "@/lib/roadmap";

type Props = {
  roadmap: ProjectRoadmap;
  schedule: RoadmapSchedule;
  onChange: (roadmap: ProjectRoadmap) => void;
};

type TaskDraft = {
  phaseId: string;
  title: string;
  description: string;
  durationDays: number;
  ownerRole: string;
  priority: RoadmapPriority;
  status: RoadmapTaskStatus;
  dependsOn: string[];
  startOffsetDays: number;
};

const emptyDraft = (phaseId: string): TaskDraft => ({
  phaseId,
  title: "",
  description: "",
  durationDays: 1,
  ownerRole: "Unassigned",
  priority: "medium",
  status: "not-started",
  dependsOn: [],
  startOffsetDays: 0
});

export function RoadmapWorkbench({ roadmap, schedule, onChange }: Props) {
  const [selectedTaskId, setSelectedTaskId] = useState(roadmap.tasks[0]?.id ?? "");
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const selectedTask = roadmap.tasks.find((task) => task.id === selectedTaskId);
  const phaseName = useMemo(
    () => new Map(roadmap.phases.map((phase) => [phase.id, phase.title])),
    [roadmap.phases]
  );
  const timelineDays = Math.max(1, schedule.totalDurationDays + 5);

  useEffect(() => {
    if (!selectedTaskId) {
      setDraft(null);
      return;
    }
    const task = roadmap.tasks.find((entry) => entry.id === selectedTaskId);
    if (!task) {
      setSelectedTaskId("");
      setDraft(null);
      return;
    }
    setDraft({
      phaseId: task.phaseId,
      title: task.title,
      description: task.description,
      durationDays: task.durationDays,
      ownerRole: task.ownerRole,
      priority: task.priority,
      status: task.status,
      dependsOn: [...task.dependsOn],
      startOffsetDays: Math.max(0, task.startOffsetDays ?? 0)
    });
    setError("");
  }, [selectedTaskId, roadmap.tasks]);

  function updateDraft<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setSavedMessage("");
  }

  function addTask() {
    if (!roadmap.phases.length) {
      setError("Add a phase before creating a task.");
      return;
    }
    const phaseId = roadmap.phases[0].id;
    const task: RoadmapTask = {
      id: crypto.randomUUID(),
      phaseId,
      title: "New task",
      description: "",
      durationDays: 1,
      ownerRole: "Unassigned",
      priority: "medium",
      dependsOn: [],
      status: "not-started",
      startOffsetDays: 0
    };
    onChange({ ...roadmap, tasks: [...roadmap.tasks, task], phases: roadmap.phases.map((phase) => ({
      ...phase,
      taskIds: phase.id === phaseId ? [...phase.taskIds, task.id] : phase.taskIds
    })) });
    setSelectedTaskId(task.id);
    setError("");
    setSavedMessage("New task added. Edit its details and save.");
  }

  function addPhase() {
    const title = newPhaseTitle.trim();
    if (!title) return;
    const phase = { id: crypto.randomUUID(), title, goal: "Define the outcome for this phase.", taskIds: [] };
    onChange({ ...roadmap, phases: [...roadmap.phases, phase] });
    setNewPhaseTitle("");
    setSavedMessage("Phase added.");
    setError("");
  }

  function saveTask() {
    if (!draft || !selectedTaskId) return;
    if (!draft.title.trim()) {
      setError("A task needs a title.");
      return;
    }
    const candidate: ProjectRoadmap = {
      ...roadmap,
      tasks: roadmap.tasks.map((task) => task.id === selectedTaskId ? {
        ...task,
        phaseId: draft.phaseId,
        title: draft.title.trim(),
        description: draft.description.trim(),
        durationDays: Math.min(60, Math.max(1, Math.round(draft.durationDays || 1))),
        ownerRole: draft.ownerRole.trim() || "Unassigned",
        priority: draft.priority,
        status: draft.status,
        dependsOn: [...new Set(draft.dependsOn)].filter((id) => id !== selectedTaskId),
        startOffsetDays: Math.max(0, Math.round(draft.startOffsetDays || 0))
      } : task),
      phases: roadmap.phases.map((phase) => ({
        ...phase,
        taskIds: phase.id === draft.phaseId
          ? [...phase.taskIds.filter((id) => id !== selectedTaskId), selectedTaskId]
          : phase.taskIds.filter((id) => id !== selectedTaskId)
      }))
    };
    const validation = calculateRoadmapSchedule(candidate);
    if (validation.hasCycle) {
      setError("These dependencies create a cycle. Remove one of the links before saving.");
      return;
    }
    onChange(candidate);
    setError("");
    setSavedMessage("Task changes saved. Timeline and critical path recalculated.");
  }

  function deleteTask() {
    if (!selectedTask) return;
    const removedId = selectedTask.id;
    const candidate: ProjectRoadmap = {
      ...roadmap,
      tasks: roadmap.tasks.filter((task) => task.id !== removedId).map((task) => ({
        ...task,
        dependsOn: task.dependsOn.filter((id) => id !== removedId)
      })),
      phases: roadmap.phases.map((phase) => ({
        ...phase,
        taskIds: phase.taskIds.filter((id) => id !== removedId)
      })),
      milestones: roadmap.milestones.map((milestone) => ({
        ...milestone,
        afterTaskIds: milestone.afterTaskIds.filter((id) => id !== removedId)
      }))
    };
    onChange(candidate);
    setSelectedTaskId(candidate.tasks[0]?.id ?? "");
    setSavedMessage("Task deleted and related dependency links cleaned up.");
    setError("");
  }

  function toggleDependency(dependencyId: string) {
    if (!draft) return;
    const next = draft.dependsOn.includes(dependencyId)
      ? draft.dependsOn.filter((id) => id !== dependencyId)
      : [...draft.dependsOn, dependencyId];
    updateDraft("dependsOn", next);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain");
    const task = roadmap.tasks.find((entry) => entry.id === taskId);
    if (!task) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
    const requestedDay = Math.round(fraction * timelineDays);
    onChange({
      ...roadmap,
      tasks: roadmap.tasks.map((entry) => entry.id === taskId
        ? { ...entry, startOffsetDays: requestedDay }
        : entry)
    });
    setSelectedTaskId(taskId);
    setSavedMessage("Planned start moved. Dependency rules still prevent a task from starting too early.");
    setError("");
  }

  return (
    <div className="roadmap-workbench">
      <section className="roadmap-pane workbench-editor">
        <div className="roadmap-pane-heading">
          <div><h4>Task & phase editor</h4><p>Edit work, owners, estimates and dependency links.</p></div>
          <button type="button" className="button button-secondary button-small" onClick={addTask}><Plus size={13}/> Add task</button>
        </div>

        <div className="workbench-toolbar">
          <label className="workbench-task-picker">
            <span>SELECT TASK</span>
            <select value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
              <option value="">Choose a task</option>
              {roadmap.phases.map((phase) => (
                <optgroup key={phase.id} label={phase.title}>
                  {roadmap.tasks.filter((task) => task.phaseId === phase.id).map((task) => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="workbench-phase-create">
            <input value={newPhaseTitle} onChange={(event) => setNewPhaseTitle(event.target.value)} placeholder="New phase name" aria-label="New phase name"/>
            <button type="button" className="button button-secondary button-small" onClick={addPhase} disabled={!newPhaseTitle.trim()}><CirclePlus size={13}/> Add phase</button>
          </div>
        </div>

        {draft && selectedTask && (
          <div className="workbench-form">
            <div className="workbench-form-grid">
              <label className="workbench-field workbench-field-wide">Task title
                <input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} maxLength={140}/>
              </label>
              <label className="workbench-field">Phase
                <select value={draft.phaseId} onChange={(event) => updateDraft("phaseId", event.target.value)}>
                  {roadmap.phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.title}</option>)}
                </select>
              </label>
              <label className="workbench-field">Duration · working days
                <input type="number" min={1} max={60} value={draft.durationDays} onChange={(event) => updateDraft("durationDays", Number(event.target.value))}/>
              </label>
              <label className="workbench-field">Owner role
                <input value={draft.ownerRole} onChange={(event) => updateDraft("ownerRole", event.target.value)} maxLength={80}/>
              </label>
              <label className="workbench-field">Priority
                <select value={draft.priority} onChange={(event) => updateDraft("priority", event.target.value as RoadmapPriority)}>
                  <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
              </label>
              <label className="workbench-field">Task status
                <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value as RoadmapTaskStatus)}>
                  <option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="done">Done</option>
                </select>
              </label>
              <label className="workbench-field">Planned start offset · days
                <input type="number" min={0} max={3650} value={draft.startOffsetDays} onChange={(event) => updateDraft("startOffsetDays", Number(event.target.value))}/>
              </label>
              <label className="workbench-field workbench-field-wide">Description
                <textarea rows={2} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} maxLength={1200}/>
              </label>
            </div>

            <div className="workbench-dependency-editor">
              <div><strong>Predecessor tasks</strong><span>Selected tasks must finish before this task can start.</span></div>
              <div className="workbench-dependency-options">
                {roadmap.tasks.filter((task) => task.id !== selectedTaskId).map((task) => (
                  <label key={task.id} className="workbench-dependency-option">
                    <input type="checkbox" checked={draft.dependsOn.includes(task.id)} onChange={() => toggleDependency(task.id)}/>
                    <span>{task.title}<small>{phaseName.get(task.phaseId) ?? "Other phase"}</small></span>
                  </label>
                ))}
                {roadmap.tasks.length <= 1 && <p className="roadmap-muted-empty">Add another task to create dependency links.</p>}
              </div>
            </div>

            <div className="workbench-form-actions">
              <span className="workbench-edit-hint"><Pencil size={12}/> Changes are applied only when saved.</span>
              <div>
                <button type="button" className="button button-danger button-small" onClick={deleteTask}><Trash2 size={13}/> Delete task</button>
                <button type="button" className="button button-primary button-small" onClick={saveTask}><Save size={13}/> Save task</button>
              </div>
            </div>
          </div>
        )}
        {!roadmap.tasks.length && <div className="roadmap-muted-empty">No tasks yet. Add a task to start shaping this execution plan.</div>}
        {error && <div className="roadmap-error workbench-message"><AlertTriangle size={14}/>{error}</div>}
        {savedMessage && !error && <div className="workbench-saved"><Check size={13}/>{savedMessage}</div>}
      </section>

      <section className="roadmap-pane workbench-timeline">
        <div className="roadmap-pane-heading">
          <div><h4>Interactive schedule</h4><p>Drag a task bar across the track to request a different planned start. Dependencies remain enforced.</p></div>
          <span><Clock3 size={12}/> {schedule.totalDurationDays} working days</span>
        </div>
        <div className="workbench-timeline-axis"><span>DAY 1</span><span>DAY {Math.max(1, Math.ceil(timelineDays / 2))}</span><span>DAY {timelineDays}</span></div>
        {schedule.tasks.map((entry) => {
          const left = entry.startDay / timelineDays * 100;
          const width = Math.max(1.7, entry.task.durationDays / timelineDays * 100);
          const finishDate = formatScheduleDate(roadmap.startDate, entry.finishDay - 1);
          return (
            <div className={"workbench-timeline-row " + (selectedTaskId === entry.task.id ? "workbench-row-selected" : "")} key={entry.task.id}>
              <button type="button" className="workbench-timeline-name" onClick={() => setSelectedTaskId(entry.task.id)}>
                <strong>{entry.task.title}</strong>
                <small>{phaseName.get(entry.task.phaseId) ?? "Unassigned phase"}</small>
              </button>
              <div className="workbench-track" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
                <div
                  className={"workbench-bar " + (entry.critical ? "workbench-bar-critical " : "") + (entry.task.status === "done" ? "workbench-bar-done" : "")}
                  style={{ left: left + "%", width: Math.min(100 - left, width) + "%" }}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", entry.task.id)}
                  onClick={() => setSelectedTaskId(entry.task.id)}
                  title="Drag to adjust planned start"
                />
              </div>
              <div className="workbench-date-meta"><strong>{finishDate}</strong><small>{entry.task.durationDays}d · {entry.slackDays}d slack</small></div>
            </div>
          );
        })}
        <div className="workbench-timeline-legend"><span><i className="legend-critical"/> Critical path</span><span><i/> Planned work</span><span><i className="legend-done"/> Completed</span></div>
      </section>
    </div>
  );
}
