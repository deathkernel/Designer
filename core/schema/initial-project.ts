import { SqlProject } from "./types";
import { createId } from "./create-id";

export function createInitialProject(name = "Untitled database"): SqlProject {
  const now = new Date().toISOString();

  return {
    id: createId(),
    name,
    description: "",
    dialect: "postgresql",
    tables: [],
    relations: [],
    createdAt: now,
    updatedAt: now
  };
}
