"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import {
  AlertTriangle, ArrowRight, Check, ChevronRight, Clock3, FileText,
  GitBranch, Layers3, LayoutGrid, Plus, ShieldCheck, Target, Trash2,
  Wallet, Workflow
} from "lucide-react";
import type { ModuleId, PlanningItem } from "@/lib/types";

type Metadata = Record<string, string | number | boolean>;
type Props = {
  moduleId: ModuleId;
  items: PlanningItem[];
  notes: string;
  onNotesChange: (notes: string) => void;
  onAdd: (title: string, detail: string, metadata: Metadata) => void;
  onUpdate: (id: string, patch: Partial<PlanningItem>) => void;
  onRemove: (id: string) => void;
  onOpenRoadmap: () => void;
};

const scopeBuckets = ["In scope", "Out of scope", "Assumptions"];
const decisionStates = ["Open", "Evaluating", "Approved", "Rejected"];
const checklistStates = ["Not started", "In progress", "Verified"];

function readMeta(item: PlanningItem, key: string, fallback: string | number = "") {
  return item.metadata?.[key] ?? fallback;
}

function writeMeta(item: PlanningItem, key: string, value: string | number | boolean, onUpdate: Props["onUpdate"]) {
  onUpdate(item.id, { metadata: { ...(item.metadata ?? {}), [key]: value } });
}

function defaultsFor(moduleId: ModuleId): Metadata {
  switch (moduleId) {
    case "requirements": return { priority: "Must have", status: "Proposed", category: "Functional" };
    case "scope": return { bucket: "In scope" };
    case "work-breakdown": return { phase: "Phase 1", level: 1, status: "Not started" };
    case "risks": return { probability: 3, impact: 3, owner: "Unassigned", response: "Mitigate" };
    case "budget": return { amount: 0, currency: "INR", category: "General", costType: "One-time" };
    case "decisions": return { decisionStatus: "Open", owner: "Unassigned" };
    case "milestones": return { milestoneDate: "", gateStatus: "Planned" };
    case "testing": return { checklistStatus: "Not started", testType: "Acceptance" };
    case "security": return { checklistStatus: "Not started", controlType: "Preventive" };
    case "feasibility": return { rating: 3, confidence: "Medium", dimension: "Operational" };
    case "tool-selection": return { rating: 3, cost: "", vendor: "", status: "Candidate" };
    case "resources": return { allocation: 50, hours: 20, role: "Contributor" };
    case "api-planner": return { method: "GET", endpoint: "", auth: "None", timeout: 30 };
    case "integrations": return { readiness: "Discovery", owner: "Unassigned" };
    case "components": return { layer: "Core", responsibility: "" };
    case "connections": return { direction: "One-way", trigger: "" };
    case "data-flows": return { dataType: "Information", classification: "Internal" };
    case "call-flows": return { stepType: "Action", branch: "Always" };
    default: return {};
  }
}

function QuickAdd({ label, onAdd }: { label: string; onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return <div className="studio-quick-add">
    <input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => {
      if (event.key === "Enter" && title.trim()) { onAdd(title.trim()); setTitle(""); }
    }} placeholder={"Name a " + label.toLowerCase()} aria-label={"New " + label}/>
    <button type="button" className="button button-primary button-small" disabled={!title.trim()} onClick={() => {
      onAdd(title.trim()); setTitle("");
    }}><Plus size={13}/> Add {label}</button>
  </div>;
}

function EditorHeader({ icon, title, description, count }: { icon: ReactNode; title: string; description: string; count: number }) {
  return <div className="studio-heading">
    <div className="studio-heading-icon">{icon}</div>
    <div><h3>{title}</h3><p>{description}</p></div>
    <span className="studio-item-count">{count} items</span>
  </div>;
}

