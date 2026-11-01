import type { ProjectRoadmap, RoadmapTask } from "@/lib/types";

export type ScheduledTask = {
  task: RoadmapTask;
  startDay: number;
  finishDay: number;
  latestStartDay: number;
  slackDays: number;
  critical: boolean;
};

export type RoadmapSchedule = {
  tasks: ScheduledTask[];
  taskById: Record<string, ScheduledTask>;
  totalDurationDays: number;
  criticalPath: string[];
  hasCycle: boolean;
  warnings: string[];
};

export function calculateRoadmapSchedule(roadmap: ProjectRoadmap): RoadmapSchedule {
  const tasks = roadmap.tasks;
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const warnings: string[] = [];
  const incoming = new Map<string, number>();
  const successors = new Map<string, string[]>();

  for (const task of tasks) {
    incoming.set(task.id, 0);
    successors.set(task.id, []);
  }

  for (const task of tasks) {
    const validDependencies = [...new Set(task.dependsOn)].filter((id) => byId.has(id) && id !== task.id);
    if (validDependencies.length !== task.dependsOn.length) {
      warnings.push("Some invalid or duplicate dependencies were ignored for " + task.title + ".");
    }
    incoming.set(task.id, validDependencies.length);
    for (const dependencyId of validDependencies) {
      successors.get(dependencyId)?.push(task.id);
    }
  }

  const ready = tasks.filter((task) => (incoming.get(task.id) ?? 0) === 0).map((task) => task.id);
  const order: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift();
    if (!id) continue;
    order.push(id);
    for (const nextId of successors.get(id) ?? []) {
      const remaining = (incoming.get(nextId) ?? 0) - 1;
      incoming.set(nextId, remaining);
      if (remaining === 0) ready.push(nextId);
    }
  }

  if (order.length !== tasks.length) {
    const cycleIds = tasks.filter((task) => !order.includes(task.id)).map((task) => task.id);
    warnings.push("Circular dependencies detected. Fix the dependency links before using this schedule.");
    return {
      tasks: [],
      taskById: {},
      totalDurationDays: 0,
      criticalPath: cycleIds,
      hasCycle: true,
      warnings
    };
  }

  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();
  for (const id of order) {
    const task = byId.get(id);
    if (!task) continue;
    const start = Math.max(0, ...task.dependsOn.map((dependencyId) => earliestFinish.get(dependencyId) ?? 0));
    earliestStart.set(id, start);
    earliestFinish.set(id, start + Math.max(1, task.durationDays));
  }

  const totalDurationDays = Math.max(0, ...earliestFinish.values());
  const latestStart = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const taskSuccessors = successors.get(id) ?? [];
    const latestFinish = taskSuccessors.length
      ? Math.min(...taskSuccessors.map((successorId) => latestStart.get(successorId) ?? totalDurationDays))
      : totalDurationDays;
    const task = byId.get(id);
    if (!task) continue;
    latestStart.set(id, latestFinish - Math.max(1, task.durationDays));
  }

  const scheduled = tasks.map((task) => {
    const startDay = earliestStart.get(task.id) ?? 0;
    const finishDay = earliestFinish.get(task.id) ?? startDay + Math.max(1, task.durationDays);
    const latestStartDay = latestStart.get(task.id) ?? startDay;
    const slackDays = Math.max(0, latestStartDay - startDay);
    return {
      task,
      startDay,
      finishDay,
      latestStartDay,
      slackDays,
      critical: slackDays === 0
    };
  }).sort((a, b) => a.startDay - b.startDay || a.task.phaseId.localeCompare(b.task.phaseId) || a.task.title.localeCompare(b.task.title));

  return {
    tasks: scheduled,
    taskById: Object.fromEntries(scheduled.map((item) => [item.task.id, item])),
    totalDurationDays,
    criticalPath: scheduled.filter((item) => item.critical).map((item) => item.task.id),
    hasCycle: false,
    warnings
  };
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(date + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return "";
  const startingWeekday = parsed.getDay();
  if (startingWeekday === 6) parsed.setDate(parsed.getDate() + 2);
  if (startingWeekday === 0) parsed.setDate(parsed.getDate() + 1);
  let remaining = Math.max(0, Math.floor(days));
  while (remaining > 0) {
    parsed.setDate(parsed.getDate() + 1);
    const weekday = parsed.getDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

export function formatScheduleDate(startDate: string, dayOffset: number): string {
  const value = addDays(startDate, dayOffset);
  if (!value) return "Not scheduled";
  return new Date(value + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
