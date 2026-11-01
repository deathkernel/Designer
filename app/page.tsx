"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight, ArrowUpRight, Bot, Boxes, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleHelp, ClipboardList, FolderKanban, Gauge, GitMerge,
  HardDrive, Layers3, ListTodo, Menu, Plus, Search, Send, Settings2,
  ShieldCheck, Sparkles, Target, Trash2, Workflow, X, PlugZap, type LucideIcon
} from "lucide-react";
import { navigation, moduleMeta } from "@/lib/navigation";
import { readProjects, writeProjects } from "@/lib/storage";
import { AiProjectIntake } from "@/components/ai-project-intake";
import { AiRoadmapPlanner } from "@/components/ai-roadmap-planner";
import { ProjectBackup } from "@/components/project-backup";
import type { IntakeAnalysis, ModuleId, PlanningItem, Project, ProjectIntake, ProjectRoadmap, ProjectStatus } from "@/lib/types";

type AiState = "checking" | "ready" | "model-missing" | "offline";
type ChatMessage = { role: "user" | "assistant"; content: string };

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + "m ago";
  if (minutes < 1440) return Math.floor(minutes / 60) + "h ago";
  return Math.floor(minutes / 1440) + "d ago";
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeModule, setActiveModule] = useState<ModuleId>("overview");
  const [expanded, setExpanded] = useState<string[]>(["definition", "execution"]);
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showItemCreate, setShowItemCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("General project");
  const [itemTitle, setItemTitle] = useState("");
  const [itemDetail, setItemDetail] = useState("");
  const [itemSource, setItemSource] = useState("");
  const [itemDestination, setItemDestination] = useState("");
  const [itemTrigger, setItemTrigger] = useState("");
  const [itemTool, setItemTool] = useState("");
  const [itemInput, setItemInput] = useState("");
  const [itemOutput, setItemOutput] = useState("");
  const [itemFailure, setItemFailure] = useState("");
  const [aiState, setAiState] = useState<AiState>("checking");
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState("Summary");
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Tell me what you are planning. I will help clarify the goal, surface missing decisions and turn the idea into a practical plan. I will label assumptions and items that need verification." }
  ]);

  useEffect(() => {
    const saved = readProjects();
    setProjects(saved);
    setActiveProjectId(saved[0]?.id ?? "");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeProjects(projects);
  }, [projects, hydrated]);

  async function refreshAi() {
    setAiState("checking");
    try {
      const response = await fetch("/api/ai/status", { cache: "no-store" });
      const data = await response.json();
      setAiState(!data.connected ? "offline" : data.installed ? "ready" : "model-missing");
    } catch {
      setAiState("offline");
    }
  }

  useEffect(() => { void refreshAi(); }, []);

  const activeProject = projects.find((project) => project.id === activeProjectId);
  const meta = moduleMeta[activeModule];
  const filteredNav = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return navigation;
    return navigation.flatMap((item) => {
      const children = item.children?.filter((child) => child.label.toLowerCase().includes(query));
      if (item.label.toLowerCase().includes(query)) return [item];
      return children?.length ? [{ ...item, children }] : [];
    });
  }, [search]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function chooseModule(id: ModuleId) {
    setActiveModule(id);
    setTab(moduleMeta[id].tabs[0]);
    setMobileNav(false);
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectName.trim()) return;
    const project: Project = {
      id: crypto.randomUUID(), name: projectName.trim(), type: projectType,
      objective: "", status: "Planning", progress: 0, updatedAt: new Date().toISOString(),
      notes: {}, items: []
    };
    setProjects((current) => [project, ...current]);
    setActiveProjectId(project.id);
    setProjectName("");
    setProjectType("General project");
    setShowCreate(false);
    chooseModule("brief");
    notify("Project workspace created");
  }

  function updateProject(patch: Partial<Project>) {
    if (!activeProject) return;
    setProjects((current) => current.map((project) => project.id === activeProject.id
      ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project));
  }

  function addPlanningItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeProject || !itemTitle.trim()) return;
    const item: PlanningItem = {
      id: crypto.randomUUID(), moduleId: activeModule, title: itemTitle.trim(),
      detail: itemDetail.trim(), createdAt: new Date().toISOString(),
      source: itemSource.trim(), destination: itemDestination.trim(),
      trigger: itemTrigger.trim(), tool: itemTool.trim(), input: itemInput.trim(),
      output: itemOutput.trim(), failure: itemFailure.trim()
    };
    updateProject({ items: [item, ...activeProject.items] });
    setShowItemCreate(false);
    setItemTitle(""); setItemDetail(""); setItemSource(""); setItemDestination("");
    setItemTrigger(""); setItemTool(""); setItemInput(""); setItemOutput(""); setItemFailure("");
    notify("Planning item added");
  }

  function removeItem(id: string) {
    if (!activeProject) return;
    updateProject({ items: activeProject.items.filter((item) => item.id !== id) });
    notify("Planning item removed");
  }

  async function sendToPlanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question || chatBusy) return;
    setChatMessages((current) => [...current, { role: "user", content: question }]);
    setChatInput("");
    setChatBusy(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, project: activeProject ?? null, module: meta.title })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The local planning model could not respond.");
      setChatMessages((current) => [...current, { role: "assistant", content: data.response }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reach Ollama.";
      setChatMessages((current) => [...current, { role: "assistant", content: "I could not complete that request. " + message + " Check that Ollama is running and the configured model is installed." }]);
    } finally {
      setChatBusy(false);
    }
  }

  const totalItems = projects.reduce((sum, project) => sum + project.items.length, 0);
  const activeCount = projects.filter((project) => project.status !== "Completed").length;

  return (
    <main className="app-frame">
      <aside className={"sidebar " + (mobileNav ? "sidebar-open" : "")}>
        <div className="brand-row">
          <div className="brand-mark"><Layers3 size={19}/></div>
          <div className="brand-copy"><span>PlanForge</span><small>PROJECT INTELLIGENCE</small></div>
          <button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileNav(false)}><X size={17}/></button>
        </div>
        <div className="workspace-switcher"><div className="workspace-avatar">PF</div><div className="workspace-name"><strong>Personal workspace</strong><span>Local-first planning</span></div><ChevronDown size={15} className="muted-icon"/></div>
        <label className="sidebar-search"><Search size={15}/><input aria-label="Find a feature" placeholder="Find a feature..." value={search} onChange={(event) => setSearch(event.target.value)}/><kbd>/</kbd></label>
        <nav className="primary-nav" aria-label="Workspace navigation">
          {filteredNav.map((item, index) => {
            const Icon = item.icon;
            const hasChildren = Boolean(item.children?.length);
            const open = expanded.includes(item.id) || Boolean(search.trim());
            const selected = activeModule === item.id || item.children?.some((child) => child.id === activeModule);
            const showSection = index === 0 || item.section !== filteredNav[index - 1]?.section;
            return <div className="nav-section-wrap" key={item.id}>
              {showSection && <div className="nav-caption">{item.section}</div>}
              <button className={"nav-item " + (selected ? "nav-parent-active " : "") + (activeModule === item.id ? "nav-active" : "")} onClick={() => hasChildren ? setExpanded((current) => current.includes(item.id) ? current.filter((v) => v !== item.id) : [...current, item.id]) : chooseModule(item.id)}>
                <Icon size={17}/><span>{item.label}</span>{hasChildren && (open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>)}
              </button>
              {hasChildren && open && <div className="nav-children">{item.children!.map((child) => <button key={child.id} className={"nav-child " + (activeModule === child.id ? "nav-child-active" : "")} onClick={() => chooseModule(child.id)}><span className="nav-child-dot"/>{child.label}</button>)}</div>}
            </div>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="ai-mini-card"><div className="ai-mini-top"><span className={"status-dot " + (aiState === "ready" ? "dot-green" : aiState === "offline" ? "dot-muted" : "dot-amber")}/><span>LOCAL AI</span><button aria-label="AI settings" onClick={() => setShowSettings(true)}><Settings2 size={14}/></button></div><strong>Qwen 3.5 · 9B</strong><p>{aiState === "ready" ? "Local model available" : aiState === "model-missing" ? "Ollama online · model missing" : aiState === "checking" ? "Checking Ollama..." : "Ollama not detected"}</p></div>
          <button className="nav-item bottom-link" onClick={() => setShowSettings(true)}><Settings2 size={17}/><span>Settings & connections</span></button>
          <button className="nav-item bottom-link" onClick={() => notify("Help and documentation will be expanded in a later milestone.")}><CircleHelp size={17}/><span>Help & feedback</span></button>
          <div className="profile-row"><div className="profile-avatar">S</div><div className="profile-copy"><strong>Workspace owner</strong><span>Personal workspace</span></div></div>
        </div>
      </aside>

      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
      <section className="main-shell">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{meta.title}</strong></div></div>
          <div className="topbar-actions">
            {projects.length > 0 && <label className="project-picker"><FolderKanban size={15}/><select aria-label="Active project" value={activeProjectId} onChange={(event) => setActiveProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><ChevronDown size={13}/></label>}
            <span className="topbar-divider"/>
            <span className={"top-ai-state " + (aiState === "ready" ? "online" : "")}><i/> {aiState === "ready" ? "Qwen connected" : aiState === "checking" ? "Checking AI" : "AI offline"}</span>
            <button className="icon-button" aria-label="Open settings" onClick={() => setShowSettings(true)}><Settings2 size={17}/></button>
            <button className="topbar-avatar" aria-label="Ask the planner" onClick={() => setShowAssistant(true)}><Bot size={16}/></button>
          </div>
        </header>

        <div className="content-area">
          {activeModule === "overview" ? (
            <Dashboard projects={projects} activeProject={activeProject} aiState={aiState} totalItems={totalItems} activeCount={activeCount} onCreate={() => setShowCreate(true)} onSelect={chooseModule} onOpenProject={(id) => { setActiveProjectId(id); chooseModule("brief"); }} onImportProjects={(imported) => { setProjects((current) => [...imported, ...current]); notify(imported.length + " project(s) restored from backup"); }}/>
          ) : (
            <ModuleWorkspace moduleId={activeModule} project={activeProject} activeTab={tab} onTabChange={setTab} onBack={() => chooseModule("overview")} onCreateItem={() => activeProject ? setShowItemCreate(true) : setShowCreate(true)} onUpdateProject={updateProject} onRemoveItem={removeItem} onAsk={() => setShowAssistant(true)} onGoToBrief={() => chooseModule("brief")}/>
          )}
        </div>
      </section>

      {showCreate && <CreateProjectModal name={projectName} type={projectType} setName={setProjectName} setType={setProjectType} onClose={() => setShowCreate(false)} onSubmit={createProject}/>}
      {showItemCreate && <CreateItemModal moduleId={activeModule} values={{itemTitle,itemDetail,itemSource,itemDestination,itemTrigger,itemTool,itemInput,itemOutput,itemFailure}} setters={{setItemTitle,setItemDetail,setItemSource,setItemDestination,setItemTrigger,setItemTool,setItemInput,setItemOutput,setItemFailure}} onClose={() => setShowItemCreate(false)} onSubmit={addPlanningItem}/>}
      {showSettings && <SettingsModal aiState={aiState} onClose={() => setShowSettings(false)} onRefresh={refreshAi}/>}
      {showAssistant && <AssistantModal project={activeProject} moduleTitle={meta.title} aiState={aiState} messages={chatMessages} input={chatInput} busy={chatBusy} setInput={setChatInput} onClose={() => setShowAssistant(false)} onSubmit={sendToPlanner}/>}
      {toast && <div className="toast"><Check size={15}/>{toast}</div>}
    </main>
  );
}

function Dashboard({ projects, activeProject, aiState, totalItems, activeCount, onCreate, onSelect, onOpenProject, onImportProjects }: {
  projects: Project[]; activeProject?: Project; aiState: AiState; totalItems: number; activeCount: number;
  onCreate: () => void; onSelect: (id: ModuleId) => void; onOpenProject: (id: string) => void; onImportProjects: (projects: Project[]) => void;
}) {
  return <div className="page-wrap">
    <div className="page-heading-row"><div><div className="eyebrow">YOUR PLANNING COMMAND CENTRE</div><h1>Make the complex <span>feel clear.</span></h1><p className="page-intro">Turn any idea into a clear outcome, a realistic plan and confident decisions.</p></div><button className="button button-primary" onClick={onCreate}><Plus size={16}/> New project</button></div>
    <ProjectBackup projects={projects} onImport={onImportProjects}/>
    <section className="hero-panel"><div className="hero-copy"><div className="hero-kicker"><Sparkles size={14}/> PROJECT INTELLIGENCE</div><h2>A better plan starts<br/>with the right questions.</h2><p>Define the outcome, organize the work, and understand people, resources, dependencies and uncertainty before execution begins.</p><div className="hero-actions"><button className="button button-light" onClick={() => onSelect("brief")}>Start planning <ArrowRight size={15}/></button><span className="hero-note"><i className={aiState === "ready" ? "dot-green" : ""}/> {aiState === "ready" ? "Local Qwen is ready" : "Local-first planning workspace"}</span></div></div><div className="hero-visual" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><div className="orbit-core-inner"><Layers3 size={29}/></div></div><div className="orbit-node node-a"><Workflow size={17}/></div><div className="orbit-node node-b"><Boxes size={17}/></div><div className="orbit-node node-c"><ShieldCheck size={17}/></div><div className="orbit-node node-d"><Gauge size={17}/></div><div className="orbit-label label-a">PROJECT MAP</div><div className="orbit-label label-b">DECISIONS</div></div></section>
    <div className="section-heading"><div><h2>Workspace overview</h2><p>Everything important, in one place.</p></div><span className="section-meta">{projects.length} PROJECTS</span></div>
    <div className="metric-grid">
      <Metric icon={FolderKanban} label="Active projects" value={String(activeCount).padStart(2,"0")} hint={projects.length + " total in workspace"} tone="blue"/>
      <Metric icon={ListTodo} label="Planning items" value={String(totalItems).padStart(2,"0")} hint="Across all project modules" tone="purple"/>
      <Metric icon={CalendarDays} label="Planning modules" value="20+" hint="Nested planning workspaces" tone="teal"/>
      <Metric icon={Bot} label="Local AI" value={aiState === "ready" ? "Ready" : aiState === "model-missing" ? "Model?" : "Local"} hint={aiState === "ready" ? "Qwen model detected" : "Ollama can be configured locally"} tone="amber"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel projects-panel"><div className="panel-heading"><div><h3>Projects</h3><p>Your planning workspaces</p></div><button className="icon-button" aria-label="Create a project" onClick={onCreate}><Plus size={17}/></button></div>
        <div className="project-table"><div className="project-table-head"><span>PROJECT</span><span>STATUS</span><span>UPDATED</span></div>
          {projects.map((project) => <button className={"project-row " + (activeProject?.id === project.id ? "project-row-selected" : "")} key={project.id} onClick={() => onOpenProject(project.id)} aria-label={"Open project " + project.name}><span className="project-title-cell"><span className="project-icon"><FolderKanban size={16}/></span><span><strong>{project.name}</strong><small>{project.type}</small></span></span><span><StatusPill status={project.status}/></span><span className="updated-cell">{relativeTime(project.updatedAt)}</span></button>)}
          {projects.length === 0 && <div className="empty-state"><span className="empty-icon"><FolderKanban size={22}/></span><strong>No projects yet</strong><p>Create a workspace to start defining outcomes, scope and the work ahead.</p><button className="button button-secondary" onClick={onCreate}><Plus size={14}/> Create first project</button></div>}
        </div><div className="panel-footer"><span>{projects.length} project{projects.length === 1 ? "" : "s"} in workspace</span><button className="text-button" onClick={onCreate}>Add project <ArrowRight size={14}/></button></div>
      </section>
      <section className="panel start-panel"><div className="panel-heading"><div><h3>Plan a workstream</h3><p>Open a focused planning space</p></div><Target size={16} className="subtle-icon"/></div><div className="quick-list">
        <QuickAction icon={ClipboardList} title="Define the project" description="Objectives, requirements and scope" onClick={() => onSelect("brief")}/>
        <QuickAction icon={GitMerge} title="Break down the work" description="Phases, deliverables and dependencies" onClick={() => onSelect("work-breakdown")}/>
        <QuickAction icon={CalendarDays} title="Plan the schedule" description="Milestones, people and resources" onClick={() => onSelect("timeline")}/>
        <QuickAction icon={ShieldCheck} title="Explore risks" description="Risks, controls and recovery plans" onClick={() => onSelect("risks")}/>
      </div></section>
    </div>
    <section className="next-step-panel"><div className="next-step-icon"><Sparkles size={19}/></div><div className="next-step-copy"><strong>Your next best step</strong><span>{activeProject?.name ? "Add the objective and success criteria for " + activeProject.name + "." : "Create a project and define the outcome you want to achieve."}</span></div><button className="button button-secondary" onClick={() => onSelect("brief")}>Open project brief <ArrowRight size={14}/></button></section>
    <div className="footer-note">PLANFORGE <span>•</span> THINK CLEARLY. PLAN DEEPLY. PLAN WITH CONFIDENCE.</div>
  </div>;
}

function Metric({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: string; hint: string; tone: string }) {
  return <div className="metric-card"><div className={"metric-icon metric-" + tone}><Icon size={17}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-hint">{hint}</div></div>;
}

function QuickAction({ icon: Icon, title, description, onClick }: { icon: LucideIcon; title: string; description: string; onClick: () => void }) {
  return <button className="quick-action" onClick={onClick}><span className="quick-action-icon"><Icon size={17}/></span><span className="quick-action-copy"><strong>{title}</strong><small>{description}</small></span><ArrowUpRight size={15} className="quick-arrow"/></button>;
}

function StatusPill({ status }: { status: ProjectStatus }) {
  const cls = status === "Completed" ? "status-completed" : status === "In progress" ? "status-progress" : status === "On hold" ? "status-hold" : "status-planning";
  return <span className={"status-pill " + cls}><span/>{status}</span>;
}

function ModuleWorkspace({ moduleId, project, activeTab, onTabChange, onBack, onCreateItem, onUpdateProject, onRemoveItem, onAsk, onGoToBrief }: {
  moduleId: ModuleId; project?: Project; activeTab: string; onTabChange: (tab: string) => void; onBack: () => void;
  onCreateItem: () => void; onUpdateProject: (patch: Partial<Project>) => void; onRemoveItem: (id: string) => void; onAsk: () => void; onGoToBrief: () => void;
}) {
  const meta = moduleMeta[moduleId];
  const Icon = meta.icon;
  const items = project?.items.filter((item) => item.moduleId === moduleId) ?? [];
  const notes = project?.notes[moduleId] ?? "";
  return <div className="page-wrap module-page">
    <div className="module-breadcrumb"><button onClick={onBack}>Workspace</button><ChevronRight size={13}/><span>{meta.eyebrow}</span></div>
    <div className="module-heading-row"><div className="module-title-wrap"><div className="module-icon"><Icon size={21}/></div><div><div className="eyebrow">{meta.eyebrow}</div><h1>{meta.title}</h1><p className="page-intro">{meta.description}</p></div></div><button className="button button-secondary" onClick={onAsk}><Sparkles size={15}/> Ask Qwen</button></div>
    <div className="context-strip"><span className="context-project"><FolderKanban size={14}/>{project?.name ?? "No active project"}</span><span className="context-separator"/>{project ? <label className="context-status-control"><span>PROJECT STATUS</span><select value={project.status} onChange={(event) => onUpdateProject({ status: event.target.value as ProjectStatus })}><option>Planning</option><option>In progress</option><option>On hold</option><option>Completed</option></select></label> : <span className="context-draft">Create a project first</span>}<span className="context-separator"/><span className="context-muted">Changes save in this browser</span></div>
    {moduleId !== "roadmap" && <div className="module-tabs" role="tablist">{meta.tabs.map((value) => <button role="tab" aria-selected={activeTab === value} key={value} className={activeTab === value ? "module-tab active-tab" : "module-tab"} onClick={() => onTabChange(value)}>{value}</button>)}</div>}
    {!project ? <div className="panel blank-module"><FolderKanban size={25}/><h3>Create a project first</h3><p>Planning work is attached to a project workspace.</p></div> : moduleId === "roadmap" ? <AiRoadmapPlanner project={project} onSave={(roadmap: ProjectRoadmap) => { const completedTasks = roadmap.tasks.filter((task) => task.status === "done").length; const progress = roadmap.tasks.length ? Math.round((completedTasks / roadmap.tasks.length) * 100) : 0; onUpdateProject({ roadmap, progress, status: progress === 100 && roadmap.tasks.length ? "Completed" : progress > 0 ? "In progress" : project.status === "Completed" ? "Planning" : project.status }); }} onApplyTasks={(newItems: PlanningItem[]) => onUpdateProject({ items: [...project.items, ...newItems] })} onGoToBrief={onGoToBrief}/> : <div className="module-content-grid">
      <section className="panel module-main-panel">
        <div className="panel-heading"><div><h3>{activeTab}</h3><p>{items.length} planning item{items.length === 1 ? "" : "s"} in this section</p></div><button className="button button-secondary button-small" onClick={onCreateItem}><Plus size={14}/> Add item</button></div>
        {moduleId === "brief" && <AiProjectIntake project={project} onSave={(intake: ProjectIntake) => onUpdateProject({ intake, objective: project.objective || intake.analysis.desiredOutcome })} onApplyWorkstreams={(analysis: IntakeAnalysis) => {
          const existing = new Set(project.items.filter((item) => item.moduleId === "work-breakdown").map((item) => item.title.toLowerCase()));
          const proposed = analysis.workstreams.flatMap((stream) => stream.tasks.map((task) => ({
            id: crypto.randomUUID(),
            moduleId: "work-breakdown" as const,
            title: task,
            detail: "Workstream: " + stream.title + (stream.goal ? ". " + stream.goal : ""),
            createdAt: new Date().toISOString()
          }))).filter((item) => !existing.has(item.title.toLowerCase())).slice(0, 30);
          if (!proposed.length) return;
          onUpdateProject({ items: [...project.items, ...proposed] });
        }}/>}
        {moduleId === "brief" && <div className="objective-editor"><label htmlFor="project-objective">PROJECT OBJECTIVE</label><textarea id="project-objective" value={project.objective} onChange={(event) => onUpdateProject({ objective: event.target.value })} placeholder="Describe the need, desired outcome and who benefits..."/></div>}
        <div className="plan-item-list">
          {items.map((item,index) => <article className="plan-item" key={item.id}><div className="plan-item-number">{String(index + 1).padStart(2,"0")}</div><div className="plan-item-body"><div className="plan-item-top"><strong>{item.title}</strong><span className="item-tag">{meta.shortLabel}</span></div>{item.detail && <p>{item.detail}</p>}
            {(item.source || item.destination || item.trigger || item.tool || item.input || item.output || item.failure) && <div className="item-detail-grid">
              {item.source && <span><b>Source</b>{item.source}</span>}{item.destination && <span><b>Destination</b>{item.destination}</span>}
              {item.trigger && <span><b>Trigger</b>{item.trigger}</span>}{item.tool && <span><b>Tool / method</b>{item.tool}</span>}
              {item.input && <span><b>Input</b>{item.input}</span>}{item.output && <span><b>Expected output</b>{item.output}</span>}
              {item.failure && <span><b>Failure / fallback</b>{item.failure}</span>}
            </div>}</div><button className="icon-button remove-item" aria-label={"Remove " + item.title} onClick={() => onRemoveItem(item.id)}><Trash2 size={15}/></button></article>)}
          {!items.length && <div className="empty-module"><div className="empty-icon"><Icon size={20}/></div><strong>No items in this section yet</strong><p>Start with the prompts below or ask Qwen to help structure this part of the plan.</p><button className="button button-secondary button-small" onClick={onCreateItem}><Plus size={14}/> Add first item</button></div>}
        </div>
        <div className="notes-block"><label htmlFor="module-notes">Working notes</label><textarea id="module-notes" value={notes} onChange={(event) => onUpdateProject({ notes: { ...project.notes, [moduleId]: event.target.value } })} placeholder="Capture decisions, assumptions, open questions and evidence..."/><div className="notes-footer"><span><HardDrive size={12}/> Saved locally as you type</span><span>{notes.length} characters</span></div></div>
      </section>
      <aside className="module-side-column">
        <section className="panel side-info-panel"><div className="side-panel-title"><Sparkles size={16}/><strong>Planning prompts</strong></div><p>Use these prompts to make this section specific, measurable and reviewable.</p><div className="prompt-list">{meta.prompts.map((prompt) => <div className="prompt-line" key={prompt}><Check size={13}/>{prompt}</div>)}</div><button className="text-button" onClick={onAsk}>Discuss with Qwen <ArrowUpRight size={13}/></button></section>
        <section className="panel side-info-panel"><div className="side-panel-title"><Gauge size={16}/><strong>Section progress</strong></div><div className="quality-placeholder"><div className="quality-ring"><span>{Math.min(100, items.length * 20)}%</span></div><div><strong>{items.length ? "Plan taking shape" : "Not started"}</strong><small>{items.length ? items.length + " items captured. Review assumptions and evidence." : "Add planning details to make this section reviewable."}</small></div></div><div className="progress-track"><span style={{width: Math.min(100, items.length * 20) + "%"}}/></div></section>
      </aside>
    </div>}
  </div>;
}

function CreateProjectModal({ name, type, setName, setType, onClose, onSubmit }: {
  name: string; type: string; setName: (value:string)=>void; setType: (value:string)=>void; onClose:()=>void; onSubmit:(event:FormEvent<HTMLFormElement>)=>void;
}) {
  const types = ["General project","Business initiative","Software / technology","Research & development","Academic / education","Event / campaign","Operations / process improvement","Marketing / growth","Construction / physical project","Community / nonprofit","Personal project","Other"];
  return <div className="modal-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}><form className="modal-card" onSubmit={onSubmit}>
    <div className="modal-header"><div><div className="eyebrow">NEW WORKSPACE</div><h2>Create a project</h2><p>Start with the outcome. Details can evolve as you plan.</p></div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={18}/></button></div>
    <label className="field-label" htmlFor="project-name">Project name</label><input id="project-name" className="text-input" autoFocus required maxLength={100} value={name} onChange={(event)=>setName(event.target.value)} placeholder="e.g. Community learning programme"/>
    <label className="field-label" htmlFor="project-type">Project type</label><select id="project-type" className="text-input" value={type} onChange={(event)=>setType(event.target.value)}>{types.map((value)=><option key={value}>{value}</option>)}</select>
    <div className="modal-footnote"><ShieldCheck size={14}/> Project information stays in this browser unless you choose an external service.</div>
    <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">Create workspace <ArrowRight size={15}/></button></div>
  </form></div>;
}

function CreateItemModal({ moduleId, values, setters, onClose, onSubmit }: {
  moduleId:ModuleId; values:{itemTitle:string;itemDetail:string;itemSource:string;itemDestination:string;itemTrigger:string;itemTool:string;itemInput:string;itemOutput:string;itemFailure:string};
  setters:{setItemTitle:(v:string)=>void;setItemDetail:(v:string)=>void;setItemSource:(v:string)=>void;setItemDestination:(v:string)=>void;setItemTrigger:(v:string)=>void;setItemTool:(v:string)=>void;setItemInput:(v:string)=>void;setItemOutput:(v:string)=>void;setItemFailure:(v:string)=>void};
  onClose:()=>void; onSubmit:(event:FormEvent<HTMLFormElement>)=>void;
}) {
  const specialist = ["connections","integrations","api-planner","call-flows","data-flows","tool-selection","architecture","components"].includes(moduleId);
  return <div className="modal-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}><form className="modal-card item-modal" onSubmit={onSubmit}>
    <div className="modal-header"><div><div className="eyebrow">{moduleMeta[moduleId].eyebrow}</div><h2>Add planning item</h2><p>Capture a defined piece of work or a design decision.</p></div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={18}/></button></div>
    <label className="field-label" htmlFor="item-title">Title</label><input id="item-title" className="text-input" autoFocus required value={values.itemTitle} onChange={(event)=>setters.setItemTitle(event.target.value)} placeholder="Give this item a clear name"/>
    <label className="field-label" htmlFor="item-detail">Description / rationale</label><textarea id="item-detail" className="text-input text-area" value={values.itemDetail} onChange={(event)=>setters.setItemDetail(event.target.value)} placeholder="What needs to happen, why, and how will success be recognized?"/>
    {specialist && <><div className="form-divider">CONNECTION & EXECUTION DETAILS <span>Fill in what applies</span></div><div className="form-grid">
      <label className="field-label">Source<input className="text-input" value={values.itemSource} onChange={(e)=>setters.setItemSource(e.target.value)} placeholder="Person, system, activity"/></label>
      <label className="field-label">Destination<input className="text-input" value={values.itemDestination} onChange={(e)=>setters.setItemDestination(e.target.value)} placeholder="Recipient or target"/></label>
      <label className="field-label">Trigger<input className="text-input" value={values.itemTrigger} onChange={(e)=>setters.setItemTrigger(e.target.value)} placeholder="When does it happen?"/></label>
      <label className="field-label">Tool / method<input className="text-input" value={values.itemTool} onChange={(e)=>setters.setItemTool(e.target.value)} placeholder="Tool, API, process or channel"/></label>
      <label className="field-label">Input<textarea className="text-input text-area small-area" value={values.itemInput} onChange={(e)=>setters.setItemInput(e.target.value)} placeholder="Data or material sent"/></label>
      <label className="field-label">Expected output<textarea className="text-input text-area small-area" value={values.itemOutput} onChange={(e)=>setters.setItemOutput(e.target.value)} placeholder="Expected result or response"/></label>
      <label className="field-label full-field">Failure / fallback<textarea className="text-input text-area small-area" value={values.itemFailure} onChange={(e)=>setters.setItemFailure(e.target.value)} placeholder="What can fail and what happens next?"/></label>
    </div></>}
    <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">Add to plan <ArrowRight size={15}/></button></div>
  </form></div>;
}

function SettingsModal({aiState,onClose,onRefresh}:{aiState:AiState;onClose:()=>void;onRefresh:()=>void}) {
  return <div className="modal-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}><div className="modal-card settings-modal">
    <div className="modal-header"><div><div className="eyebrow">WORKSPACE CONFIGURATION</div><h2>Settings & connections</h2><p>Configure local planning intelligence and future integrations.</p></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18}/></button></div>
    <div className="setting-section"><div className="setting-heading"><div className="setting-icon"><Bot size={17}/></div><div><strong>Local AI · Ollama</strong><span>Private planning and reasoning runtime</span></div><span className={"setting-state " + (aiState==="ready"?"state-connected":"state-offline")}>{aiState==="ready"?"Model ready":aiState==="model-missing"?"Model not found":aiState==="checking"?"Checking":"Offline"}</span></div>
      <div className="setting-value-row"><span>Endpoint</span><code>http://127.0.0.1:11434</code></div><div className="setting-value-row"><span>Model</span><code>hf.co/bartowski/Qwen_Qwen3.5-9B-GGUF:Q6_K</code></div><div className="setting-actions"><button className="button button-secondary button-small" onClick={onRefresh}>Test connection</button><span className="setting-help">Configure overrides in .env.local</span></div></div>
    <div className="setting-section"><div className="setting-heading"><div className="setting-icon setting-icon-blue"><PlugZap size={17}/></div><div><strong>Public API registry</strong><span>External services are selected per project need</span></div><span className="setting-state state-planned">On demand</span></div><p className="setting-description">Before an external service is recommended, record official documentation, authentication, permissions, rate limits, current cost, data handling, licensing and fallback. This foundation does not call public APIs automatically.</p></div>
    <div className="modal-actions"><button className="button button-primary" onClick={onClose}>Done</button></div>
  </div></div>;
}

function AssistantModal({project,moduleTitle,aiState,messages,input,busy,setInput,onClose,onSubmit}:{project?:Project;moduleTitle:string;aiState:AiState;messages:ChatMessage[];input:string;busy:boolean;setInput:(value:string)=>void;onClose:()=>void;onSubmit:(event:FormEvent<HTMLFormElement>)=>void}) {
  return <div className="modal-backdrop assistant-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}><section className="assistant-panel">
    <div className="assistant-header"><div className="assistant-avatar"><Bot size={19}/></div><div><strong>PlanForge AI Planner</strong><span><i className={aiState==="ready"?"dot-green":""}/> {aiState==="ready"?"Qwen 3.5 · Local":"Ollama connection required"}</span></div><button className="icon-button" aria-label="Close assistant" onClick={onClose}><X size={18}/></button></div>
    <div className="assistant-context"><span>{project?.name??"No project selected"}</span><span>{moduleTitle}</span></div>
    <div className="chat-messages">{messages.map((message,index)=><div key={index} className={"chat-message "+message.role}><div className="chat-role">{message.role==="assistant"?"PLANFORGE":"YOU"}</div><p>{message.content}</p></div>)}{busy&&<div className="chat-message assistant"><div className="chat-role">PLANFORGE</div><p className="typing">Thinking through the plan…</p></div>}</div>
    <form className="chat-form" onSubmit={onSubmit}><textarea value={input} onChange={(event)=>setInput(event.target.value)} placeholder="Ask about scope, architecture, connections, risks, tools or next steps…" rows={2}/><button className="button button-primary" type="submit" disabled={!input.trim()||busy}><Send size={15}/> Send</button></form>
    <div className="chat-footnote">Local model · Review recommendations before acting. Verify assumptions and external facts.</div>
  </section></div>;
}