function RequirementMatrix({ items, onAdd, onUpdate, onRemove }: Pick<Props, "items" | "onAdd" | "onUpdate" | "onRemove">) {
  return <section className="studio-panel">
    <EditorHeader icon={<LayoutGrid size={17}/>} title="Requirements traceability matrix" description="Prioritize, classify and track each requirement through review." count={items.length}/>
    <QuickAdd label="Requirement" onAdd={(title) => onAdd(title, "", defaultsFor("requirements"))}/>
    <div className="studio-table-wrap"><table className="studio-table">
      <thead><tr><th>Requirement</th><th>Type</th><th>Priority</th><th>Status</th><th/></tr></thead>
      <tbody>{items.map((item) => <tr key={item.id}>
        <td><strong>{item.title}</strong><small>{item.detail || "Add acceptance criteria in the item details."}</small></td>
        <td><select value={String(readMeta(item,"category","Functional"))} onChange={(event) => writeMeta(item,"category",event.target.value,onUpdate)}><option>Functional</option><option>Non-functional</option><option>Constraint</option><option>Compliance</option></select></td>
        <td><select value={String(readMeta(item,"priority","Must have"))} onChange={(event) => writeMeta(item,"priority",event.target.value,onUpdate)}><option>Must have</option><option>Should have</option><option>Could have</option><option>Won&#39;t have</option></select></td>
        <td><select value={String(readMeta(item,"status","Proposed"))} onChange={(event) => writeMeta(item,"status",event.target.value,onUpdate)}><option>Proposed</option><option>Reviewed</option><option>Approved</option><option>Implemented</option><option>Verified</option></select></td>
        <td><button className="studio-icon-action" title="Remove requirement" onClick={() => onRemove(item.id)}><Trash2 size={14}/></button></td>
      </tr>)}</tbody>
    </table>{!items.length && <div className="studio-empty">Add your first requirement to start the matrix.</div>}</div>
  </section>;
}

function ScopeBoard({ items, onAdd, onUpdate, onRemove }: Pick<Props, "items" | "onAdd" | "onUpdate" | "onRemove">) {
  function drop(event: DragEvent<HTMLDivElement>, bucket: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    const item = items.find((entry) => entry.id === id);
    if (item) writeMeta(item,"bucket",bucket,onUpdate);
  }
  return <section className="studio-panel">
    <EditorHeader icon={<Target size={17}/>} title="Scope boundary board" description="Move work between committed scope, exclusions and assumptions." count={items.length}/>
    <QuickAdd label="Scope item" onAdd={(title) => onAdd(title,"",defaultsFor("scope"))}/>
    <div className="studio-kanban">{scopeBuckets.map((bucket) => <div className="studio-kanban-column" key={bucket} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event,bucket)}>
      <div className="studio-column-title"><strong>{bucket}</strong><span>{items.filter((item) => readMeta(item,"bucket","In scope") === bucket).length}</span></div>
      {items.filter((item) => readMeta(item,"bucket","In scope") === bucket).map((item) => <article className="studio-card" key={item.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain",item.id)}>
        <div><strong>{item.title}</strong><p>{item.detail || "Describe the boundary or assumption."}</p></div>
        <div className="studio-card-actions"><select value={String(readMeta(item,"bucket","In scope"))} onChange={(event) => writeMeta(item,"bucket",event.target.value,onUpdate)} aria-label={"Move "+item.title}><option>In scope</option><option>Out of scope</option><option>Assumptions</option></select><button className="studio-icon-action" onClick={() => onRemove(item.id)}><Trash2 size={13}/></button></div>
      </article>)}
      <span className="studio-drop-hint">Drop cards here</span>
    </div>)}</div>
  </section>;
}

