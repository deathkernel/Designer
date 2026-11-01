"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Check, ChevronRight, Code2, Copy, Database, Download,
  GitBranch, HardDrive, Plus, Settings2,
  ShieldCheck, Table2, Trash2, X, Workflow
} from "lucide-react";
import type { SqlColumn, SqlColumnType, SqlDialect } from "@/core/schema/types";
import { SQL_COLUMN_TYPES } from "@/core/schema/types";
import { generateSql } from "@/core/sql/generate-sql";
import { validateProject } from "@/core/schema/validate";
import { useProjectStore } from "@/stores/project-store";
import SchemaCanvas from "./schema-canvas";

type WorkspaceView = "canvas" | "tables" | "relationships" | "sql" | "validation" | "settings";

const navigation: { group: string; items: { id: WorkspaceView; label: string; icon: typeof Table2 }[] }[] = [
  { group: "DESIGN", items: [
    { id: "canvas", label: "Visual canvas", icon: Workflow },
    { id: "tables", label: "Tables", icon: Table2 },
    { id: "relationships", label: "Relationships", icon: GitBranch }
  ]},
  { group: "DEVELOP", items: [
    { id: "sql", label: "SQL studio", icon: Code2 }
  ]},
  { group: "QUALITY", items: [
    { id: "validation", label: "Schema checks", icon: ShieldCheck }
  ]}
];

const viewCopy: Record<WorkspaceView, { eyebrow: string; title: string; description: string }> = {
  canvas: { eyebrow: "SCHEMA DESIGNER / CANVAS", title: "Visual canvas", description: "Arrange tables and follow the connections between them." },
  tables: { eyebrow: "SCHEMA DESIGNER / TABLES", title: "Tables", description: "Define columns, data types and constraints for each table." },
  relationships: { eyebrow: "SCHEMA DESIGNER / RELATIONSHIPS", title: "Relationships", description: "Connect foreign-key columns to referenced primary or unique keys." },
  sql: { eyebrow: "SQL STUDIO", title: "Generated SQL", description: "Review, copy or export the SQL generated from this schema." },
  validation: { eyebrow: "QUALITY / SCHEMA CHECKS", title: "Schema validation", description: "Review structural issues before exporting your database schema." },
  settings: { eyebrow: "PROJECT", title: "Project settings", description: "Manage the project name, description and SQL dialect." }
};

