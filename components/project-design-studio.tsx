"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import {
  ArrowRight, Check, ClipboardList, Copy, Flag, GitBranch, Lightbulb,
  Link2, Maximize2, Minus, Package, Plus, ShieldAlert, Sparkles, Target,
  Trash2, Users, Wallet, Workflow, X, type LucideIcon
} from "lucide-react";
import type {
  Project, ProjectDesignBlock, ProjectDesignBlockType, ProjectDesignCanvas,
  ProjectDesignConnection
} from "@/lib/types";

type Props = {
  project: Project;
  canvas?: ProjectDesignCanvas;
  onChange: (canvas: ProjectDesignCanvas) => void;
};

const palette: Array<{ type: ProjectDesignBlockType; label: string; hint: string; icon: LucideIcon }> = [
  { type: "vision", label: "Vision", hint: "The change you want to create", icon: Lightbulb },
  { type: "audience", label: "People", hint: "Users, sponsors and partners", icon: Users },
  { type: "deliverable", label: "Deliverable", hint: "A tangible project output", icon: Package },
  { type: "workstream", label: "Workstream", hint: "A stream of coordinated work", icon: Workflow },
  { type: "milestone", label: "Milestone", hint: "A meaningful checkpoint", icon: Flag },
  { type: "risk", label: "Risk", hint: "An uncertainty to manage", icon: ShieldAlert },
  { type: "decision", label: "Decision", hint: "A choice that shapes the plan", icon: GitBranch },
  { type: "resource", label: "Resource", hint: "People, time or budget", icon: Wallet },
  { type: "system", label: "System", hint: "A tool, process or service", icon: ClipboardList },
  { type: "note", label: "Idea / note", hint: "A thought worth keeping", icon: Target }
];

const worldSize = { width: 2200, height: 1500 };
const nodeWidth = 264;
const nodeHeight = 176;

function makeStarterCanvas(project: Project): ProjectDesignCanvas {
  const blocks: ProjectDesignBlock[] = [
    { id: crypto.randomUUID(), type: "vision", title: "The project north star", detail: project.objective || "What meaningful change should this project create?", x: 150, y: 190, status: "Shaping" },
    { id: crypto.randomUUID(), type: "audience", title: "Who is this for?", detail: "Name the people who benefit, make decisions or contribute.", x: 530, y: 80, status: "Idea" },
    { id: crypto.randomUUID(), type: "deliverable", title: "What will exist?", detail: "Describe the tangible outputs people can see, use or approve.", x: 930, y: 190, status: "Idea" },
    { id: crypto.randomUUID(), type: "workstream", title: "How will we make it happen?", detail: "Group the work into a few clear streams of activity.", x: 530, y: 430, status: "Idea" },
    { id: crypto.randomUUID(), type: "milestone", title: "First meaningful checkpoint", detail: "What is the first moment that proves the project is moving?", x: 1120, y: 470, status: "Idea" },
    { id: crypto.randomUUID(), type: "risk", title: "What could get in the way?", detail: "Capture the biggest uncertainty before it becomes a surprise.", x: 150, y: 650, status: "Idea" },
    { id: crypto.randomUUID(), type: "decision", title: "The first big decision", detail: "Record a choice that could change direction, cost or timing.", x: 800, y: 760, status: "Idea" }
  ];
  return {
    blocks,
    connections: [
      { id: crypto.randomUUID(), fromId: blocks[0].id, toId: blocks[2].id, label: "defines the outcome" },
      { id: crypto.randomUUID(), fromId: blocks[1].id, toId: blocks[2].id, label: "shapes the output" },
      { id: crypto.randomUUID(), fromId: blocks[3].id, toId: blocks[2].id, label: "creates" },
      { id: crypto.randomUUID(), fromId: blocks[2].id, toId: blocks[4].id, label: "is validated at" },
      { id: crypto.randomUUID(), fromId: blocks[5].id, toId: blocks[3].id, label: "may affect" }
    ]
  };
}

function createBlock(type: ProjectDesignBlockType, x: number, y: number): ProjectDesignBlock {
  const definition = palette.find((entry) => entry.type === type) ?? palette[9];
  return {
    id: crypto.randomUUID(),
    type,
    title: "New " + definition.label.toLowerCase(),
    detail: definition.hint + ". Add the context that makes this part of your project unique.",
    x,
    y,
    status: "Idea"
  };
}