function WorkBreakdownEditor({ items, onAdd, onUpdate, onRemove }: Pick<Props, "items" | "onAdd" | "onUpdate" | "onRemove">) {
  const phases=[...new Set(items.map((item) => String(readMeta(item,"phase","Phase 1"))))];
  return <section className="studio-panel">
    <EditorHeader icon={<Layers3 size={17}/>} title="Work breakdown tree" description="Group deliverables into phases and structure work into manageable levels." count={items.length}/>
    <QuickAdd label="Work package" onAdd={(title) => onAdd(title,"",defaultsFor("work-breakdown"))}/>
    <div className="studio-wbs">{phases.map((phase,index) => <div className="studio-wbs-phase" key={phase}>
      <div className="studio-wbs-phase-head"><span>{String(index+1).padStart(2,"0")}</span><strong>{phase}</strong><small>{items.filter((item) => readMeta(item,"phase","Phase 1")===phase).length} work packages</small></div>
      {items.filter((item) => readMeta(item,"phase","Phase 1")===phase).map((item) => <div className="studio-wbs-item" key={item.id}>
        <span className="studio-tree-line"/><span className="studio-tree-node"/>
        <div className="studio-wbs-copy"><strong>{item.title}</strong><small>{item.detail || "Add the outcome and acceptance condition."}</small></div>
        <select value={String(readMeta(item,"level",1))} onChange={(event)=>writeMeta(item,"level",Number(event.target.value),onUpdate)} aria-label="Work breakdown level"><option value="1">Level 1</option><option value="2">Level 2</option><option value="3">Level 3</option></select>
        <select value={String(readMeta(item,"phase","Phase 1"))} onChange={(event)=>writeMeta(item,"phase",event.target.value,onUpdate)} aria-label="Work package phase">{phases.map((value)=><option key={value}>{value}</option>)}</select>
        <button className="studio-icon-action" onClick={()=>onRemove(item.id)}><Trash2 size={13}/></button>
      </div>)}
    </div>)}
    {!items.length && <div className="studio-empty">Create work packages, then assign each to a delivery phase.</div>}</div>
  </section>;
}

function RiskMatrix({ items, onAdd, onUpdate, onRemove }: Pick<Props, "items" | "onAdd" | "onUpdate" | "onRemove">) {
  const [selectedId,setSelectedId]=useState(items[0]?.id ?? "");
  const selected=items.find((item)=>item.id===selectedId);
  return <section className="studio-panel">
    <EditorHeader icon={<AlertTriangle size={17}/>} title="Probability × impact matrix" description="Select a cell to inspect the risks placed at that exposure level." count={items.length}/>
    <QuickAdd label="Risk" onAdd={(title)=>onAdd(title,"",defaultsFor("risks"))}/>
    <div className="studio-risk-layout">
      <div className="studio-risk-axis"><span>IMPACT ↑</span><div className="studio-risk-grid">
        {Array.from({length:5},(_,row)=><div className="studio-risk-row" key={row}>{Array.from({length:5},(_,column)=>{
          const impact=5-column, probability=5-row;
          const cellItems=items.filter((item)=>Number(readMeta(item,"probability",3))===probability&&Number(readMeta(item,"impact",3))===impact);
          return <button key={column} className={"studio-risk-cell exposure-"+(probability*impact>=16?"high":probability*impact>=8?"medium":"low")} onClick={()=>setSelectedId(cellItems[0]?.id ?? "")} title={"Probability "+probability+", impact "+impact}>
            <span>{cellItems.length}</span>{cellItems.map((item)=><small key={item.id}>{item.title}</small>)}
          </button>;
        })}</div>)}</div><div className="studio-risk-x-label"><span>Low</span><span>PROBABILITY →</span><span>High</span></div></div>
      <aside className="studio-risk-inspector">{selected ? <>
        <div className="studio-inspector-title"><strong>{selected.title}</strong><button className="studio-icon-action" onClick={()=>onRemove(selected.id)}><Trash2 size={13}/></button></div>
        <p>{selected.detail || "Describe cause, event and consequence."}</p>
        <label>Probability <input type="range" min="1" max="5" value={Number(readMeta(selected,"probability",3))} onChange={(event)=>writeMeta(selected,"probability",Number(event.target.value),onUpdate)}/><b>{readMeta(selected,"probability",3)}/5</b></label>
        <label>Impact <input type="range" min="1" max="5" value={Number(readMeta(selected,"impact",3))} onChange={(event)=>writeMeta(selected,"impact",Number(event.target.value),onUpdate)}/><b>{readMeta(selected,"impact",3)}/5</b></label>
        <label>Response <select value={String(readMeta(selected,"response","Mitigate"))} onChange={(event)=>writeMeta(selected,"response",event.target.value,onUpdate)}><option>Mitigate</option><option>Avoid</option><option>Transfer</option><option>Accept</option></select></label>
        <label>Owner <input value={String(readMeta(selected,"owner","Unassigned"))} onChange={(event)=>writeMeta(selected,"owner",event.target.value,onUpdate)}/></label>
      </> : <div className="studio-empty">Choose a populated risk cell.</div>}</aside>
    </div>
  </section>;
}

