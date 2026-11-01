"use client";

import { create } from "zustand";
import { SqlProject, SqlTable, SqlColumn, SqlRelation, SqlDialect } from "@/core/schema/types";
import { createInitialProject } from "@/core/schema/initial-project";
import { createId } from "@/core/schema/create-id";

interface ProjectState {
  projects: SqlProject[];
  activeProjectId: string | null;
  hydrated: boolean;
  hydrate: () => void;
  createProject: (name: string, description: string, dialect: SqlDialect) => string;
  openProject: (id: string) => void;
  updateProject: (id: string, patch: Partial<SqlProject>) => void;
  addTable: (projectId: string, name: string) => void;
  updateTable: (projectId: string, tableId: string, patch: Partial<SqlTable>) => void;
  deleteTable: (projectId: string, tableId: string) => void;
  addColumn: (projectId: string, tableId: string) => void;
  updateColumn: (projectId: string, tableId: string, columnId: string, patch: Partial<SqlColumn>) => void;
  deleteColumn: (projectId: string, tableId: string, columnId: string) => void;
  addRelation: (projectId: string, relation: Omit<SqlRelation, "id">) => void;
  deleteRelation: (projectId: string, relationId: string) => void;
}

const STORAGE_KEY = "projectforge.sql.projects";

function persist(projects: SqlProject[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined" || get().hydrated) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const projects = raw ? JSON.parse(raw) as SqlProject[] : [];
      set({ projects, hydrated: true });
    } catch {
      set({ projects: [], hydrated: true });
    }
  },

  createProject: (name, description, dialect) => {
    const project = { ...createInitialProject(name), description, dialect };
    const projects = [project, ...get().projects];
    persist(projects);
    set({ projects, activeProjectId: project.id });
    return project.id;
  },

  openProject: (id) => set({ activeProjectId: id }),

  updateProject: (id, patch) => {
    const projects = get().projects.map((project) =>
      project.id === id ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project
    );
    persist(projects);
    set({ projects });
  },

  addTable: (projectId, name) => {
    const table: SqlTable = {
      id: createId(),
      name,
      columns: [{
        id: createId(), name: "id", type: "INT", nullable: false,
        primaryKey: true, unique: true, autoIncrement: true
      }],
      position: { x: 100 + get().projects.find((p) => p.id === projectId)!.tables.length * 40, y: 100 }
    };
    get().updateProject(projectId, {
      tables: [...(get().projects.find((p) => p.id === projectId)?.tables ?? []), table]
    });
  },

  updateTable: (projectId, tableId, patch) => {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return;
    get().updateProject(projectId, {
      tables: project.tables.map((table) => table.id === tableId ? { ...table, ...patch } : table)
    });
  },

  deleteTable: (projectId, tableId) => {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return;
    const columns = project.tables.find((table) => table.id === tableId)?.columns ?? [];
    const columnIds = new Set(columns.map((column) => column.id));
    get().updateProject(projectId, {
      tables: project.tables.filter((table) => table.id !== tableId),
      relations: project.relations.filter((relation) =>
        relation.sourceTableId !== tableId && relation.targetTableId !== tableId &&
        !columnIds.has(relation.sourceColumnId) && !columnIds.has(relation.targetColumnId)
      )
    });
  },

  addColumn: (projectId, tableId) => {
    const project = get().projects.find((item) => item.id === projectId);
    const table = project?.tables.find((item) => item.id === tableId);
    if (!project || !table) return;
    const column: SqlColumn = {
      id: createId(), name: `column_${table.columns.length + 1}`,
      type: "VARCHAR", length: 255, nullable: true, primaryKey: false,
      unique: false, autoIncrement: false
    };
    get().updateTable(projectId, tableId, { columns: [...table.columns, column] });
  },

  updateColumn: (projectId, tableId, columnId, patch) => {
    const project = get().projects.find((item) => item.id === projectId);
    const table = project?.tables.find((item) => item.id === tableId);
    if (!project || !table) return;
    get().updateTable(projectId, tableId, {
      columns: table.columns.map((column) => column.id === columnId ? { ...column, ...patch } : column)
    });
  },

  deleteColumn: (projectId, tableId, columnId) => {
    const project = get().projects.find((item) => item.id === projectId);
    const table = project?.tables.find((item) => item.id === tableId);
    if (!project || !table) return;
    get().updateProject(projectId, {
      tables: project.tables.map((item) => item.id === tableId
        ? { ...item, columns: item.columns.filter((column) => column.id !== columnId) } : item),
      relations: project.relations.filter((relation) =>
        relation.sourceColumnId !== columnId && relation.targetColumnId !== columnId
      )
    });
  },

  addRelation: (projectId, relation) => {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return;
    get().updateProject(projectId, {
      relations: [...project.relations, { ...relation, id: createId() }]
    });
  },

  deleteRelation: (projectId, relationId) => {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return;
    get().updateProject(projectId, {
      relations: project.relations.filter((relation) => relation.id !== relationId)
    });
  }
}));
