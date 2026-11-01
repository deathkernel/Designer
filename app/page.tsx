"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight, Bell, ChevronDown, CircleHelp, Code2,
  Command, Database, FolderKanban, HardDrive, LayoutGrid,
  Plus, Search, Settings2, Table2, Workflow, X, Clock3
} from "lucide-react";
import { SqlDialect } from "@/core/schema/types";
import { useProjectStore } from "@/stores/project-store";

const dialects: { id: SqlDialect; label: string; detail: string }[] = [
  { id: "postgresql", label: "PostgreSQL", detail: "Recommended for relational applications" },
  { id: "mysql", label: "MySQL", detail: "Widely used open-source database" },
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

  const filtered = useMemo(() => projects
    .filter((project) => project.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt), [projects, search]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    const id = createProject(name.trim(), description.trim(), dialect);
    router.push(`/editor/${id}`);
  }

  return (
    <main className="shell pf-dashboard">
      <aside className="sidebar pf-sidebar">
        <a className="brand pf-brand" href="/">
          <span className="brand-symbol"><Database size={18} /></span>
          <span><b>projectforge</b><small>DATABASE WORKSPACE</small></span>
        </a>

        <button className="workspace pf-workspace">
          <span className="workspace-mark">D</span>
          <span><b>Personal workspace</b><small>Local environment</small></span>
          <ChevronDown size={14} />
        </button>

        <div className="nav-caption">WORKSPACE</div>
        <a className="nav active" href="/"><LayoutGrid size={16} />Overview</a>
        <a className="nav" href="#projects"><FolderKanban size={16} />Projects<span className="nav-count">{projects.length}</span></a>

        <div className="nav-caption tool-caption">DESIGN TOOLS</div>
        <a className="nav" href="#projects"><Table2 size={16} />Schema designer</a>
        <a className="nav" href="#projects"><Workflow size={16} />Relationships</a>
        <a className="nav" href="#projects"><Code2 size={16} />SQL generator</a>

        <div className="sidebar-bottom">
          <a className="nav" href="#about"><CircleHelp size={16} />Documentation</a>
          <a className="nav" href="#about"><Settings2 size={16} />Preferences</a>
          <div className="pf-storage">
            <span className="pf-storage-icon"><HardDrive size={15} /></span>
            <span><b>Local storage</b><small>Projects saved in this browser</small></span>
            <i />
          </div>
          <div className="profile pf-profile">
            <span className="profile-mark">S</span>
            <span><b>Personal workspace</b><small>ProjectForge · Phase 1</small></span>
          </div>
        </div>
      </aside>

      <section className="main pf-main">
        <header className="topbar pf-topbar">
          <div className="crumb">Workspace <span>/</span> <b>Overview</b></div>
          <div className="pf-top-actions">
            <label className="pf-global-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects..." /><kbd><Command size={10} /> K</kbd></label>
            <span className="pf-connection"><i /> Local storage ready</span>
            <button className="icon-btn" aria-label="Notifications"><Bell size={16} /></button>
            <span className="user-mark">S</span>
          </div>
        </header>

        <div className="content pf-content">
          <div className="pf-page-title">
            <div>
              <div className="eyebrow">DATABASE WORKSPACE</div>
              <h1>Overview</h1>
              <p>Manage your database projects and continue where you left off.</p>
            </div>
            <button className="primary" onClick={() => setModalOpen(true)}><Plus size={15} /> New project</button>
          </div>

          <section className="pf-metrics" aria-label="Workspace summary">
            <div className="pf-metric"><span>PROJECTS</span><strong>{hydrated ? String(projects.length).padStart(2, "0") : "—"}</strong><small>In this workspace</small></div>
            <div className="pf-metric"><span>SUPPORTED DIALECTS</span><strong>03</strong><small>PostgreSQL, MySQL, SQLite</small></div>
            <div className="pf-metric"><span>WORKSPACE</span><strong className="pf-metric-status"><i /> Local</strong><small>Browser-based storage</small></div>
          </section>

          <section className="pf-project-section" id="projects">
            <div className="pf-section-heading">
              <div><h2>Database projects</h2><p>Your schemas, all in one place.</p></div>
              <div className="pf-project-actions">
                <span>{filtered.length} {filtered.length === 1 ? "PROJECT" : "PROJECTS"}</span>
                <button className="secondary" onClick={() => setModalOpen(true)}><Plus size={14} /> New project</button>
              </div>
            </div>

            <div className="pf-table-wrap">
              <div className="pf-table-head"><span>PROJECT</span><span>DIALECT</span><span>LAST UPDATED</span><span> </span></div>
              {!hydrated ? (
                <div className="pf-table-empty"><span className="pf-loader" /> Loading projects...</div>
              ) : filtered.length ? filtered.map((project) => (
                <button className="pf-project-item" key={project.id} onClick={() => router.push(`/editor/${project.id}`)}>
                  <span className="pf-project-primary">
                    <span className="pf-project-icon"><Database size={17} /></span>
                    <span><b>{project.name}</b><small>{project.description || "No description"}</small></span>
                  </span>
                  <span className="pf-dialect-tag">{project.dialect}</span>
                  <span className="pf-updated"><Clock3 size={13} />{new Date(project.updatedAt).toLocaleDateString()}</span>
                  <span className="pf-open-project"><ArrowUpRight size={16} /></span>
                </button>
              )) : (
                <div className="pf-table-empty pf-no-projects">
                  <span className="pf-empty-icon"><Database size={20} /></span>
                  <b>{search ? "No matching projects" : "No database projects yet"}</b>
                  <p>{search ? "Try another project name." : "Create a project to start designing your first schema."}</p>
                  {!search && <button className="secondary" onClick={() => setModalOpen(true)}><Plus size={14} /> Create project</button>}
                </div>
              )}
            </div>
          </section>

          <section className="pf-start-panel">
            <div className="pf-start-icon"><Workflow size={18} /></div>
            <div><b>Start with a visual schema</b><p>Add tables, define columns and connect relationships in the schema designer.</p></div>
            <button className="pf-text-action" onClick={() => filtered[0] ? router.push(`/editor/${filtered[0].id}`) : setModalOpen(true)}>{filtered.length ? "Open a project" : "Create a project"} <ArrowUpRight size={14} /></button>
          </section>

          <footer id="about"><span>PROJECTFORGE <i>/</i> DATABASE WORKSPACE</span><span>Local-first schema design</span><span>v0.1.0 · Phase 1</span></footer>
        </div>
      </section>

      {modalOpen && (
        <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-top"><div><span className="eyebrow">NEW DATABASE PROJECT</span><h2 id="modal-title">Create a project</h2><p>Set up a workspace for your database schema.</p></div><button className="icon-btn" onClick={() => setModalOpen(false)} aria-label="Close"><X size={18} /></button></div>
            <form onSubmit={submit}>
              <label htmlFor="db-name">PROJECT NAME</label>
              <input id="db-name" className="field" autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Store database" required />
              <label htmlFor="db-description">DESCRIPTION <small>OPTIONAL</small></label>
              <textarea id="db-description" className="field textarea" maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What data will this project manage?" />
              <label>SQL DIALECT</label>
              <div className="dialect-options">{dialects.map((item) => <button type="button" key={item.id} className={dialect === item.id ? "dialect selected" : "dialect"} onClick={() => setDialect(item.id)}><b>{item.label}</b><small>{item.detail}</small></button>)}</div>
              <div className="modal-actions"><button type="button" className="secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary" type="submit" disabled={!name.trim()}>Create project <ArrowUpRight size={15} /></button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