function BudgetLedger({ items, onAdd, onUpdate, onRemove }: Pick<Props, "items" | "onAdd" | "onUpdate" | "onRemove">) {
  const totals=new Map<string,number>();
  items.forEach((item)=>{const currency=String(readMeta(item,"currency","INR"));totals.set(currency,(totals.get(currency)??0)+Number(readMeta(item,"amount",0)));});
  return <section className="studio-panel">
    <EditorHeader icon={<Wallet size={17}/>} title="Project cost ledger" description="Edit line items like a lightweight spreadsheet. Currency totals remain separate." count={items.length}/>
    <QuickAdd label="Cost line" onAdd={(title)=>onAdd(title,"",defaultsFor("budget"))}/>
    <div className="studio-budget-totals">{[...totals.entries()].map(([currency,total])=><div key={currency}><small>{currency} TOTAL</small><strong>{total.toLocaleString("en-IN",{maximumFractionDigits:2})}</strong></div>)}</div>
    <div className="studio-table-wrap"><table className="studio-table studio-budget-table"><thead><tr><th>Cost item</th><th>Category</th><th>Type</th><th>Currency</th><th>Amount</th><th/></tr></thead>
      <tbody>{items.map((item)=><tr key={item.id}><td><strong>{item.title}</strong><small>{item.detail}</small></td>
        <td><input value={String(readMeta(item,"category","General"))} onChange={(event)=>writeMeta(item,"category",event.target.value,onUpdate)}/></td>
        <td><select value={String(readMeta(item,"costType","One-time"))} onChange={(event)=>writeMeta(item,"costType",event.target.value,onUpdate)}><option>One-time</option><option>Monthly</option><option>Annual</option><option>Per use</option></select></td>
        <td><select value={String(readMeta(item,"currency","INR"))} onChange={(event)=>writeMeta(item,"currency",event.target.value,onUpdate)}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></td>
        <td><input type="number" min="0" value={Number(readMeta(item,"amount",0))} onChange={(event)=>writeMeta(item,"amount",Math.max(0,Number(event.target.value)||0),onUpdate)}/></td>
        <td><button className="studio-icon-action" onClick={()=>onRemove(item.id)}><Trash2 size={13}/></button></td></tr>)}</tbody>
    </table>{!items.length&&<div className="studio-empty">Add cost lines to build a project estimate.</div>}</div>
  </section>;
}

function DecisionBoard({items,onAdd,onUpdate,onRemove}:Pick<Props,"items"|"onAdd"|"onUpdate"|"onRemove">) {
  return <section className="studio-panel">
    <EditorHeader icon={<Check size={17}/>} title="Decision review board" description="Move decisions from open questions through evaluation to an approved outcome." count={items.length}/>
    <QuickAdd label="Decision" onAdd={(title)=>onAdd(title,"",{decisionStatus:"Open",owner:"Unassigned"})}/>
    <div className="studio-kanban">{decisionStates.map((state)=><div className="studio-kanban-column" key={state}>
      <div className="studio-column-title"><strong>{state}</strong><span>{items.filter((item)=>readMeta(item,"decisionStatus","Open")===state).length}</span></div>
      {items.filter((item)=>readMeta(item,"decisionStatus","Open")===state).map((item)=><article className="studio-card" key={item.id}>
        <strong>{item.title}</strong><p>{item.detail||"Record context, alternatives and trade-offs."}</p>
        <div className="studio-card-actions"><select value={String(readMeta(item,"decisionStatus","Open"))} onChange={(event)=>writeMeta(item,"decisionStatus",event.target.value,onUpdate)}>{decisionStates.map((value)=><option key={value}>{value}</option>)}</select><button className="studio-icon-action" onClick={()=>onRemove(item.id)}><Trash2 size={13}/></button></div>
      </article>)}
    </div>)}</div>
  </section>;
}

