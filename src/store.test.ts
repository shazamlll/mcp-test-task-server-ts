import { describe, expect, it } from "vitest";
import { TaskStore } from "./store.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("TaskStore", () => {
  it("submits a task in queued state with an id", () => {
    const store = new TaskStore();
    const task = store.submit("smoke-login", "staging-web");
    expect(task.id).toBe("task-1");
    expect(task.status).toBe("queued");
    expect(task.name).toBe("smoke-login");
    expect(task.target).toBe("staging-web");
    expect(task.resultSummary).toBeNull();
  });

  it("moves a task through queued -> running -> terminal state", async () => {
    const store = new TaskStore({ queueDelayMs: 5, runDelayMs: 10 });
    const task = store.submit("smoke-login", "staging-web", { expectedOutcome: "passed" });

    await sleep(8);
    expect(store.get(task.id)?.status).toBe("running");

    await sleep(20);
    const done = store.get(task.id);
    expect(done?.status).toBe("passed");
    expect(done?.resultSummary).toContain("passed");
    expect(done?.resultSummary).toContain("smoke-login");
  });

  it("honours an explicit expectedOutcome of failed", async () => {
    const store = new TaskStore({ queueDelayMs: 5, runDelayMs: 10 });
    const task = store.submit("checkout-flow", "staging-web", { expectedOutcome: "failed" });
    await sleep(40);
    const done = store.get(task.id);
    expect(done?.status).toBe("failed");
    expect(done?.resultSummary).toContain("failed");
  });

  it("derives a deterministic outcome without an override", async () => {
    const first = new TaskStore({ queueDelayMs: 5, runDelayMs: 10 });
    const second = new TaskStore({ queueDelayMs: 5, runDelayMs: 10 });
    const a = first.submit("same-name", "staging-web");
    const b = second.submit("same-name", "staging-web");
    await sleep(40);
    // Same name -> same deterministic outcome in both stores.
    expect(first.get(a.id)?.status).toBe(second.get(b.id)?.status);
    expect(["passed", "failed"]).toContain(first.get(a.id)?.status);
  });

  it("returns undefined for an unknown id", () => {
    const store = new TaskStore();
    expect(store.get("task-999")).toBeUndefined();
  });

  it("lists tasks in submission order", () => {
    const store = new TaskStore();
    store.submit("task-a", "staging-web");
    store.submit("task-b", "staging-web");
    const tasks = store.list();
    expect(tasks.map((t) => t.name)).toEqual(["task-a", "task-b"]);
    expect(tasks.map((t) => t.id)).toEqual(["task-1", "task-2"]);
  });
});
