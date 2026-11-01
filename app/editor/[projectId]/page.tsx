"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Check, Code2, Copy, Database, Download,
  MoreHorizontal, Plus, Settings2, Table2, Trash2, GitBranch, X
} from "lucide-react";
import { SqlColumn, SqlColumnType } from "@/core/schema/types";
import { generateSql } from "@/core/sql/generate-sql";
import { validateProject } from "@/core/schema/validate";
import { SQL_COLUMN_TYPES } from "@/core/schema/types";
import { useProjectStore } from "@/stores/project-store";
import SchemaCanvas from "./schema-canvas";

export default function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<"schema" | "sql">("schema");
  const [schemaView, setSchemaView] = useState<"tables" | "diagram">("tables");
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
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

  useEffect(() => { hydrate(); setHydrated(true); }, [hydrate]);
  const sql = useMemo(() => project ? generateSql(project) : "", [project]);
  const issues = useMemo(() => project ? validateProject(project) : [], [project]);
  const sourceTable = project?.tables.find((table) => table.id === sourceTableId) ?? project?.tables[0];
  const targetTable = project?.tables.find((table) => table.id === targetTableId) ?? project?.tables.find((table) => table.id !== sourceTable?.id);
  const sourceColumn = sourceTable?.columns.find((column) => column.id === sourceColumnId) ?? sourceTable?.columns[0];
  const targetColumn = targetTable?.columns.find((column) => column.id === targetColumnId) ?? targetTable?.columns[0];

  function createRelation() {
    if (!project || !sourceTable || !targetTable || !sourceColumn || !targetColumn) return;
    if (sourceTable.id === targetTable.id) return;
    const relationName = `fk_${sourceTable.name}_${sourceColumn.name}_${targetTable.name}`;
    addRelation(project.id, {
      name: relationName,
      sourceTableId: sourceTable.id,
      sourceColumnId: sourceColumn.id,
      targetTableId: targetTable.id,
      targetColumnId: targetColumn.id,
      onDelete
    });
    setSourceTableId(sourceTable.id);
    setSourceColumnId(sourceColumn.id);
    setTargetTableId(targetTable.id);
    setTargetColumnId(targetColumn.id);
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
  if (!project) return <main className="editor-loading"><Database size={25}/><h2>Project not found</h2><p>This project may have been removed or is saved in another browser.</p><button className="secondary" onClick={()=>router.push("/")}>Back to workspace</button></main>;

  return <main className="editor-shell">
    <header className="editor-topbar"><button className="back-button" onClick={()=>router.push("/")}><ArrowLeft size={16}/> Workspace</button><span className="editor-divider">/</span><div className="editor-project"><Database size={16}/><input aria-label="Project name" value={project.name} onChange={(event)=>updateProject(project.id,{name:event.target.value})}/></div><span className="dialect-badge">{project.dialect}</span><span className="save-state"><Check size={13}/> Saved locally</span><button className="editor-icon" aria-label="Project options"><MoreHorizontal size={18}/></button></header>
    <div className="editor-body">
      <aside className="editor-sidebar"><span className="editor-side-title">DATABASE</span><button className="editor-side-item active"><Table2 size={16}/>Tables <b>{project.tables.length}</b></button><button className="editor-side-item" onClick={()=>setTab("schema")}><Settings2 size={16}/>Schema settings</button><div className="editor-side-bottom"><span>SQL DIALECT</span><b>{project.dialect}</b><small>Phase 1 · Simple SQL designer</small></div></aside>
      <section className="editor-content">
        <div className="editor-heading"><div><span className="eyebrow">SCHEMA WORKSPACE</span><h1>{project.name}</h1><p>{project.description || "Define your tables, columns and relationships."}</p></div><button className="primary" onClick={()=>{const tableName=`table_${project.tables.length+1}`;addTable(project.id,tableName);}}><Plus size={16}/> Add table</button></div>
        <div className="editor-tabs"><button className={tab==="schema"?"active":""} onClick={()=>setTab("schema")}><Table2 size={15}/> Schema designer</button><button className={tab==="schema" && schemaView==="diagram"?"active":""} onClick={()=>{setTab("schema");setSchemaView("diagram");}}><GitBranch size={15}/> Diagram</button><button className={tab==="sql"?"active":""} onClick={()=>setTab("sql")}><Code2 size={15}/> SQL preview</button><span className="tab-spacer"/><span className="table-count">{project.tables.length} TABLES</span></div>
        {tab==="schema" ? (schemaView === "diagram" ? <SchemaCanvas project={project} onPositionChange={(tableId,position)=>updateTable(project.id,tableId,{position})}/> : <div className="schema-workspace"><div className="schema-toolbar"><span>TABLES <b>{project.tables.length}</b></span><button className="mini-action" onClick={()=>addTable(project.id,`table_${project.tables.length+1}`)}><Plus size={14}/> Add table</button></div>{project.tables.length ? <div className="table-grid">{project.tables.map((table)=><article className="table-card" key={table.id}><div className="table-card-head"><span className="table-title-icon"><Table2 size={15}/></span><input aria-label="Table name" value={table.name} onChange={(event)=>updateTable(project.id,table.id,{name:event.target.value})}/><button title="Delete table" className="delete-btn" onClick={()=>{if(window.confirm(`Delete table "${table.name}"?`))deleteTable(project.id,table.id);}}><Trash2 size={14}/></button></div><div className="column-head"><span>COLUMN</span><span>TYPE</span><span>RULES</span><span/></div>{table.columns.map((column)=><ColumnRow key={column.id} column={column} projectId={project.id} tableId={table.id} updateColumn={updateColumn} deleteColumn={deleteColumn}/>) }<button className="add-column" onClick={()=>addColumn(project.id,table.id)}><Plus size={14}/> Add column</button></article>)}</div> : <div className="schema-empty"><div><Database size={27}/></div><h3>No tables yet</h3><p>Add your first table to begin designing the database schema.</p><button className="primary" onClick={()=>addTable(project.id,"users")}><Plus size={15}/> Create first table</button></div>}</div>) : <div className="sql-panel"><div className="sql-panel-head"><div><b>Generated SQL</b><span>DDL · {project.dialect.toUpperCase()}</span></div><div><button className="secondary" onClick={copySql}><Copy size={14}/>{copied?"Copied":"Copy SQL"}</button><button className="primary" onClick={downloadSql}><Download size={14}/> Download .sql</button></div></div><pre className="sql-code"><code>{sql || "-- Add a table to generate SQL."}</code></pre></div>}
        <section className="relations-panel">
          <div className="relations-heading">
            <div><span className="eyebrow">FOREIGN KEYS</span><h2>Table relationships</h2><p>Connect a column in one table to a referenced column in another.</p></div>
            <span className="relation-count">{project.relations.length} RELATIONSHIPS</span>
          </div>
          {project.tables.length < 2 ? <div className="relation-empty">Add at least two tables to create a relationship.</div> : <>
            <div className="relation-builder">
              <div className="relation-field"><label>FROM TABLE</label><select value={sourceTable?.id ?? ""} onChange={(event)=>{setSourceTableId(event.target.value);setSourceColumnId("");setTargetTableId("");setTargetColumnId("");}}>{project.tables.map((table)=><option key={table.id} value={table.id}>{table.name}</option>)}</select></div>
              <div className="relation-field"><label>FOREIGN KEY COLUMN</label><select value={sourceColumn?.id ?? ""} onChange={(event)=>setSourceColumnId(event.target.value)}>{(sourceTable?.columns ?? []).map((column)=><option key={column.id} value={column.id}>{column.name}</option>)}</select></div>
              <div className="relation-arrow"><GitBranch size={17}/></div>
              <div className="relation-field"><label>REFERENCES TABLE</label><select value={targetTable?.id ?? ""} onChange={(event)=>{setTargetTableId(event.target.value);setTargetColumnId("");}}>{project.tables.filter((table)=>table.id !== sourceTable?.id).map((table)=><option key={table.id} value={table.id}>{table.name}</option>)}</select></div>
              <div className="relation-field"><label>REFERENCED COLUMN</label><select value={targetColumn?.id ?? ""} onChange={(event)=>setTargetColumnId(event.target.value)}>{(targetTable?.columns ?? []).map((column)=><option key={column.id} value={column.id}>{column.name}</option>)}</select></div>
              <div className="relation-field on-delete-field"><label>ON DELETE</label><select value={onDelete} onChange={(event)=>setOnDelete(event.target.value as typeof onDelete)}><option value="CASCADE">CASCADE</option><option value="RESTRICT">RESTRICT</option><option value="SET NULL">SET NULL</option><option value="NO ACTION">NO ACTION</option></select></div>
              <button className="primary relation-add" onClick={createRelation} disabled={!sourceColumn || !targetColumn}><Plus size={14}/> Add relation</button>
            </div>
          </>}
          {project.relations.length > 0 && <div className="relation-list">{project.relations.map((relation)=>{
            const fromTable = project.tables.find((table)=>table.id===relation.sourceTableId);
            const toTable = project.tables.find((table)=>table.id===relation.targetTableId);
            const fromColumn = fromTable?.columns.find((column)=>column.id===relation.sourceColumnId);
            const toColumn = toTable?.columns.find((column)=>column.id===relation.targetColumnId);
            return <div className="relation-item" key={relation.id}><span className="relation-icon"><GitBranch size={14}/></span><div className="relation-path"><b>{fromTable?.name}.{fromColumn?.name}</b><span>references</span><b>{toTable?.name}.{toColumn?.name}</b></div><span className="relation-rule">ON DELETE {relation.onDelete}</span><button className="delete-btn" title="Delete relationship" onClick={()=>deleteRelation(project.id,relation.id)}><X size={14}/></button></div>;
          })}</div>}
        </section>
        <section className="validation"><div><span className="eyebrow">SCHEMA CHECK</span><b>{issues.filter((issue)=>issue.severity==="error").length ? "Needs attention" : "No blocking errors"}</b></div><span>{issues.length} findings</span>{issues.slice(0,3).map((issue,index)=><p key={index} className={issue.severity}>{issue.severity.toUpperCase()} · {issue.message}</p>)}{!issues.length && <p className="clean">Your current schema has no validation findings.</p>}</section>
      </section>
    </div>
  </main>;
}