function MilestoneTimeline({items,onAdd,onUpdate,onRemove}:Pick<Props,"items"|"onAdd"|"onUpdate"|"onRemove">) {
  return <section className="studio-panel">
    <EditorHeader icon={<Clock3 size={17}/>} title="Milestone timeline" description="Arrange review gates, release points and acceptance checkpoints." count={items.length}/>
    <QuickAdd label="Milestone" onAdd={(title)=>onAdd(title,"",{milestoneDate:"",gateStatus:"Planned"})}/>
    <div className="studio-milestone-line">{items.map((item,index)=><article className="studio-milestone" key={item.id}>
      <span className="studio-milestone-dot"/>
      <div><strong>{item.title}</strong><p>{item.detail||"Define the outcome and acceptance condition."}</p>
        <div className="studio-inline-fields"><label>Date<input type="date" value={String(readMeta(item,"milestoneDate",""))} onChange={(event)=>writeMeta(item,"milestoneDate",event.target.value,onUpdate)}/></label>
        <label>Gate<select value={String(readMeta(item,"gateStatus","Planned"))} onChange={(event)=>writeMeta(item,"gateStatus",event.target.value,onUpdate)}><option>Planned</option><option>In review</option><option>Passed</option><option>Blocked</option></select></label>
        <button className="studio-icon-action" onClick={()=>onRemove(item.id)}><Trash2 size={13}/></button></div>
      </div><small>{String(index+1).padStart(2,"0")}</small>
    </article>)}</div>{!items.length&&<div className="studio-empty">Add the first milestone to map project checkpoints.</div>}
  </section>;
}

function ChecklistEditor({items,onAdd,onUpdate,onRemove,moduleId}:Pick<Props,"items"|"onAdd"|"onUpdate"|"onRemove"> & {moduleId:ModuleId}) {
  const security=moduleId==="security";
  const metaKey=security?"controlType":"testType";
  const values=security?["Preventive","Detective","Corrective","Recovery"]:["Acceptance","Functional","Performance","Usability","Regression"];
  return <section className="studio-panel">
    <EditorHeader icon={security?<ShieldCheck size={17}/>:<Check size={17}/>} title={security?"Security control library":"Quality & test plan"} description={security?"Review safeguards, ownership and implementation evidence.":"Track test coverage, acceptance evidence and verification gates."} count={items.length}/>
    <QuickAdd label={security?"Control":"Test case"} onAdd={(title)=>onAdd(title,"",{checklistStatus:"Not started",[metaKey]:values[0]})}/>
    <div className="studio-checklist">{items.map((item)=> <article className="studio-check-row" key={item.id}>
      <button className={"studio-check-toggle "+(readMeta(item,"checklistStatus","Not started")==="Verified"?"checked":"")} onClick={()=>writeMeta(item,"checklistStatus",readMeta(item,"checklistStatus","Not started")==="Verified"?"Not started":"Verified",onUpdate)}><Check size={13}/></button>
      <div><strong>{item.title}</strong><small>{item.detail||"Add evidence and acceptance criteria."}</small></div>
      <select value={String(readMeta(item,"checklistStatus","Not started"))} onChange={(event)=>writeMeta(item,"checklistStatus",event.target.value,onUpdate)}>{checklistStates.map((value)=><option key={value}>{value}</option>)}</select>
      <select value={String(readMeta(item,metaKey,values[0]))} onChange={(event)=>writeMeta(item,metaKey,event.target.value,onUpdate)}>{values.map((value)=><option key={value}>{value}</option>)}</select>
      <button className="studio-icon-action" onClick={()=>onRemove(item.id)}><Trash2 size={13}/></button>
    </article>)}</div>{!items.length&&<div className="studio-empty">Create a checklist item to begin.</div>}
  </section>;
}

