import { describe, expect, it } from "vitest";
import { TaskStore } from "./store.js";
import { submitTestTask, getTaskResult, listTestTasks } from "./tools.js";

function textOf(result: { content: { type: string; text: string }[] }): string {
  return result.content[0]?.text ?? "";
}

describe("tool handlers", () => {
  it("submit_test_task returns a task id and queued status", () => {
    const store = new TaskStore();
    const result = submitTestTask(store, { name: "smoke-login", target: "staging-web" });
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(textOf(result)) as { taskId: string; status: string };
    expect(body.taskId).toBe("task-1");
    expect(body.status).toBe("queued");
  });

  it("submit_test_task rejects an empty name", () => {
    const store = new TaskStore();
    const result = submitTestTask(store, { name: "   ", target: "staging-web" });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("name");
  });

  it("get_task_result returns the submitted task", () => {
    const store = new TaskStore();
    submitTestTask(store, { name: "smoke-login", target: "staging-web" });
    const result = getTaskResult(store, "task-1");
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(textOf(result)) as { name: string; status: string };
    expect(body.name).toBe("smoke-login");
    expect(body.status).toBe("queued");
  });

  it("get_task_result reports an error for an unknown id", () => {
    const store = new TaskStore();
    const result = getTaskResult(store, "task-999");
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("task-999");
  });

  it("list_test_tasks lists submitted tasks with statuses", () => {
    const store = new TaskStore();
    submitTestTask(store, { name: "task-a", target: "staging-web" });
    submitTestTask(store, { name: "task-b", target: "staging-web" });
    const result = listTestTasks(store);
    const body = JSON.parse(textOf(result)) as { taskId: string; name: string; status: string }[];
    expect(body.map((t) => t.taskId)).toEqual(["task-1", "task-2"]);
    expect(body.every((t) => t.status === "queued")).toBe(true);
  });
});
