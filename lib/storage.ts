import type { Project } from "@/lib/types";

const STORAGE_KEY = "planforge.projects.v2";

export function readProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((project) => ({
      ...project,
      notes: project.notes ?? {},
      items: Array.isArray(project.items) ? project.items : [],
      objective: project.objective ?? "",
      status: project.status ?? "Planning",
      progress: typeof project.progress === "number" ? project.progress : 0
    }));
  } catch {
    return [];
  }
}

export function writeProjects(projects: Project[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("PlanForge could not save projects locally.", error);
  }
}
