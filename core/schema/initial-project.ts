import { SqlProject } from "./types";

export function createInitialProject(name = "Untitled database"): SqlProject {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name,
    description: "",
    dialect: "postgresql",
    tables: [],
    relations: [],
    createdAt: now,
    updatedAt: now
  };
}
