"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  Handle,
  Position,
  MarkerType
} from "@xyflow/react";
import { KeyRound, Link2, Plus, Table2 } from "lucide-react";
import type { SqlProject, SqlTable } from "@/core/schema/types";

type TableNodeData = { table: SqlTable };
type TableNodeType = Node<TableNodeData, "table">;

function TableNodeCard({ data, selected }: NodeProps<TableNodeType>) {
  const { table } = data;

  return (
    <article className={`diagram-table-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} className="diagram-handle" />
      <header className="diagram-node-head">
        <span className="diagram-node-icon"><Table2 size={14} /></span>
        <strong>{table.name}</strong>
        <small>{table.columns.length} {table.columns.length === 1 ? "COLUMN" : "COLUMNS"}</small>
      </header>
      <div className="diagram-node-columns">
        {table.columns.map((column) => (
          <div className="diagram-node-column" key={column.id}>
            <span className="diagram-column-name">
              {column.primaryKey && <KeyRound size={11} />}
              {column.unique && !column.primaryKey && <Link2 size={11} />}
              <b>{column.name}</b>
            </span>
            <span className="diagram-column-type">
              {column.type}{column.type === "VARCHAR" ? `(${column.length ?? 255})` : ""}
            </span>
            <span className="diagram-column-rules">
              {column.primaryKey && <i className="marker-pk">PK</i>}
              {column.unique && !column.primaryKey && <i className="marker-uq">UQ</i>}
              {!column.nullable && <i className="marker-nn">NN</i>}
            </span>
          </div>
        ))}
        {!table.columns.length && <p className="diagram-no-columns">No columns yet</p>}
      </div>
      <Handle type="source" position={Position.Right} className="diagram-handle" />
    </article>
  );
}

const nodeTypes = { table: TableNodeCard };

export default function SchemaCanvas({
  project,
  onPositionChange,
  onAddTable,
  onSelectTable
}: {
  project: SqlProject;
  onPositionChange: (tableId: string, position: { x: number; y: number }) => void;
  onAddTable: () => void;
  onSelectTable: (tableId: string) => void;
}) {
  const initialNodes = useMemo<TableNodeType[]>(
    () => project.tables.map((table) => ({
      id: table.id,
      type: "table",
      position: table.position ?? { x: 80, y: 80 },
      data: { table },
      draggable: true
    })),
    [project.tables]
  );

  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  const edges = useMemo<Edge[]>(() => project.relations.map((relation) => {
    const sourceTable = project.tables.find((table) => table.id === relation.sourceTableId);
    const targetTable = project.tables.find((table) => table.id === relation.targetTableId);
    const sourceColumn = sourceTable?.columns.find((column) => column.id === relation.sourceColumnId);
    const targetColumn = targetTable?.columns.find((column) => column.id === relation.targetColumnId);

    return {
      id: relation.id,
      source: relation.sourceTableId,
      target: relation.targetTableId,
      type: "smoothstep",
      label: sourceColumn && targetColumn ? `${sourceColumn.name} → ${targetColumn.name}` : relation.name,
      labelStyle: { fill: "#50647b", fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.98 },
      labelBgPadding: [7, 4] as [number, number],
      labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#7b91aa" },
      style: { stroke: "#8298b0", strokeWidth: 1.8 }
    };
  }), [project.relations, project.tables]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    onPositionChange(node.id, node.position);
  }, [onPositionChange]);

  return (
    <div className="schema-canvas">
      <div className="canvas-caption">
        <div className="canvas-caption-copy">
          <span className="canvas-live"><i /> CANVAS</span>
          <span>{project.tables.length} TABLES <b>·</b> {project.relations.length} CONNECTIONS</span>
        </div>
        <div className="canvas-actions">
          <span>Drag to move <b>·</b> Scroll to zoom</span>
          <button type="button" onClick={onAddTable}><Plus size={14} /> Add table</button>
        </div>
      </div>
      <div className="schema-flow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={(_event, node) => onSelectTable(node.id)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.25}
          maxZoom={1.6}
          defaultEdgeOptions={{ type: "smoothstep" }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#d7e0e9" />
          <Controls />
          <MiniMap
            pannable
            zoomable
            nodeColor="#7893b1"
            maskColor="rgba(225, 232, 240, 0.72)"
          />
        </ReactFlow>
        {!project.tables.length && (
          <div className="canvas-first-node">
            <span><Table2 size={18} /></span>
            <strong>Start with your first table</strong>
            <p>Add a table to begin mapping your database.</p>
            <button type="button" onClick={onAddTable}><Plus size={14} /> Create table</button>
          </div>
        )}
      </div>
    </div>
  );
}