function Scorecard({items,onAdd,onUpdate,onRemove}:Pick<Props,"items"|"onAdd"|"onUpdate"|"onRemove">) {
  const average=items.length?items.reduce((sum,item)=>sum+Number(readMeta(item,"rating",3)),0)/items.length:0;
  return <section className="studio-panel">
    <EditorHeader icon={<Target size={17}/>} title="Feasibility scorecard" description="Rate each dimension, then compare the evidence behind the score." count={items.length}/>
    <div className="studio-score-summary"><strong>{average.toFixed(1)}<small>/ 5</small></strong><span>Average assessment score</span></div>
    <QuickAdd label="Assessment" onAdd={(title)=>onAdd(title,"",{rating:3,confidence:"Medium",dimension:"Operational"})}/>
    <div className="studio-score-list">{items.map((item)=> <article key={item.id}>
      <div><strong>{item.title}</strong><small>{item.detail}</small></div>
      <select value={String(readMeta(item,"dimension","Operational"))} onChange={(event)=>writeMeta(item,"dimension",event.target.value,onUpdate)}><option>Practical</option><option>Technical</option><option>Operational</option><option>Financial</option><option>Schedule</option><option>Legal / regulatory</option></select>
      <input type="range" min="1" max="5" value={Number(readMeta(item,"rating",3))} onChange={(event)=>writeMeta(item,"rating",Number(event.target.value),onUpdate)}/>
      <strong>{readMeta(item,"rating",3)}/5</strong><button className="studio-icon-action" onClick={()=>onRemove(item.id)}><Trash2 size={13}/></button>
    </article>)}</div>
  </section>;
}

function FlowCanvas({items,onAdd,onUpdate,onRemove,moduleId}:Pick<Props,"items"|"onAdd"|"onUpdate"|"onRemove"> & {moduleId:ModuleId}) {
  const labels:Partial<Record<ModuleId,string>>={
    architecture:"Architecture canvas",components:"Component map",connections:"Connection designer",
    "data-flows":"Information flow canvas",integrations:"Integration landscape",
    "api-planner":"API operation builder","call-flows":"Process flow designer"
  };
  const sourceName=moduleId==="api-planner"?"Client / caller":moduleId==="integrations"?"Source participant":"Source";
  const targetName=moduleId==="api-planner"?"Endpoint / operation":moduleId==="integrations"?"Destination service":"Destination";
  return <section className="studio-panel">
    <EditorHeader icon={<Workflow size={17}/>} title={labels[moduleId]??"System canvas"} description="Create visual cards and define how people, systems or information move between them." count={items.length}/>
    <QuickAdd label="Node" onAdd={(title)=>onAdd(title,"",defaultsFor(moduleId))}/>
    <div className="studio-canvas">
      <div className="studio-canvas-grid"/>
      <div className="studio-flow-nodes">{items.map((item,index)=><article className="studio-flow-node" key={item.id}>
        <div className="studio-flow-node-head"><span>{String(index+1).padStart(2,"0")}</span><button className="studio-icon-action" onClick={()=>onRemove(item.id)}><Trash2 size={13}/></button></div>
        <strong>{item.title}</strong><p>{item.detail||"Define responsibility, boundaries and output."}</p>
        {moduleId==="api-planner"&&<div className="studio-api-fields"><select value={String(readMeta(item,"method","GET"))} onChange={(event)=>writeMeta(item,"method",event.target.value,onUpdate)}><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select><input value={String(readMeta(item,"endpoint",""))} onChange={(event)=>writeMeta(item,"endpoint",event.target.value,onUpdate)} placeholder="/v1/resource"/></div>}
        {moduleId==="components"&&<label className="studio-node-field">Layer<select value={String(readMeta(item,"layer","Core"))} onChange={(event)=>writeMeta(item,"layer",event.target.value,onUpdate)}><option>Core</option><option>Interface</option><option>Service</option><option>Data</option><option>External</option></select></label>}
        {moduleId==="integrations"&&<label className="studio-node-field">Readiness<select value={String(readMeta(item,"readiness","Discovery"))} onChange={(event)=>writeMeta(item,"readiness",event.target.value,onUpdate)}><option>Discovery</option><option>Evaluating</option><option>Ready</option><option>Blocked</option></select></label>}
        <div className="studio-flow-node-links"><label>{sourceName}<input value={item.source??""} onChange={(event)=>onUpdate(item.id,{source:event.target.value})} placeholder="From"/></label><label>{targetName}<input value={item.destination??""} onChange={(event)=>onUpdate(item.id,{destination:event.target.value})} placeholder="To"/></label></div>
      </article>)}</div>
      {!items.length&&<div className="studio-canvas-empty"><Workflow size={24}/><strong>Your design canvas is empty</strong><p>Add a component, service or process step to start mapping the system.</p></div>}
    </div>
    <div className="studio-connection-list"><div><GitBranch size={14}/><strong>Defined connections</strong></div>
      {items.filter((item)=>item.source||item.destination).map((item)=><div className="studio-connection" key={item.id}><span>{item.source||"Unspecified source"}</span><ArrowRight size={13}/><strong>{item.destination||item.title}</strong><small>{item.title}</small></div>)}
      {!items.some((item)=>item.source||item.destination)&&<p className="studio-empty">Enter source and destination on a card to define a connection.</p>}
    </div>
  </section>;
}

