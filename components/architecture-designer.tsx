"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft, Boxes, Braces, Cable, ChevronRight, GitBranch, Layers3,
  Network, PlugZap, Workflow, Wrench, Sparkles, ShieldCheck, CircleHelp
} from "lucide-react";
import { PlanningStudio } from "@/components/planning-studio";
import { moduleMeta } from "@/lib/navigation";
import type { ModuleId, PlanningItem, Project } from "@/lib/types";

type ArchitectureModuleId =
  | "architecture"
  | "components"
  | "connections"
  | "data-flows"
  | "integrations"
  | "api-planner"
  | "call-flows"
  | "tool-selection";

type Props = {
  project?: Project;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onBack: () => void;
  onAsk: () => void;
  onUpdateProject: (patch: Partial<Project>) => void;
  onRemoveItem: (id: string) => void;
};

const groups: Array<{ title: string; entries: Array<{ id: ArchitectureModuleId; label: string; icon: typeof Network; description: string }> }> = [
  {
    title: "SYSTEM BLUEPRINT",
    entries: [
      { id: "architecture", label: "Architecture map", icon: Network, description: "Map the system boundary, major areas and responsibilities." },
      { id: "components", label: "Components", icon: Boxes, description: "Break the system into parts with clear inputs, outputs and ownership." }
    ]
  },
  {
    title: "RELATIONSHIPS",
    entries: [
      { id: "connections", label: "Connections", icon: Cable, description: "Design how components, people and services hand work to one another." },
      { id: "data-flows", label: "Information flows", icon: Workflow, description: "Trace information, events and payloads through the system." }
    ]
  },
  {
    title: "INTEGRATIONS",
    entries: [
      { id: "integrations", label: "Integration overview", icon: PlugZap, description: "Plan external services, vendors, platforms and boundaries." },
      { id: "api-planner", label: "API planner", icon: Braces, description: "Define operations, endpoints, contracts and API behaviour." },
      { id: "call-flows", label: "Call sequences", icon: GitBranch, description: "Plan triggers, call order, branches, retries and fallbacks." },
      { id: "tool-selection", label: "Tool selection", icon: Wrench, description: "Compare tools and services before committing to an option." }
    ]
  }
];