export default function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const [view, setView] = useState<WorkspaceView>("canvas");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sourceTableId, setSourceTableId] = useState("");
  const [sourceColumnId, setSourceColumnId] = useState("");
  const [targetTableId, setTargetTableId] = useState("");
  const [targetColumnId, setTargetColumnId] = useState("");
  const [onDelete, setOnDelete] = useState<"CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION">("CASCADE");

  const hydrate = useProjectStore((state) => state.hydrate);
  const project = useProjectStore((state) => state.projects.find((item) => item.id === projectId));
  const addTable = useProjectStore((state) => state.addTable);
  const addColumn = useProjectStore((state) => state.addColumn);
  const updateProject = useProjectStore((state) => state.updateProject);
  const updateTable = useProjectStore((state) => state.updateTable);
  const updateColumn = useProjectStore((state) => state.updateColumn);
  const deleteTable = useProjectStore((state) => state.deleteTable);
  const deleteColumn = useProjectStore((state) => state.deleteColumn);
  const addRelation = useProjectStore((state) => state.addRelation);
  const deleteRelation = useProjectStore((state) => state.deleteRelation);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, [hydrate]);

  const sql = useMemo(() => project ? generateSql(project) : "", [project]);
  const issues = useMemo(() => project ? validateProject(project) : [], [project]);
  const selectedTable = project?.tables.find((table) => table.id === selectedTableId) ?? project?.tables[0];
  const sourceTable = project?.tables.find((table) => table.id === sourceTableId) ?? project?.tables[0];
  const targetTable = project?.tables.find((table) => table.id === targetTableId) ?? project?.tables.find((table) => table.id !== sourceTable?.id);
  const sourceColumn = sourceTable?.columns.find((column) => column.id === sourceColumnId) ?? sourceTable?.columns[0];
  const targetColumn = targetTable?.columns.find((column) => column.id === targetColumnId) ?? targetTable?.columns[0];
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  function createTable() {
    if (!project) return;
    addTable(project.id, `table_${project.tables.length + 1}`);
  }

  function createRelation() {
    if (!project || !sourceTable || !targetTable || !sourceColumn || !targetColumn) return;
    if (sourceTable.id === targetTable.id) return;

    addRelation(project.id, {
      name: `fk_${sourceTable.name}_${sourceColumn.name}_${targetTable.name}`,
      sourceTableId: sourceTable.id,
      sourceColumnId: sourceColumn.id,
      targetTableId: targetTable.id,
      targetColumnId: targetColumn.id,
      onDelete
    });
  }

  async function copySql() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadSql() {
    const blob = new Blob([sql], { type: "text/sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project?.name.replace(/[^a-z0-9-_]/gi, "-") || "schema"}.sql`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!hydrated) return <main className="editor-loading">Opening database workspace…</main>;
  if (!project) return (
    <main className="editor-loading">
      <Database size={25} />
      <h2>Project not found</h2>
      <p>This project may have been removed or is saved in another browser.</p>
      <button className="secondary" onClick={() => router.push("/")}>Back to workspace</button>
    </main>
  );

  const page = viewCopy[view];

  return (
    <main className="forge-workspace">
      <header className="forge-topbar">
        <div className="forge-topbar-left">
          <button className="forge-back" onClick={() => router.push("/")} aria-label="Back to dashboard"><ArrowLeft size={15} /></button>
          <span className="forge-brand-mark"><Database size={15} /></span>
          <span className="forge-brand-lockup">
            <strong>ProjectForge</strong>
            <small>DATABASE DESIGN</small>
          </span>
          <span className="forge-top-divider" />
          <label className="forge-project-field">
            <span>PROJECT</span>
            <input
              className="forge-project-name"
              aria-label="Project name"
              value={project.name}
              onChange={(event) => updateProject(project.id, { name: event.target.value })}
            />
          </label>
          <span className="forge-dialect">{project.dialect}</span>
        </div>
        <div className="forge-topbar-right">
          <span className="forge-saved"><Check size={13} /><span><b>Saved</b><small>Locally in this browser</small></span></span>
          <button className="forge-settings-button" onClick={() => setView("settings")}><Settings2 size={14} /> Settings</button>
        </div>
      </header>

      <div className="forge-layout">
        <aside className="forge-nav">
          <div className="forge-nav-project">
            <div className="forge-project-avatar">{project.name.slice(0, 1).toUpperCase()}</div>
            <div className="forge-project-meta"><strong>{project.name}</strong><span>{project.dialect.toUpperCase()} DATABASE</span></div>
            <ChevronRight size={13} />
          </div>

          {navigation.map((section) => (
            <div className="forge-nav-section" key={section.group}>
              <span className="forge-nav-label">{section.group}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={view === item.id ? "forge-nav-item active" : "forge-nav-item"}
                    onClick={() => setView(item.id)}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                    {item.id === "tables" && <small>{project.tables.length}</small>}
                    {item.id === "relationships" && <small>{project.relations.length}</small>}
                    {item.id === "validation" && errorCount > 0 && <i>{errorCount}</i>}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="forge-nav-bottom">
            <button className={view === "settings" ? "forge-nav-item active" : "forge-nav-item"} onClick={() => setView("settings")}>
              <Settings2 size={15} /><span>Project settings</span>
            </button>
            <div className="forge-local-status"><HardDrive size={14} /><span><b>Local workspace</b><small>Stored in this browser</small></span><i /></div>
          </div>
        </aside>

        <section className="forge-main">
          <div className="forge-page-heading">
            <div className="forge-heading-copy">
              <span className="forge-eyebrow">{page.eyebrow}</span>
              <h1>{page.title}</h1>
              <p>{page.description}</p>
              <div className="forge-page-meta">
                <span><i /> {project.tables.length} tables</span>
                <span>{project.relations.length} relationships</span>
                <span>{project.dialect.toUpperCase()}</span>
              </div>
            </div>
            {(view === "canvas" || view === "tables") && (
              <button className="forge-primary" onClick={createTable}><Plus size={15} /> New table</button>
            )}
            {view === "sql" && (
              <div className="forge-heading-actions">
                <button className="forge-secondary" onClick={copySql}><Copy size={14} />{copied ? "Copied" : "Copy SQL"}</button>
                <button className="forge-primary" onClick={downloadSql}><Download size={14} /> Export .sql</button>
              </div>
            )}
          </div>

          {view === "canvas" && (
            <div className="forge-canvas-frame">
              <SchemaCanvas
                project={project}
                onPositionChange={(tableId, position) => updateTable(project.id, tableId, { position })}
                onAddTable={createTable}
                onSelectTable={setSelectedTableId}
              />
              <div className="forge-canvas-footer">
                <span><i /> LIVE SCHEMA</span>
                <span>{project.tables.length} tables <b>·</b> {project.relations.length} relationships</span>
              </div>
            </div>
          )}

          {view === "tables" && (
            <div className="forge-tables-view">
              {project.tables.length ? project.tables.map((table) => (
                <article className="forge-table-editor" key={table.id}>
                  <header>
                    <span className="forge-table-icon"><Table2 size={15} /></span>
                    <input aria-label="Table name" value={table.name} onChange={(event) => updateTable(project.id, table.id, { name: event.target.value })} />
                    <span>{table.columns.length} COLUMNS</span>
                    <button className="forge-icon-danger" title="Delete table" onClick={() => {
                      if (window.confirm(`Delete table "${table.name}"?`)) deleteTable(project.id, table.id);
                    }}><Trash2 size={14} /></button>
                  </header>
                  <div className="forge-column-header"><span>NAME</span><span>DATA TYPE</span><span>CONSTRAINTS</span><span /></div>
                  {table.columns.map((column) => (
                    <ColumnRow
                      key={column.id}
                      column={column}
                      projectId={project.id}
                      tableId={table.id}
                      updateColumn={updateColumn}
                      deleteColumn={deleteColumn}
                    />
                  ))}
                  <button className="forge-add-column" onClick={() => addColumn(project.id, table.id)}><Plus size={13} /> Add column</button>
                </article>
              )) : (
                <div className="forge-empty-state">
                  <span><Table2 size={21} /></span>
                  <h3>No tables yet</h3>
                  <p>Create your first table to start defining the schema.</p>
                  <button className="forge-primary" onClick={createTable}><Plus size={14} /> Create table</button>
                </div>
              )}
            </div>
          )}

          {view === "relationships" && (
            <div className="forge-panel">
              <div className="forge-panel-title"><div><h2>Foreign key connections</h2><p>Choose the source column and the referenced key.</p></div><span>{project.relations.length} TOTAL</span></div>
              {project.tables.length < 2 ? (
                <div className="forge-empty-inline">Create at least two tables before adding a relationship.</div>
              ) : (
                <div className="forge-relation-form">
                  <Field label="SOURCE TABLE">
                    <select value={sourceTable?.id ?? ""} onChange={(event) => { setSourceTableId(event.target.value); setSourceColumnId(""); setTargetTableId(""); setTargetColumnId(""); }}>
                      {project.tables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}
                    </select>
                  </Field>
                  <Field label="SOURCE COLUMN">
                    <select value={sourceColumn?.id ?? ""} onChange={(event) => setSourceColumnId(event.target.value)}>
                      {(sourceTable?.columns ?? []).map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
                    </select>
                  </Field>
                  <div className="forge-relation-arrow"><GitBranch size={17} /></div>
                  <Field label="REFERENCED TABLE">
                    <select value={targetTable?.id ?? ""} onChange={(event) => { setTargetTableId(event.target.value); setTargetColumnId(""); }}>
                      {project.tables.filter((table) => table.id !== sourceTable?.id).map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}
                    </select>
                  </Field>
                  <Field label="REFERENCED COLUMN">
                    <select value={targetColumn?.id ?? ""} onChange={(event) => setTargetColumnId(event.target.value)}>
                      {(targetTable?.columns ?? []).map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
                    </select>
                  </Field>
                  <Field label="ON DELETE">
                    <select value={onDelete} onChange={(event) => setOnDelete(event.target.value as typeof onDelete)}>
                      <option value="CASCADE">CASCADE</option>
                      <option value="RESTRICT">RESTRICT</option>
                      <option value="SET NULL">SET NULL</option>
                      <option value="NO ACTION">NO ACTION</option>
                    </select>
                  </Field>
                  <button className="forge-primary forge-relation-submit" onClick={createRelation} disabled={!sourceColumn || !targetColumn}>
                    <Plus size={14} /> Add relationship
                  </button>
                </div>
              )}

              <div className="forge-relation-list">
                {project.relations.map((relation) => {
                  const fromTable = project.tables.find((table) => table.id === relation.sourceTableId);
                  const toTable = project.tables.find((table) => table.id === relation.targetTableId);
                  const fromColumn = fromTable?.columns.find((column) => column.id === relation.sourceColumnId);
                  const toColumn = toTable?.columns.find((column) => column.id === relation.targetColumnId);
                  return (
                    <div className="forge-relation-row" key={relation.id}>
                      <span className="forge-relation-symbol"><GitBranch size={14} /></span>
                      <div><b>{fromTable?.name}.{fromColumn?.name}</b><small>references</small><b>{toTable?.name}.{toColumn?.name}</b></div>
                      <span className="forge-relation-rule">{relation.onDelete}</span>
                      <button className="forge-icon-danger" title="Delete relationship" onClick={() => deleteRelation(project.id, relation.id)}><X size={14} /></button>
                    </div>
                  );
                })}
                {!project.relations.length && <div className="forge-empty-inline">No relationships yet. Add a foreign key connection above.</div>}
              </div>
            </div>
          )}

          {view === "sql" && (
            <div className="forge-sql-workspace">
              <div className="forge-sql-toolbar"><span><Code2 size={14} /> DDL OUTPUT</span><span>{project.dialect.toUpperCase()}</span></div>
              <pre><SqlHighlight value={sql || "-- Create a table to generate SQL."} /></pre>
            </div>
          )}

          {view === "validation" && (
            <div className="forge-panel">
              <div className="forge-check-summary">
                <div><span>ERRORS</span><strong className={errorCount ? "has-errors" : ""}>{errorCount}</strong></div>
                <div><span>WARNINGS</span><strong>{warningCount}</strong></div>
                <div><span>TOTAL FINDINGS</span><strong>{issues.length}</strong></div>
              </div>
              {issues.length ? issues.map((issue, index) => (
                <div className={`forge-issue ${issue.severity}`} key={index}>
                  <span>{issue.severity === "error" ? "!" : "i"}</span>
                  <div><b>{issue.severity.toUpperCase()}</b><p>{issue.message}</p></div>
                </div>
              )) : (
                <div className="forge-empty-state">
                  <span><ShieldCheck size={22} /></span>
                  <h3>Schema looks good</h3>
                  <p>No validation findings for the current schema.</p>
                </div>
              )}
            </div>
          )}

          {view === "settings" && (
            <div className="forge-panel forge-settings-panel">
              <Field label="PROJECT NAME">
                <input value={project.name} maxLength={80} onChange={(event) => updateProject(project.id, { name: event.target.value })} />
              </Field>
              <Field label="DESCRIPTION">
                <textarea value={project.description} maxLength={240} onChange={(event) => updateProject(project.id, { description: event.target.value })} />
              </Field>
              <Field label="SQL DIALECT">
                <select value={project.dialect} onChange={(event) => updateProject(project.id, { dialect: event.target.value as SqlDialect })}>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </Field>
              <div className="forge-settings-note"><HardDrive size={15} /><span><b>Local-first project</b><small>Project data is stored in this browser using local storage.</small></span></div>
            </div>
          )}
        </section>

        <aside className="forge-inspector">
          <div className="forge-inspector-head"><span>INSPECTOR</span><button title="Project settings" onClick={() => setView("settings")}><Settings2 size={14} /></button></div>
          {selectedTable ? (
            <>
              <div className="forge-inspector-entity"><span><Table2 size={17} /></span><div><b>{selectedTable.name}</b><small>TABLE</small></div></div>
              <div className="forge-inspector-section">
                <span className="forge-inspector-label">OVERVIEW</span>
                <div className="forge-inspector-stat"><span>Columns</span><b>{selectedTable.columns.length}</b></div>
                <div className="forge-inspector-stat"><span>Primary keys</span><b>{selectedTable.columns.filter((column) => column.primaryKey).length}</b></div>
                <div className="forge-inspector-stat"><span>Unique columns</span><b>{selectedTable.columns.filter((column) => column.unique).length}</b></div>
              </div>
              <div className="forge-inspector-section">
                <span className="forge-inspector-label">COLUMNS</span>
                {selectedTable.columns.map((column) => (
                  <div className="forge-inspector-column" key={column.id}>
                    <span>{column.primaryKey ? "⌑" : "·"}</span><b>{column.name}</b><small>{column.type}</small>
                  </div>
                ))}
                <button className="forge-inspector-action" onClick={() => { setView("tables"); }}><Table2 size={13} /> Edit table columns</button>
                <button className="forge-inspector-action" onClick={() => addColumn(project.id, selectedTable.id)}><Plus size={13} /> Add column</button>
              </div>
              <div className="forge-inspector-section">
                <span className="forge-inspector-label">ACTIONS</span>
                <button className="forge-inspector-action" onClick={() => setView("relationships")}><GitBranch size={13} /> Manage relationships</button>
              </div>
            </>
          ) : (
            <div className="forge-inspector-empty"><Database size={19} /><p>Select a table on the canvas to inspect its structure.</p></div>
          )}
          <div className="forge-inspector-footer"><span><i /> PROJECT STATUS</span><b>{errorCount ? "Needs attention" : "Ready for design"}</b><small>{project.tables.length} tables · {project.relations.length} relationships</small></div>
        </aside>
      </div>
    </main>
  );
}


const sqlKeywords = new Set([
  "CREATE", "TABLE", "IF", "NOT", "EXISTS", "ALTER", "DROP", "ADD",
  "INSERT", "INTO", "VALUES", "SELECT", "FROM", "WHERE", "UPDATE",
  "DELETE", "JOIN", "ON", "AS", "AND", "OR", "ORDER", "BY", "GROUP",
  "REFERENCES", "FOREIGN", "CONSTRAINT", "DEFAULT"
]);
const sqlTypes = new Set([
  "INT", "INTEGER", "BIGINT", "SMALLINT", "VARCHAR", "TEXT", "BOOLEAN",
  "DATE", "TIMESTAMP", "DECIMAL", "FLOAT", "UUID", "JSON", "NUMERIC"
]);
const sqlConstraints = new Set([
  "PRIMARY", "KEY", "UNIQUE", "NOT", "NULL", "AUTO_INCREMENT",
  "AUTOINCREMENT", "CASCADE", "RESTRICT", "ACTION", "SET", "TRUE", "FALSE"
]);

function SqlHighlight({ value }: { value: string }) {
  const parts = value.split(/(--[^\n]*|'(?:''|[^'])*'|"(?:""|[^"])*"|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g);

  return (
    <code>
      {parts.map((part, index) => {
        const upper = part.toUpperCase();
        let className = "";

        if (part.startsWith("--")) className = "sql-token-comment";
        else if (part.startsWith("'") || part.startsWith('"')) className = "sql-token-string";
        else if (/^\d/.test(part)) className = "sql-token-number";
        else if (sqlTypes.has(upper)) className = "sql-token-type";
        else if (sqlConstraints.has(upper)) className = "sql-token-constraint";
        else if (sqlKeywords.has(upper)) className = "sql-token-keyword";

        return className
          ? <span className={className} key={index}>{part}</span>
          : part;
      })}
    </code>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="forge-field"><span>{label}</span>{children}</label>;
}

function ColumnRow({ column, projectId, tableId, updateColumn, deleteColumn }: {
  column: SqlColumn;
  projectId: string;
  tableId: string;
  updateColumn: (projectId: string, tableId: string, columnId: string, patch: Partial<SqlColumn>) => void;
  deleteColumn: (projectId: string, tableId: string, columnId: string) => void;
}) {
  return (
    <div className="forge-column-row">
      <input aria-label="Column name" value={column.name} onChange={(event) => updateColumn(projectId, tableId, column.id, { name: event.target.value })} />
      <select aria-label="Column type" value={column.type} onChange={(event) => updateColumn(projectId, tableId, column.id, { type: event.target.value as SqlColumnType })}>
        {SQL_COLUMN_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
      <div className="forge-column-rules">
        <label><input type="checkbox" checked={column.primaryKey} onChange={(event) => updateColumn(projectId, tableId, column.id, { primaryKey: event.target.checked, nullable: event.target.checked ? false : column.nullable })} /> PK</label>
        <label><input type="checkbox" checked={!column.nullable} onChange={(event) => updateColumn(projectId, tableId, column.id, { nullable: !event.target.checked })} /> NN</label>
        <label><input type="checkbox" checked={column.unique} onChange={(event) => updateColumn(projectId, tableId, column.id, { unique: event.target.checked })} /> UQ</label>
      </div>
      <button className="forge-icon-danger" title="Delete column" onClick={() => deleteColumn(projectId, tableId, column.id)}><Trash2 size={13} /></button>
      {column.type === "VARCHAR" && (
        <input className="forge-length" aria-label="VARCHAR length" type="number" min="1" max="65535" value={column.length ?? 255} onChange={(event) => updateColumn(projectId, tableId, column.id, { length: Math.max(1, Number(event.target.value) || 1) })} />
      )}
    </div>
  );
}