function ResourceBoard({items,onAdd,onUpdate,onRemove}:Pick<Props,"items"|"onAdd"|"onUpdate"|"onRemove">) {
  return <section className="studio-panel">
    <EditorHeader icon={<Target size={17}/>} title="Resource allocation board" description="Track named people, teams, equipment and their project capacity." count={items.length}/>
    <QuickAdd label="Resource" onAdd={(title)=>onAdd(title,"",defaultsFor("resources"))}/>
    <div className="studio-resource-cards">{items.map((item)=> <article className="studio-resource-card" key={item.id}>
      <div><strong>{item.title}</strong><small>{item.detail||"Define role, skills and availability."}</small></div>
      <label>Role<input value={String(readMeta(item,"role","Contributor"))} onChange={(event)=>writeMeta(item,"role",event.target.value,onUpdate)}/></label>
      <label>Allocation<input type="range" min="1" max="100" value={Number(readMeta(item,"allocation",50))} onChange={(event)=>writeMeta(item,"allocation",Number(event.target.value),onUpdate)}/><b>{readMeta(item,"allocation",50)}%</b></label>
      <label>Hours / week<input type="number" min="1" max="80" value={Number(readMeta(item,"hours",20))} onChange={(event)=>writeMeta(item,"hours",Number(event.target.value),onUpdate)}/></label>
      <button className="studio-icon-action" onClick={()=>onRemove(item.id)}><Trash2 size={13}/></button>
    </article>)}</div>
  </section>;
}

function ToolComparison({items,onAdd,onUpdate,onRemove}:Pick<Props,"items"|"onAdd"|"onUpdate"|"onRemove">) {
  return <section className="studio-panel">
    <EditorHeader icon={<Layers3 size={17}/>} title="Tool comparison workspace" description="Compare candidates side by side before recording a selection." count={items.length}/>
    <QuickAdd label="Candidate" onAdd={(title)=>onAdd(title,"",defaultsFor("tool-selection"))}/>
    <div className="studio-tool-grid">{items.map((item)=> <article className="studio-tool-card" key={item.id}>
      <div><strong>{item.title}</strong><p>{item.detail||"Record the use case and evidence."}</p></div>
      <label>Fit score <input type="range" min="1" max="5" value={Number(readMeta(item,"rating",3))} onChange={(event)=>writeMeta(item,"rating",Number(event.target.value),onUpdate)}/><b>{readMeta(item,"rating",3)}/5</b></label>
      <label>Vendor<input value={String(readMeta(item,"vendor",""))} onChange={(event)=>writeMeta(item,"vendor",event.target.value,onUpdate)}/></label>
      <label>Indicative cost<input value={String(readMeta(item,"cost",""))} onChange={(event)=>writeMeta(item,"cost",event.target.value,onUpdate)} placeholder="Price / licence estimate"/></label>
      <button className="studio-icon-action" onClick={()=>onRemove(item.id)}><Trash2 size={13}/></button>
    </article>)}</div>
  </section>;
}

function DocumentationEditor({notes,onNotesChange}:Pick<Props,"notes"|"onNotesChange">) {
  const headings=notes.split("\n").filter((line)=>line.startsWith("#")).length;
  return <section className="studio-panel">
    <EditorHeader icon={<FileText size={17}/>} title="Project document editor" description="Draft the blueprint on the left and keep a live reading preview on the right." count={headings}/>
    <div className="studio-doc-layout"><label>DOCUMENT DRAFT<textarea value={notes} onChange={(event)=>onNotesChange(event.target.value)} placeholder={"# Project blueprint\n\n## Context\nDescribe the need and outcome.\n\n## Delivery approach\nOutline the plan and decisions."}/></label>
      <article className="studio-doc-preview"><span>LIVE PREVIEW</span>{notes.trim()?notes.split("\n").map((line,index)=>line.startsWith("# ")?<h2 key={index}>{line.slice(2)}</h2>:line.startsWith("## ")?<h3 key={index}>{line.slice(3)}</h3>:<p key={index}>{line||" "}</p>):<p>Your document preview will appear here as you write.</p>}</article>
    </div>
  </section>;
}

