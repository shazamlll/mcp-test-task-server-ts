#!/usr/bin/env node
/**
 * MCP server (stdio transport) for test-task scheduling.
 *
 * Tools:
 *  - submit_test_task: queue a test task, returns a task id
 *  - get_task_result:  poll a task by id for status + result summary
 *  - list_test_tasks:  list all tasks with their statuses
 *
 * Tasks live in memory only and are executed by a fake worker
 * (see src/store.ts). Nothing here connects to a real test system.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TaskStore } from "./store.js";
import { submitTestTask, getTaskResult, listTestTasks } from "./tools.js";

const store = new TaskStore();

const server = new McpServer({
  name: "mcp-test-task-server",
  version: "0.1.0",
});

server.registerTool(
  "submit_test_task",
  {
    title: "Submit a test task",
    description:
      "Queue a test task for execution. Returns a task id; poll get_task_result for the outcome. " +
      "Optional params.expectedOutcome ('passed' | 'failed') forces a deterministic outcome, useful for demos.",
    inputSchema: {
      name: z.string().min(1).describe("Human-readable task name, e.g. 'smoke-login'"),
      target: z.string().min(1).describe("What the task runs against, e.g. 'staging-web'"),
      params: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional task parameters, e.g. { browser: 'chromium', expectedOutcome: 'failed' }"),
    },
  },
  (args) => submitTestTask(store, args),
);

server.registerTool(
  "get_task_result",
  {
    title: "Get a task result",
    description: "Return the status and result summary of a test task by id.",
    inputSchema: {
      taskId: z.string().min(1).describe("Task id returned by submit_test_task, e.g. 'task-1'"),
    },
  },
  (args) => getTaskResult(store, args.taskId),
);

server.registerTool(
  "list_test_tasks",
  {
    title: "List test tasks",
    description: "List all submitted test tasks with their current statuses.",
    inputSchema: {},
  },
  () => listTestTasks(store),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Runs until the client disconnects; keep stdout reserved for MCP messages.
  console.error("mcp-test-task-server running on stdio");
}

main().catch((error: unknown) => {
  console.error("Failed to start mcp-test-task-server:", error);
  process.exit(1);
});
