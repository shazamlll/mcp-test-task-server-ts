import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { expect, it } from "vitest";

function textOf(result: unknown): string {
  const parsed = CallToolResultSchema.parse(result);
  expect(parsed.content).toHaveLength(1);
  const content = parsed.content[0];
  if (content?.type !== "text") throw new Error("Expected a text tool result");
  return content.text;
}

it("speaks MCP over a subprocess and exercises all three tools and both outcomes", async () => {
  // Absolute entrypoint and process.execPath work with spaces and on Windows.
  // Launch outside the repo to catch accidental working-directory dependencies.
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    cwd: tmpdir(),
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", (chunk) => { stderr += String(chunk); });
  const client = new Client({ name: "test-task-smoke", version: "1.0.0" });
  const protocolErrors: Error[] = [];
  client.onerror = (error) => protocolErrors.push(error);
  const requestOptions = { timeout: 2_000 };

  const call = (name: string, args: Record<string, unknown>) =>
    client.callTool({ name, arguments: args }, undefined, requestOptions);

  const successfulJson = async (name: string, args: Record<string, unknown>) => {
    const result = await call(name, args);
    expect(result.isError).not.toBe(true);
    return JSON.parse(textOf(result));
  };

  try {
    // connect performs the real initialize/initialized handshake.
    await client.connect(transport, { timeout: 5_000 });
    expect(client.getServerVersion()?.name).toBe("mcp-test-task-server");
    const discovery = await client.listTools({}, requestOptions);
    expect(discovery.tools.map((tool) => tool.name).sort()).toEqual([
      "get_task_result", "list_test_tasks", "submit_test_task",
    ]);
    expect(await successfulJson("list_test_tasks", {})).toEqual([]);

    const submitted: { taskId: string; expectedOutcome: string }[] = [];
    for (const expectedOutcome of ["passed", "failed"]) {
      const task = await successfulJson("submit_test_task", {
        name: `synthetic-${expectedOutcome}`,
        target: "fictional-bookstore",
        params: { expectedOutcome },
      });
      expect(task.taskId).toEqual(expect.any(String));
      expect(task.status).toBe("queued");
      submitted.push({ taskId: task.taskId, expectedOutcome });
    }
    expect(new Set(submitted.map((task) => task.taskId)).size).toBe(2);

    for (const task of submitted) {
      const deadline = Date.now() + 5_000;
      let result;
      do {
        result = await successfulJson("get_task_result", { taskId: task.taskId });
        expect(result.taskId).toBe(task.taskId);
        expect(["queued", "running", "passed", "failed"]).toContain(result.status);
        if (result.status === "passed" || result.status === "failed") break;
        await delay(20);
      } while (Date.now() < deadline);
      expect(result.status).toBe(task.expectedOutcome);
      expect(result.resultSummary).toContain(task.expectedOutcome);
      expect(Number.isNaN(Date.parse(result.updatedAt))).toBe(false);
    }

    const unknown = await call("get_task_result", { taskId: "task-does-not-exist" });
    expect(unknown.isError).toBe(true);
    expect(textOf(unknown)).toContain("task-does-not-exist");

    // Test schema validation AND handler validation, then verify recovery.
    for (const args of [
      { name: 42, target: "fictional-bookstore" },
      { name: "   ", target: "fictional-bookstore" },
      { name: "synthetic", target: "   " },
    ]) {
      expect((await call("submit_test_task", args)).isError).toBe(true);
    }
    const listed = await successfulJson("list_test_tasks", {});
    expect(listed.map((task: { taskId: string; status: string }) => ({
      taskId: task.taskId, expectedOutcome: task.status,
    }))).toEqual(submitted);
    expect(protocolErrors).toEqual([]);
  } catch (error) {
    throw new Error(`MCP subprocess smoke failed. Server stderr:\n${stderr}`, { cause: error });
  } finally {
    // SDK close ends stdin and terminates an unresponsive subprocess.
    await client.close();
    await transport.close();
  }
}, 20_000);