export function ArchitectureDesigner({
  project, projects, activeProjectId, onSelectProject, onBack, onAsk, onUpdateProject, onRemoveItem
}: Props) {
  const [activeSection, setActiveSection] = useState<ArchitectureModuleId>("architecture");
  const currentProject = project;
  const currentMeta = moduleMeta[activeSection];
  const items = useMemo(
    () => currentProject?.items.filter((item) => item.moduleId === activeSection) ?? [],
    [currentProject, activeSection]
  );
  const notes = currentProject?.notes[activeSection] ?? "";

  function addItem(title: string, detail: string, metadata: Record<string, string | number | boolean>) {
    if (!currentProject || !title.trim()) return;
    const item: PlanningItem = {
      id: crypto.randomUUID(),
      moduleId: activeSection as ModuleId,
      title: title.trim(),
      detail,
      createdAt: new Date().toISOString(),
      metadata
    };
    onUpdateProject({ items: [...currentProject.items, item] });
  }

  function updateItem(id: string, patch: Partial<PlanningItem>) {
    if (!currentProject) return;
    onUpdateProject({
      items: currentProject.items.map((item) => item.id === id ? { ...item, ...patch } : item)
    });
  }

  const activeEntry = groups.flatMap((group) => group.entries).find((entry) => entry.id === activeSection);

  return <div className="architecture-page">
    <header className="architecture-topbar">
      <div className="architecture-topbar-brand">
        <button type="button" className="architecture-back-button" onClick={onBack}><ArrowLeft size={15}/> PlanForge</button>
        <span className="architecture-topbar-divider"/>
        <div className="architecture-brand-mark"><Network size={17}/></div>
        <div className="architecture-brand-copy"><span>ARCHITECTURE DESIGNER</span><strong>Independent design workspace</strong></div>
      </div>
      <div className="architecture-topbar-actions">
        {projects.length > 0 && <label className="architecture-project-select"><span>PROJECT</span><select value={activeProjectId} onChange={(event) => onSelectProject(event.target.value)}>{projects.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>}
        <span className="architecture-save-indicator"><i/> LOCAL PROJECT</span>
        <button type="button" className="architecture-ask-button" onClick={onAsk}><Sparkles size={14}/> Ask Qwen</button>
      </div>
    </header>

    {!currentProject ? <div className="architecture-no-project">
      <div className="architecture-empty-icon"><Network size={28}/></div>
      <span>ARCHITECTURE DESIGNER</span>
      <h1>Select a project to begin</h1>
      <p>Architecture maps, components, connections and integration plans are stored inside the selected project, but designed in this separate workspace.</p>
      <button type="button" className="architecture-return-button" onClick={onBack}>Back to project workspace <ChevronRight size={14}/></button>
    </div> : <div className="architecture-layout">
      <aside className="architecture-sidebar">
        <div className="architecture-sidebar-project"><span>DESIGNING FOR</span><strong>{currentProject.name}</strong><small>{currentProject.type}</small></div>
        {groups.map((group) => <div className="architecture-nav-group" key={group.title}>
          <div className="architecture-nav-caption">{group.title}</div>
          {group.entries.map((entry) => {
            const Icon = entry.icon;
            const count = currentProject.items.filter((item) => item.moduleId === entry.id).length;
            return <button type="button" key={entry.id} className={"architecture-nav-item " + (activeSection === entry.id ? "active" : "")} onClick={() => setActiveSection(entry.id)}>
              <Icon size={15}/><span>{entry.label}</span><small>{count}</small>
            </button>;
          })}
        </div>)}
        <div className="architecture-sidebar-bottom">
          <div><ShieldCheck size={14}/><span>Project data stays local</span></div>
          <button type="button" onClick={onAsk}><CircleHelp size={13}/> Discuss architecture</button>
        </div>
      </aside>

      <main className="architecture-main">
        <div className="architecture-section-heading">
          <div className="architecture-breadcrumb"><span>ARCHITECTURE DESIGNER</span><ChevronRight size={12}/><strong>{activeEntry?.label ?? "Architecture map"}</strong></div>
          <div className="architecture-section-title-row">
            <div><h1>{activeEntry?.label ?? "Architecture map"}</h1><p>{activeEntry?.description ?? currentMeta.description}</p></div>
            <div className="architecture-section-count"><strong>{items.length}</strong><span>ITEMS</span></div>
          </div>
        </div>
        <div className="architecture-editor-frame">
          <PlanningStudio
            moduleId={activeSection}
            items={items}
            notes={notes}
            onNotesChange={(value) => onUpdateProject({ notes: { ...currentProject.notes, [activeSection]: value } })}
            onAdd={addItem}
            onUpdate={updateItem}
            onRemove={onRemoveItem}
            onOpenRoadmap={() => setActiveSection("architecture")}
          />
        </div>
      </main>

      <aside className="architecture-inspector">
        <div className="architecture-inspector-heading"><span>DESIGN GUIDANCE</span><strong>{activeEntry?.label ?? "Architecture map"}</strong></div>
        <p>{currentMeta.description}</p>
        <div className="architecture-guidance-list">{currentMeta.prompts.map((prompt, index) => <div key={prompt}><span>{String(index + 1).padStart(2, "0")}</span>{prompt}</div>)}</div>
        <div className="architecture-inspector-stats"><strong>{currentProject.items.filter((item) => groups.flatMap((group) => group.entries).some((entry) => entry.id === item.moduleId)).length}</strong><span>ARCHITECTURE RECORDS<br/>IN THIS PROJECT</span></div>
      </aside>
    </div>}
  </div>;
}