function IconFor({ type }: { type: ProjectDesignBlockType }) {
  const Icon = palette.find((entry) => entry.type === type)?.icon ?? Target;
  return <Icon size={15}/>;
}

type Viewport = { x: number; y: number; scale: number };
type Interaction =
  | { kind: "pan"; pointerX: number; pointerY: number; startX: number; startY: number }
  | { kind: "move"; id: string; pointerX: number; pointerY: number; startX: number; startY: number };

export function ProjectDesignStudio({ project, canvas, onChange }: Props) {
  const [draft, setDraft] = useState<ProjectDesignCanvas>(() => canvas ?? makeStarterCanvas(project));
  const draftRef = useRef(draft);
  const [viewport, setViewport] = useState<Viewport>({ x: 36, y: 34, scale: 0.76 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const [selectedId, setSelectedId] = useState(draft.blocks[0]?.id ?? "");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(true);

  const selectedBlock = useMemo(
    () => draft.blocks.find((block) => block.id === selectedId),
    [draft.blocks, selectedId]
  );
  const selectedConnection = useMemo(
    () => draft.connections.find((connection) => connection.id === selectedConnectionId),
    [draft.connections, selectedConnectionId]
  );

  function commit(next: ProjectDesignCanvas) {
    draftRef.current = next;
    setDraft(next);
    onChange(next);
  }

  function updateBlock(id: string, patch: Partial<ProjectDesignBlock>) {
    commit({
      ...draftRef.current,
      blocks: draftRef.current.blocks.map((block) => block.id === id ? { ...block, ...patch } : block)
    });
  }

  function addBlock(type: ProjectDesignBlockType) {
    const bounds = viewportRef.current?.getBoundingClientRect();
    const centerX = bounds ? (bounds.width / 2 - viewport.x) / viewport.scale : 760;
    const centerY = bounds ? (bounds.height / 2 - viewport.y) / viewport.scale : 520;
    const offset = (draftRef.current.blocks.length % 5) * 34;
    const block = createBlock(type, Math.max(40, centerX - nodeWidth / 2 + offset), Math.max(40, centerY - nodeHeight / 2 + offset));
    commit({ ...draftRef.current, blocks: [...draftRef.current.blocks, block] });
    setSelectedId(block.id);
    setSelectedConnectionId("");
    setConnectMode(false);
    setConnectSourceId("");
  }

  function duplicateBlock() {
    if (!selectedBlock) return;
    const copy = { ...selectedBlock, id: crypto.randomUUID(), title: selectedBlock.title + " copy", x: selectedBlock.x + 46, y: selectedBlock.y + 46 };
    commit({ ...draftRef.current, blocks: [...draftRef.current.blocks, copy] });
    setSelectedId(copy.id);
  }

  function removeSelectedBlock() {
    if (!selectedBlock) return;
    const next = {
      ...draftRef.current,
      blocks: draftRef.current.blocks.filter((block) => block.id !== selectedBlock.id),
      connections: draftRef.current.connections.filter((connection) => connection.fromId !== selectedBlock.id && connection.toId !== selectedBlock.id)
    };
    commit(next);
    setSelectedId(next.blocks[0]?.id ?? "");
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-interactive='true']")) return;

    const node = target.closest<HTMLElement>("[data-block-id]");
    if (connectMode && node) {
      const blockId = node.dataset.blockId ?? "";
      if (!connectSourceId) {
        setConnectSourceId(blockId);
        setSelectedId(blockId);
      } else if (connectSourceId !== blockId) {
        const exists = draftRef.current.connections.some((connection) =>
          connection.fromId === connectSourceId && connection.toId === blockId
        );
        if (!exists) {
          const nextConnection: ProjectDesignConnection = {
            id: crypto.randomUUID(), fromId: connectSourceId, toId: blockId, label: "depends on"
          };
          commit({ ...draftRef.current, connections: [...draftRef.current.connections, nextConnection] });
          setSelectedConnectionId(nextConnection.id);
          setSelectedId("");
        }
        setConnectSourceId("");
        setConnectMode(false);
      }
      event.preventDefault();
      return;
    }

    if (node) {
      const id = node.dataset.blockId ?? "";
      const block = draftRef.current.blocks.find((entry) => entry.id === id);
      if (!block) return;
      setSelectedId(id);
      setSelectedConnectionId("");
      interactionRef.current = {
        kind: "move", id, pointerX: event.clientX, pointerY: event.clientY,
        startX: block.x, startY: block.y
      };
    } else {
      setSelectedId("");
      setSelectedConnectionId("");
      interactionRef.current = {
        kind: "pan", pointerX: event.clientX, pointerY: event.clientY,
        startX: viewport.x, startY: viewport.y
      };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const dx = event.clientX - interaction.pointerX;
    const dy = event.clientY - interaction.pointerY;

    if (interaction.kind === "pan") {
      setViewport((current) => ({ ...current, x: interaction.startX + dx, y: interaction.startY + dy }));
      return;
    }

    const next = {
      ...draftRef.current,
      blocks: draftRef.current.blocks.map((block) => block.id === interaction.id
        ? { ...block, x: Math.max(0, interaction.startX + dx / viewport.scale), y: Math.max(0, interaction.startY + dy / viewport.scale) }
        : block)
    };
    draftRef.current = next;
    setDraft(next);
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (interactionRef.current?.kind === "move") onChange(draftRef.current);
    interactionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function zoomAt(nextScale: number, clientX?: number, clientY?: number) {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const scale = Math.min(1.35, Math.max(0.35, nextScale));
    const focusX = clientX === undefined ? bounds.width / 2 : clientX - bounds.left;
    const focusY = clientY === undefined ? bounds.height / 2 : clientY - bounds.top;
    const worldX = (focusX - viewport.x) / viewport.scale;
    const worldY = (focusY - viewport.y) / viewport.scale;
    setViewport({ x: focusX - worldX * scale, y: focusY - worldY * scale, scale });
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomAt(viewport.scale * (event.deltaY < 0 ? 1.08 : 0.92), event.clientX, event.clientY);
  }

  function fitCanvas() {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds || !draftRef.current.blocks.length) {
      setViewport({ x: 36, y: 34, scale: 0.76 });
      return;
    }
    const minX = Math.min(...draftRef.current.blocks.map((block) => block.x));
    const minY = Math.min(...draftRef.current.blocks.map((block) => block.y));
    const maxX = Math.max(...draftRef.current.blocks.map((block) => block.x + nodeWidth));
    const maxY = Math.max(...draftRef.current.blocks.map((block) => block.y + nodeHeight));
    const scale = Math.min(0.92, (bounds.width - 100) / (maxX - minX + 140), (bounds.height - 100) / (maxY - minY + 140));
    const safeScale = Math.max(0.35, scale);
    setViewport({
      scale: safeScale,
      x: (bounds.width - (maxX - minX) * safeScale) / 2 - minX * safeScale,
      y: (bounds.height - (maxY - minY) * safeScale) / 2 - minY * safeScale
    });
  }

  function updateConnection(id: string, patch: Partial<ProjectDesignConnection>) {
    commit({
      ...draftRef.current,
      connections: draftRef.current.connections.map((connection) => connection.id === id ? { ...connection, ...patch } : connection)
    });
  }

  function removeConnection(id: string) {
    commit({ ...draftRef.current, connections: draftRef.current.connections.filter((connection) => connection.id !== id) });
    setSelectedConnectionId("");
  }

  const blocks = draft.blocks;
  const connections = draft.connections;

  return (
    <section className="design-studio">
      <div className="design-studio-header">
        <div className="design-studio-title">
          <span className="design-studio-kicker"><Sparkles size={12}/> THE PROJECT PLAYGROUND</span>
          <h2>Make the plan <em>visible.</em></h2>
          <p>Arrange the pieces. Draw the relationships. Discover how the whole project fits together.</p>
        </div>
        <div className="design-header-stats">
          <div><strong>{blocks.length}</strong><span>BLOCKS</span></div>
          <div><strong>{connections.length}</strong><span>LINKS</span></div>
          <div className="design-save-state"><i/> SAVED LOCALLY</div>
        </div>
      </div>

      <div className="design-toolbar">
        <div className="design-toolbar-left">
          <span className="design-project-chip">{project.name}</span>
          <span className="design-toolbar-divider"/>
          <button type="button" className={"design-tool-button " + (connectMode ? "active" : "")} data-interactive="true" onClick={() => { setConnectMode((current) => !current); setConnectSourceId(""); setSelectedConnectionId(""); }}>
            <Link2 size={14}/> {connectMode ? "Cancel linking" : "Link blocks"}
          </button>
          {connectMode && <span className="design-tool-hint">{connectSourceId ? "Now choose the destination block" : "Choose a starting block"}</span>}
        </div>
        <div className="design-toolbar-right">
          <button type="button" className="design-icon-button" data-interactive="true" aria-label="Zoom out" onClick={() => zoomAt(viewport.scale - 0.1)}><Minus size={14}/></button>
          <span className="design-zoom-value">{Math.round(viewport.scale * 100)}%</span>
          <button type="button" className="design-icon-button" data-interactive="true" aria-label="Zoom in" onClick={() => zoomAt(viewport.scale + 0.1)}><Plus size={14}/></button>
          <button type="button" className="design-fit-button" data-interactive="true" onClick={fitCanvas}><Maximize2 size={13}/> Fit canvas</button>
        </div>
      </div>

      <div className="design-workbench">
        <aside className={"design-palette " + (paletteOpen ? "" : "palette-collapsed")}>
          <div className="design-pane-heading"><div><span>BUILD WITH BLOCKS</span><strong>Project pieces</strong></div><button type="button" data-interactive="true" aria-label="Toggle block palette" onClick={() => setPaletteOpen((value) => !value)}>{paletteOpen ? <X size={14}/> : <Plus size={14}/>}</button></div>
          {paletteOpen ? <div className="design-palette-list">{palette.map((entry) => {
            const Icon = entry.icon;
            return <button type="button" className={"design-palette-item design-accent-" + entry.type} key={entry.type} data-interactive="true" onClick={() => addBlock(entry.type)}>
              <span className="design-palette-icon"><Icon size={15}/></span><span><strong>{entry.label}</strong><small>{entry.hint}</small></span><Plus size={13} className="design-palette-plus"/>
            </button>;
          })}</div> : <div className="design-palette-closed">Palette hidden</div>}
          <div className="design-palette-tip"><Lightbulb size={14}/><p>Start with the outcome, then add the people, work and decisions that make it real.</p></div>
        </aside>

        <div className="design-canvas-frame">
          <div
            ref={viewportRef}
            className={"design-canvas-viewport " + (connectMode ? "connect-active" : "")}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
            onWheel={handleWheel}
          >
            <div className="design-world" style={{ width: worldSize.width, height: worldSize.height, transform: "translate(" + viewport.x + "px, " + viewport.y + "px) scale(" + viewport.scale + ")" }}>
              <svg className="design-edges" width={worldSize.width} height={worldSize.height} viewBox={"0 0 " + worldSize.width + " " + worldSize.height}>
                <defs><marker id="design-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#91a3c5"/></marker></defs>
                {connections.map((connection) => {
                  const from = blocks.find((block) => block.id === connection.fromId);
                  const to = blocks.find((block) => block.id === connection.toId);
                  if (!from || !to) return null;
                  const sx = from.x + nodeWidth;
                  const sy = from.y + nodeHeight / 2;
                  const tx = to.x;
                  const ty = to.y + nodeHeight / 2;
                  const curve = Math.max(70, Math.abs(tx - sx) * 0.48);
                  const selected = selectedConnectionId === connection.id;
                  return <g key={connection.id}>
                    <path d={"M " + sx + " " + sy + " C " + (sx + curve) + " " + sy + ", " + (tx - curve) + " " + ty + ", " + tx + " " + ty} className={"design-edge-hit " + (selected ? "edge-selected" : "")} data-interactive="true" onClick={() => { setSelectedConnectionId(connection.id); setSelectedId(""); }} />
                    <path d={"M " + sx + " " + sy + " C " + (sx + curve) + " " + sy + ", " + (tx - curve) + " " + ty + ", " + tx + " " + ty} className={"design-edge-line " + (selected ? "edge-selected" : "")} markerEnd="url(#design-arrow)"/>
                    <text x={(sx + tx) / 2} y={(sy + ty) / 2 - 10} className="design-edge-label">{connection.label}</text>
                  </g>;
                })}
              </svg>
              {blocks.map((block) => {
                const definition = palette.find((entry) => entry.type === block.type) ?? palette[9];
                const Icon = definition.icon;
                return <article
                  key={block.id}
                  data-block-id={block.id}
                  className={"design-node design-accent-" + block.type + (selectedId === block.id ? " node-selected" : "") + (connectSourceId === block.id ? " node-connect-source" : "")}
                  style={{ left: block.x, top: block.y, width: nodeWidth, minHeight: nodeHeight }}
                >
                  <div className="design-node-topline"><span className="design-node-icon"><Icon size={15}/></span><span>{definition.label}</span><i className={"design-status-dot status-" + block.status.toLowerCase()}/><small>{block.status}</small></div>
                  <h3>{block.title}</h3>
                  <p>{block.detail}</p>
                  <div className="design-node-footer"><span>DRAG TO ARRANGE</span><span className="design-node-port"/></div>
                </article>;
              })}
            </div>

            <div className="design-canvas-overlay">
              <div className="design-canvas-hint"><span className="design-keycap">SPACE</span> + drag to pan <span className="design-hint-dot"/> Ctrl + scroll to zoom</div>
              <div className="design-minimap"><span>MAP</span><div>{blocks.map((block) => <i key={block.id} className={"minimap-block minimap-" + block.type} style={{ left: (block.x / worldSize.width * 100) + "%", top: (block.y / worldSize.height * 100) + "%" }}/>)}</div></div>
            </div>
          </div>
          <div className="design-canvas-footer"><span><i/> Live canvas</span><span>Drag empty space to pan · Drag a block to move it</span><span>{blocks.length} objects / {connections.length} relationships</span></div>
        </div>

        <aside className="design-inspector">
          {selectedBlock ? <>
            <div className="design-inspector-header"><div><span>OBJECT INSPECTOR</span><strong>Shape this block</strong></div><span className="design-inspector-icon"><IconFor type={selectedBlock.type}/></span></div>
            <div className="design-inspector-type">{palette.find((entry) => entry.type === selectedBlock.type)?.label ?? "Project block"}</div>
            <label className="design-field">Title<input value={selectedBlock.title} maxLength={100} onChange={(event) => updateBlock(selectedBlock.id, { title: event.target.value })}/></label>
            <label className="design-field">Description<textarea rows={6} value={selectedBlock.detail} maxLength={900} onChange={(event) => updateBlock(selectedBlock.id, { detail: event.target.value })}/></label>
            <label className="design-field">Progress state<select value={selectedBlock.status} onChange={(event) => updateBlock(selectedBlock.id, { status: event.target.value as ProjectDesignBlock["status"] })}><option>Idea</option><option>Shaping</option><option>Ready</option></select></label>
            <div className="design-inspector-actions">
              <button type="button" data-interactive="true" onClick={duplicateBlock}><Copy size={13}/> Duplicate</button>
              <button type="button" data-interactive="true" className="design-delete-action" onClick={removeSelectedBlock}><Trash2 size={13}/> Delete</button>
            </div>
          </> : selectedConnection ? <>
            <div className="design-inspector-header"><div><span>RELATIONSHIP INSPECTOR</span><strong>Explain the connection</strong></div><span className="design-inspector-icon"><Link2 size={15}/></span></div>
            <div className="design-connection-summary"><strong>{blocks.find((block) => block.id === selectedConnection.fromId)?.title ?? "Source"}</strong><ArrowRight size={14}/><strong>{blocks.find((block) => block.id === selectedConnection.toId)?.title ?? "Target"}</strong></div>
            <label className="design-field">Relationship label<input value={selectedConnection.label} maxLength={80} onChange={(event) => updateConnection(selectedConnection.id, { label: event.target.value })}/></label>
            <button type="button" className="design-delete-wide" data-interactive="true" onClick={() => removeConnection(selectedConnection.id)}><Trash2 size={13}/> Remove relationship</button>
          </> : <>
            <div className="design-inspector-header"><div><span>DESIGN INSPECTOR</span><strong>Your canvas, your rules</strong></div><span className="design-inspector-icon"><Sparkles size={15}/></span></div>
            <div className="design-inspector-empty"><div><Target size={23}/></div><strong>Select something to shape it</strong><p>Choose a block or a connection. Edit its details here while keeping the big picture in view.</p></div>
            <div className="design-inspector-tip"><Check size={13}/> Every change is saved to this project in your browser.</div>
          </>}
        </aside>
      </div>

      <div className="design-studio-foot"><span><Sparkles size={13}/> Built to explore, not just fill out forms.</span><span>{connectMode ? (connectSourceId ? "Choose a destination to finish the link" : "Select the first block to connect") : "Tip: link a risk to the workstream it threatens, or a deliverable to its milestone."}</span></div>
    </section>
  );
}