function ColumnRow({ column, projectId, tableId, updateColumn, deleteColumn }: {
  column: SqlColumn;
  projectId: string;
  tableId: string;
  updateColumn: (projectId:string,tableId:string,columnId:string,patch:Partial<SqlColumn>)=>void;
  deleteColumn: (projectId:string,tableId:string,columnId:string)=>void;
}) {
  return <div className="column-row"><input aria-label="Column name" value={column.name} onChange={(event)=>updateColumn(projectId,tableId,column.id,{name:event.target.value})}/><select aria-label="Column type" value={column.type} onChange={(event)=>updateColumn(projectId,tableId,column.id,{type:event.target.value as SqlColumnType})}>{SQL_COLUMN_TYPES.map((type)=><option key={type} value={type}>{type}</option>)}</select><div className="column-rules"><label title="Primary key"><input type="checkbox" checked={column.primaryKey} onChange={(event)=>updateColumn(projectId,tableId,column.id,{primaryKey:event.target.checked,nullable:event.target.checked?false:column.nullable})}/> PK</label><label title="Not null"><input type="checkbox" checked={!column.nullable} onChange={(event)=>updateColumn(projectId,tableId,column.id,{nullable:!event.target.checked})}/> NN</label><label title="Unique"><input type="checkbox" checked={column.unique} onChange={(event)=>updateColumn(projectId,tableId,column.id,{unique:event.target.checked})}/> UQ</label></div><button className="delete-btn" title="Delete column" onClick={()=>deleteColumn(projectId,tableId,column.id)}><Trash2 size={13}/></button>{column.type==="VARCHAR" && <input className="length-input" aria-label="VARCHAR length" type="number" min="1" max="65535" value={column.length??255} onChange={(event)=>updateColumn(projectId,tableId,column.id,{length:Math.max(1,Number(event.target.value)||1)})}/>}</div>;
}
