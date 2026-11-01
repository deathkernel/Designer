export type SqlDialect = "postgresql" | "mysql" | "sqlite";

export type SqlColumnType =
  | "INT" | "BIGINT" | "SMALLINT"
  | "VARCHAR" | "TEXT" | "BOOLEAN"
  | "DATE" | "TIMESTAMP" | "DECIMAL"
  | "FLOAT" | "UUID" | "JSON";

export interface SqlColumn {
  id: string;
  name: string;
  type: SqlColumnType;
  length?: number;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  defaultValue?: string;
}

export interface SqlTable {
  id: string;
  name: string;
  columns: SqlColumn[];
  position: { x: number; y: number };
}

export interface SqlRelation {
  id: string;
  name: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  onDelete: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}

export interface SqlProject {
  id: string;
  name: string;
  description: string;
  dialect: SqlDialect;
  tables: SqlTable[];
  relations: SqlRelation[];
  createdAt: string;
  updatedAt: string;
}

export const SQL_COLUMN_TYPES: SqlColumnType[] = [
  "INT", "BIGINT", "SMALLINT", "VARCHAR", "TEXT", "BOOLEAN",
  "DATE", "TIMESTAMP", "DECIMAL", "FLOAT", "UUID", "JSON"
];
