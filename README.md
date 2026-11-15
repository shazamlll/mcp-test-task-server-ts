# mcp-test-task-server-ts

A small MCP server (stdio transport) for test-task scheduling, written in TypeScript.

> **Portfolio demo, not production.** This is a small public project built to
> demonstrate MCP server development in TypeScript. It does not connect to any
> real test system, and it does not represent production TypeScript experience.
> Tasks live in memory only and are "executed" by a fake worker with
> deterministic, simulated outcomes.

## What it does

Three tools, mirroring a simple test-task scheduling design:

| Tool | Description |
| --- | --- |
| `submit_test_task` | Queue a test task (task name + target + optional params). Returns a task id. |
| `get_task_result` | Poll a task by id for its status and result summary. |
| `list_test_tasks` | List all submitted tasks with their statuses. |

Task lifecycle: `queued` → `running` → `passed` / `failed`, driven by a fake
worker after short simulated delays. Outcomes are deterministic:

- `params.expectedOutcome` (`"passed"` | `"failed"`) forces an outcome — handy for demos;
- otherwise the outcome is derived from a hash of the task name (~80% pass).

## What it demonstrates

- MCP server development in TypeScript with `@modelcontextprotocol/sdk` (stdio transport, zod-validated tool schemas)
- A small, testable design: pure tool handlers over an in-memory store, unit-tested with Vitest
- Strict TypeScript (`strict: true`)

## Run it locally

Requires Node.js 20+.

```bash
npm install
npm run build
npm start
```

The server speaks MCP over stdio, so it needs an MCP client to talk to.
To try it interactively, the MCP Inspector works (optional):

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Example tool calls (as an MCP client would send them):

```json
// submit_test_task
{ "name": "smoke-login", "target": "staging-web" }

// submit_test_task — force a failure to see the failed path
{ "name": "checkout-flow", "target": "staging-web", "params": { "expectedOutcome": "failed" } }

// get_task_result
{ "taskId": "task-1" }

// list_test_tasks
{}
```

Run the tests:

```bash
npm test
```

## Example client configuration

Config snippet only — connect it to a client yourself. Claude Code (`.mcp.json`):

```json
{
  "mcpServers": {
    "test-task-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-test-task-server-ts/dist/index.js"]
    }
  }
}
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "test-task-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-test-task-server-ts/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/...` with the real path on your machine, then restart
the client.

## Project layout

```
src/
  index.ts       MCP server wiring (stdio transport, tool registration)
  tools.ts       Tool handlers (pure functions over the store — unit tested)
  store.ts       In-memory task store + fake worker
  store.test.ts  Task lifecycle tests
  tools.test.ts  Tool handler tests
```

## Remaining work

- [ ] Verify the server hands-on inside Claude Code / Claude Desktop with the config above
- [ ] (Optional) Publish to npm so clients can run it via `npx`
- [ ] (Optional) Add an HTTP transport alongside stdio

## License

MIT — see [LICENSE](LICENSE).
