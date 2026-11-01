"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Bell, ChevronDown, CircleHelp, Code2, Database,
  FolderKanban, LayoutGrid, Plus, Search, Settings2, Table2,
  Workflow, X, Command, HardDrive, Clock3
} from "lucide-react";
import { SqlDialect } from "@/core/schema/types";
import { useProjectStore } from "@/stores/project-store";

const dialects: { id: SqlDialect; label: string; detail: string }[] = [
  { id: "postgresql", label: "PostgreSQL", detail: "Recommended for this MVP" },
  { id: "mysql", label: "MySQL", detail: "Popular relational database" },
  { id: "sqlite", label: "SQLite", detail: "Lightweight embedded database" }
];

export default function Dashboard() {
  const router = useRouter();
  const projects = useProjectStore((state) => state.projects);
  const hydrate = useProjectStore((state) => state.hydrate);
  const createProject = useProjectStore((state) => state.createProject);
  const hydrated = useProjectStore((state) => state.hydrated);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dialect, setDialect] = useState<SqlDialect>("postgresql");

  useEffect(() => { hydrate(); }, [hydrate]);

  const filtered = useMemo(() => projects.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase())
  ), [projects, search]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    const id = createProject(name.trim(), description.trim(), dialect);
    router.push(`/editor/${id}`);
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="/"><span className="brand-symbol"><Database size={19}/></span><span><b>projectforge</b><small>SQL DESIGN STUDIO</small></span></a>
        <div className="workspace"><span className="workspace-mark">D</span><span><b>Personal workspace</b><small>Local workspace</small></span><ChevronDown size={15}/></div>
        <div className="nav-caption">WORKSPACE</div>
        <a className="nav active" href="/"><LayoutGrid size={17}/>Overview</a>
        <a className="nav" href="#projects"><FolderKanban size={17}/>Database projects <span className="nav-count">{projects.length}</span></a>
        <div className="nav-caption tool-caption">SQL TOOLKIT</div>
        <a className="nav" href="#projects"><Table2 size={17}/>Schema designer</a>
        <a className="nav" href="#projects"><Workflow size={17}/>Relationships</a>
        <a className="nav" href="#projects"><Code2 size={17}/>SQL generator</a>
        <div className="sidebar-bottom">
          <a className="nav" href="#about"><CircleHelp size={17}/>About ProjectForge</a>
          <a className="nav" href="#about"><Settings2 size={17}/>Preferences</a>
          <div className="local-card"><HardDrive size={15}/><span><b>Local-first storage</b><small>Your projects stay in this browser.</small></span></div>
          <div className="profile"><span className="profile-mark">S</span><span><b>My workspace</b><small>ProjectForge · Phase 1</small></span></div>
        </div>
      </aside>

      <section className="main">
        <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>Overview</b></div><div className="top-actions"><span className="saved-indicator"><i/> Local storage ready</span><button className="icon-btn" aria-label="Notifications"><Bell size={17}/></button><span className="user-mark">S</span></div></header>
        <div className="content">
          <div className="heading-row"><div><div className="eyebrow">DATABASE DESIGN WORKSPACE</div><h1>Model your data.<br/><em>Before you query.</em></h1><p>Design relational schemas visually and turn them into production-ready SQL.</p></div><button className="primary" onClick={() => setModalOpen(true)}><Plus size={17}/> New database</button></div>

          <section className="hero"><div className="hero-copy"><span className="hero-label"><Database size={13}/> PHASE 01 · SQL DESIGNER</span><h2>Your database,<br/>designed with <i>clarity.</i></h2><p>Create tables, define columns, connect relationships and generate SQL — all in one focused workspace.</p><button className="hero-cta" onClick={() => setModalOpen(true)}>Start designing <ArrowRight size={16}/></button><div className="hero-note"><span/> No account required · No AI · No API costs</div></div><div className="schema-art" aria-hidden="true"><div className="schema-glow"/><div className="schema-line line-a"/><div className="schema-line line-b"/><div className="schema-line line-c"/><div className="schema-card card-a"><div className="schema-card-head"><Table2 size={13}/> users</div><span>🔑 id <small>INT</small></span><span>name <small>VARCHAR</small></span><span>email <small>VARCHAR</small></span></div><div className="schema-card card-b"><div className="schema-card-head"><Table2 size={13}/> orders</div><span>🔑 id <small>INT</small></span><span>user_id <small>INT</small></span><span>total <small>DECIMAL</small></span></div><div className="schema-card card-c"><div className="schema-card-head"><Table2 size={13}/> products</div><span>🔑 id <small>INT</small></span><span>title <small>VARCHAR</small></span></div><div className="schema-center"><Database size={20}/></div><span className="art-caption">RELATIONAL DATA MODEL</span></div></section>

          <section className="stats"><div><span>DATABASE PROJECTS</span><b>{hydrated ? String(projects.length).padStart(2,"0") : "—"}</b><small>Saved in this browser</small></div><div><span>SQL DIALECTS</span><b>03</b><small>PostgreSQL · MySQL · SQLite</small></div><div><span>DESIGN MODE</span><b className="mode-value">Visual + SQL</b><small>Schema and code together</small></div></section>

          <section className="projects" id="projects"><div className="section-head"><div><span className="eyebrow">YOUR DATABASES</span><h3>Recent projects</h3><p>Continue designing your data models.</p></div><div className="project-controls"><label className="search"><Search size={15}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search databases"/></label><button className="secondary" onClick={()=>setModalOpen(true)}><Plus size={15}/> New</button></div></div>
            {!hydrated ? <div className="empty"><div className="empty-symbol"><Database size={22}/></div><h4>Loading your workspace</h4><p>Checking locally saved database projects.</p></div> : filtered.length ? <div className="project-list">{filtered.map((project)=> <button className="project-row" key={project.id} onClick={()=>router.push(`/editor/${project.id}`)}><span className="project-icon"><Database size={19}/></span><span className="project-name"><b>{project.name}</b><small>{project.description || "No description added"}</small></span><span className="project-dialect">{project.dialect}</span><span className="project-meta"><Clock3 size={13}/>{new Date(project.updatedAt).toLocaleDateString()}</span><ArrowRight size={16}/></button>)}</div> : <div className="empty"><div className="empty-symbol"><Database size={22}/></div><h4>{search ? "No matching databases" : "Your first schema starts here."}</h4><p>{search ? "Try a different project name." : "Create a database project and start adding tables."}</p>{!search && <button className="secondary" onClick={()=>setModalOpen(true)}><Plus size={15}/> Create database</button>}</div>}
          </section>
          <footer id="about"><span>PROJECTFORGE <i>/</i> SQL DESIGN STUDIO</span><span>Built for thoughtful data design.</span><span>v0.1.0 · Phase 1</span></footer>
        </div>
      </section>

      {modalOpen && <div className="overlay" onMouseDown={(event)=>{if(event.target===event.currentTarget)setModalOpen(false);}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><div><span className="eyebrow">NEW DATABASE PROJECT</span><h2 id="modal-title">Start with your schema.</h2><p>Create a workspace for your database design.</p></div><button className="icon-btn" onClick={()=>setModalOpen(false)} aria-label="Close"><X size={18}/></button></div><form onSubmit={submit}><label htmlFor="db-name">PROJECT NAME</label><input id="db-name" className="field" autoFocus maxLength={80} value={name} onChange={(event)=>setName(event.target.value)} placeholder="e.g. Store database" required/><label htmlFor="db-description">DESCRIPTION <small>OPTIONAL</small></label><textarea id="db-description" className="field textarea" maxLength={240} value={description} onChange={(event)=>setDescription(event.target.value)} placeholder="What data will this project manage?"/><label>SQL DIALECT</label><div className="dialect-options">{dialects.map((item)=><button type="button" key={item.id} className={dialect===item.id?"dialect selected":"dialect"} onClick={()=>setDialect(item.id)}><b>{item.label}</b><small>{item.detail}</small></button>)}</div><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModalOpen(false)}>Cancel</button><button className="primary" type="submit" disabled={!name.trim()}>Create project <ArrowRight size={15}/></button></div></form></section></div>}
      <div className="toast-space" aria-hidden="true"/>
    </main>
  );
}
