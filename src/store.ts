/**
 * In-memory test-task store with a fake worker.
 *
 * The worker moves tasks through: queued -> running -> passed | failed
 * after short simulated delays. Nothing here talks to a real test system:
 * outcomes are deterministic so the lifecycle is demonstrable on its own.
 *
 * Outcome rule:
 *  - if the caller passes params.expectedOutcome ("passed" | "failed"), use it;
 *  - otherwise derive it from a hash of the task name (4 out of 5 pass).
 */

export type TaskStatus = "queued" | "running" | "passed" | "failed";

export interface TestTask {
  id: string;
  name: string;
  target: string;
  params: Record<string, unknown>;
  status: TaskStatus;
  resultSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStoreOptions {
  /** queued -> running delay (ms). Default 50. */
  queueDelayMs?: number;
  /** running -> terminal delay (ms). Default 200. */
  runDelayMs?: number;
}

const FAILING_CHECKS = [
  "login form renders the submit button",
  "search returns results within 2s",
  "checkout total matches the cart",
  "session survives a page reload",
  "error toast shows for an invalid coupon",
];

function hashName(name: string): number {
  let h = 0;
  for (const ch of name) {
    h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return h;
}

function outcomeFor(name: string, params: Record<string, unknown>): "passed" | "failed" {
  const override = params.expectedOutcome;
  if (override === "passed" || override === "failed") {
    return override;
  }
  // Deterministic: ~80% pass, ~20% fail.
  return hashName(name) % 5 === 0 ? "failed" : "passed";
}

function resultSummaryFor(task: TestTask, outcome: "passed" | "failed"): string {
  const hash = hashName(task.name);
  const checkCount = 2 + (hash % 5); // 2..6 checks
  const durationMs = 120 + (hash % 400); // 120..519 ms
  if (outcome === "passed") {
    return (
      `Task "${task.name}" on ${task.target} passed in ${durationMs}ms ` +
      `(${checkCount} checks, 0 failures).`
    );
  }
  const failingCheck = FAILING_CHECKS[hash % FAILING_CHECKS.length];
  return (
    `Task "${task.name}" on ${task.target} failed in ${durationMs}ms ` +
    `(${checkCount} checks, 1 failure: "${failingCheck}").`
  );
}

export class TaskStore {
  private tasks = new Map<string, TestTask>();
  private seq = 0;
  private readonly queueDelayMs: number;
  private readonly runDelayMs: number;

  constructor(options: TaskStoreOptions = {}) {
    this.queueDelayMs = options.queueDelayMs ?? 50;
    this.runDelayMs = options.runDelayMs ?? 200;
  }

  submit(name: string, target: string, params: Record<string, unknown> = {}): TestTask {
    const now = new Date().toISOString();
    const task: TestTask = {
      id: `task-${++this.seq}`,
      name,
      target,
      params,
      status: "queued",
      resultSummary: null,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);

    // Fake worker: queued -> running -> terminal state.
    setTimeout(() => {
      task.status = "running";
      task.updatedAt = new Date().toISOString();
    }, this.queueDelayMs);
    setTimeout(() => {
      const outcome = outcomeFor(task.name, task.params);
      task.status = outcome;
      task.resultSummary = resultSummaryFor(task, outcome);
      task.updatedAt = new Date().toISOString();
    }, this.queueDelayMs + this.runDelayMs);

    return task;
  }

  get(id: string): TestTask | undefined {
    return this.tasks.get(id);
  }

  list(): TestTask[] {
    return [...this.tasks.values()];
  }
}