export function PlanningStudio(props: Props) {
  const {moduleId,items,onAdd,onUpdate,onRemove,notes,onNotesChange,onOpenRoadmap}=props;
  const [showNotes,setShowNotes]=useState(false);
  const label=moduleId==="requirements"?"requirement":moduleId==="scope"?"scope item":moduleId==="risks"?"risk":moduleId==="budget"?"cost":"planning item";
  let editor: ReactNode;

  switch(moduleId) {
    case "requirements": editor=<RequirementMatrix {...{items,onAdd,onUpdate,onRemove}}/>; break;
    case "scope": editor=<ScopeBoard {...{items,onAdd,onUpdate,onRemove}}/>; break;
    case "work-breakdown": editor=<WorkBreakdownEditor {...{items,onAdd,onUpdate,onRemove}}/>; break;
    case "risks": editor=<RiskMatrix {...{items,onAdd,onUpdate,onRemove}}/>; break;
    case "budget": editor=<BudgetLedger {...{items,onAdd,onUpdate,onRemove}}/>; break;
    case "decisions": editor=<DecisionBoard {...{items,onAdd,onUpdate,onRemove}}/>; break;
    case "milestones": editor=<MilestoneTimeline {...{items,onAdd,onUpdate,onRemove}}/>; break;
    case "testing":
    case "security": editor=<ChecklistEditor {...{items,onAdd,onUpdate,onRemove,moduleId}}/>; break;
    case "feasibility": editor=<Scorecard {...{items,onAdd,onUpdate,onRemove}}/>; break;
    case "architecture":
    case "components":
    case "connections":
    case "data-flows":
    case "integrations":
    case "api-planner":
    case "call-flows": editor=<FlowCanvas {...{items,onAdd,onUpdate,onRemove,moduleId}}/>; break;
    case "resources": editor=<ResourceBoard {...{items,onAdd,onUpdate,onRemove}}/>; break;
    case "tool-selection": editor=<ToolComparison {...{items,onAdd,onUpdate,onRemove}}/>; break;
    case "documentation": editor=<DocumentationEditor notes={notes} onNotesChange={onNotesChange}/>; break;
    case "timeline": editor=<section className="studio-panel"><EditorHeader icon={<Clock3 size={17}/>} title="Timeline editor" description="Use the roadmap's Gantt and dependency editor for the live schedule." count={items.length}/><div className="studio-timeline-launch"><p>The schedule is driven by task durations, planned starts, dependencies and milestones.</p><button className="button button-primary" onClick={onOpenRoadmap}>Open Gantt editor <ArrowRight size={14}/></button></div></section>; break;
    default: editor=<section className="studio-panel"><EditorHeader icon={<FileText size={17}/>} title={moduleId==="brief"?"Project brief workspace":"Planning workspace"} description="Organize work as editable cards and capture the context that matters." count={items.length}/><QuickAdd label={label} onAdd={(title)=>onAdd(title,"",defaultsFor(moduleId))}/><div className="studio-card-grid">{items.map((item)=><article className="studio-card" key={item.id}><strong>{item.title}</strong><p>{item.detail}</p><button className="studio-icon-action" onClick={()=>onRemove(item.id)}><Trash2 size={13}/></button></article>)}</div></section>;
  }

  return <div className="planning-studio">
    {editor}
    {moduleId!=="documentation"&&<div className="studio-notes-toggle"><button className="text-button" onClick={()=>setShowNotes((value)=>!value)}>{showNotes?"Hide":"Show"} working notes <ChevronRight size={13}/></button>{showNotes&&<textarea value={notes} onChange={(event)=>onNotesChange(event.target.value)} placeholder="Record rationale, evidence, assumptions and open questions..."/>}</div>}
  </div>;
}
