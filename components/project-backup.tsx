"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, FileUp, ShieldCheck } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/types";

type Props = {
  projects: Project[];
  onImport: (projects: Project[]) => void;
};

const validStatuses: ProjectStatus[] = ["Planning", "In progress", "On hold", "Completed"];

export function ProjectBackup({ projects, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function exportBackup() {
    const payload = {
      format: "planforge-project-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      projects
    };
    const file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "planforge-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setError("");
    setMessage("Backup exported. Keep the JSON file somewhere safe.");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    if (file.size > 25 * 1024 * 1024) {
      setError("Backup is larger than 25 MB. Choose a smaller PlanForge backup.");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object") throw new Error("This file is not a PlanForge backup.");
      const payload = parsed as { format?: string; version?: number; projects?: unknown };
      if (payload.format !== "planforge-project-backup" || payload.version !== 1 || !Array.isArray(payload.projects)) {
        throw new Error("Unsupported backup format. Import a PlanForge JSON backup exported from this app.");
      }
      const imported = payload.projects.filter((entry): entry is Record<string, unknown> => {
        if (!entry || typeof entry !== "object") return false;
        const project = entry as Record<string, unknown>;
        return typeof project.name === "string" && typeof project.type === "string";
      }).map((entry): Project => ({
        ...(entry as unknown as Project),
        id: crypto.randomUUID(),
        name: String(entry.name).slice(0, 100),
        type: String(entry.type).slice(0, 100),
        objective: typeof entry.objective === "string" ? entry.objective : "",
        status: validStatuses.includes(entry.status as ProjectStatus) ? entry.status as ProjectStatus : "Planning",
        progress: typeof entry.progress === "number" ? Math.min(100, Math.max(0, entry.progress)) : 0,
        updatedAt: new Date().toISOString(),
        notes: entry.notes && typeof entry.notes === "object" ? entry.notes as Project["notes"] : {},
        items: Array.isArray(entry.items) ? entry.items as Project["items"] : []
      }));
      if (!imported.length) throw new Error("No valid projects were found in this backup.");
      onImport(imported);
      setMessage(imported.length + " project(s) imported as new copies. Existing projects were not replaced.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this backup file.");
    }
  }

  return (
    <section className="project-backup-panel">
      <div className="project-backup-copy">
        <span className="project-backup-icon"><ShieldCheck size={16}/></span>
        <div><strong>Local project backup</strong><p>Export your work or import a backup as separate copies. Nothing is uploaded.</p></div>
      </div>
      <div className="project-backup-actions">
        <input ref={inputRef} type="file" accept="application/json,.json" onChange={importBackup} hidden/>
        <button type="button" className="button button-secondary button-small" onClick={() => inputRef.current?.click()}><FileUp size={13}/> Import backup</button>
        <button type="button" className="button button-primary button-small" onClick={exportBackup} disabled={!projects.length}><Download size={13}/> Export all</button>
      </div>
      {(message || error) && <p className={error ? "backup-feedback backup-error" : "backup-feedback"}>{error || message}</p>}
    </section>
  );
}
