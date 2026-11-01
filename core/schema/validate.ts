import { SqlProject } from "./types";

export interface SchemaIssue {
  severity: "error" | "warning";
  message: string;
}

export function validateProject(project: SqlProject): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const tableNames = new Set<string>();

  for (const table of project.tables) {
    if (!table.name.trim()) issues.push({ severity: "error", message: "A table has an empty name." });
    const normalizedTableName = table.name.trim().toLowerCase();
    if (tableNames.has(normalizedTableName)) {
      issues.push({ severity: "error", message: `Duplicate table name: ${table.name}` });
    }
    tableNames.add(normalizedTableName);

    if (!table.columns.length) {
      issues.push({ severity: "warning", message: `${table.name || "Unnamed table"} has no columns.` });
    }

    const columnNames = new Set<string>();
    for (const column of table.columns) {
      if (!column.name.trim()) issues.push({ severity: "error", message: `A column in ${table.name} has an empty name.` });
      const normalizedColumnName = column.name.trim().toLowerCase();
      if (columnNames.has(normalizedColumnName)) {
        issues.push({ severity: "error", message: `Duplicate column ${column.name} in ${table.name}.` });
      }
      columnNames.add(normalizedColumnName);
      if (column.primaryKey && column.nullable) {
        issues.push({ severity: "error", message: `Primary key ${table.name}.${column.name} cannot be nullable.` });
      }
    }

    if (table.columns.filter((column) => column.primaryKey).length > 1) {
      issues.push({ severity: "warning", message: `${table.name} has a composite primary key.` });
    }
  }

  for (const relation of project.relations) {
    const source = project.tables.find((table) => table.id === relation.sourceTableId);
    const target = project.tables.find((table) => table.id === relation.targetTableId);
    const sourceColumn = source?.columns.find((column) => column.id === relation.sourceColumnId);
    const targetColumn = target?.columns.find((column) => column.id === relation.targetColumnId);
    if (!source || !target || !sourceColumn || !targetColumn) {
      issues.push({ severity: "error", message: `Relationship ${relation.name} points to a missing table or column.` });
      continue;
    }

    if (source.id === target.id) {
      issues.push({ severity: "error", message: `Relationship ${relation.name} cannot reference the same table.` });
    }

    if (!targetColumn.primaryKey && !targetColumn.unique) {
      issues.push({ severity: "error", message: `Referenced column ${target.name}.${targetColumn.name} must be a primary key or unique.` });
    }

    if (relation.onDelete === "SET NULL" && !sourceColumn.nullable) {
      issues.push({ severity: "error", message: `Relationship ${relation.name} uses SET NULL, but ${source.name}.${sourceColumn.name} is NOT NULL.` });
    }

    if (sourceColumn.type !== targetColumn.type) {
      issues.push({ severity: "warning", message: `Relationship ${relation.name} connects different column types (${sourceColumn.type} and ${targetColumn.type}).` });
    }
  }

  return issues;
}
