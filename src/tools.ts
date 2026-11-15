/**
 * Tool handlers, kept free of MCP plumbing so they are easy to unit test.
 * Each handler returns an MCP tool-result object.
 */
import type { TaskStore } from "./store.js";

export interface ToolResult {
  // Index signature so the object is assignable to the MCP SDK's
  // CallToolResult type when used as a tool handler return value.
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

function textResult(value: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export interface SubmitTestTaskArgs {
  name: string;
  target: string;
  params?: Record<string, unknown>;
}

export function submitTestTask(store: TaskStore, args: SubmitTestTaskArgs): ToolResult {
  const name = args.name.trim();
  const target = args.target.trim();
  if (!name) {
    return errorResult('Error: "name" must be a non-empty string.');
  }
  if (!target) {
    return errorResult('Error: "target" must be a non-empty string.');
  }
  const task = store.submit(name, target, args.params ?? {});
  return textResult({
    taskId: task.id,
    name: task.name,
    target: task.target,
    status: task.status,
    message: `Task ${task.id} accepted and queued. Poll get_task_result for the outcome.`,
  });
}

export function getTaskResult(store: TaskStore, taskId: string): ToolResult {
  const task = store.get(taskId.trim());
  if (!task) {
    return errorResult(`Error: no task found with id "${taskId}".`);
  }
  return textResult({
    taskId: task.id,
    name: task.name,
    target: task.target,
    status: task.status,
    resultSummary: task.resultSummary,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  });
}

export function listTestTasks(store: TaskStore): ToolResult {
  return textResult(
    store.list().map((task) => ({
      taskId: task.id,
      name: task.name,
      target: task.target,
      status: task.status,
      resultSummary: task.resultSummary,
    })),
  );
}
