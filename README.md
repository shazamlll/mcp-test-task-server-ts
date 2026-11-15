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
npm ci
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

Run the full verification suite (build, unit tests, and a real MCP SDK client
talking to a separate server process over stdio):

```bash
npm test
```

Run only the subprocess smoke test:

```bash
npm run test:smoke
```

The smoke test initializes an MCP session, discovers all three tools, submits
synthetic passing and failing tasks, polls both to their terminal states, and
checks listing, unknown task IDs, invalid inputs, and recovery after errors.
Requests and polling have time limits, and the subprocess is closed even if an
assertion fails. Unit lifecycle tests use a controlled clock to avoid depending
on short wall-clock timing windows.

On 2026-11-15, `npm ci`, `npm run build`, `npm test` (12 tests), and
`npm run test:smoke` passed locally on Windows with Node.js 24.14.1. This validates
the SDK/stdio integration; **Claude Code / Claude Desktop integration remains
unverified**. No Claude executable was found on PATH or in the standard local
CLI/npm/desktop installation locations checked on that machine.

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
the client. On Windows, forward slashes are valid in the JSON path, for example
`E:/projects/mcp-test-task-server-ts/dist/index.js`. Run `npm run build` before
connecting. These are examples; the test commands do not change client settings.

For a hands-on host check, verify that the client discovers all three tools,
submit two tasks with `params.expectedOutcome` set to `"passed"` and `"failed"`,
poll each with `get_task_result`, and confirm both appear in `list_test_tasks`.
Also request an unknown ID and confirm it returns a tool error. SDK smoke success
does not replace this host-specific check.

## Project layout

```
src/
  index.ts       MCP server wiring (stdio transport, tool registration)
  tools.ts       Tool handlers (pure functions over the store — unit tested)
  store.ts       In-memory task store + fake worker
  store.test.ts  Task lifecycle tests
  tools.test.ts  Tool handler tests
tests/
  mcp.integration.test.ts  MCP SDK client + subprocess smoke test
```

## Remaining work

- [x] Repeatable MCP SDK subprocess integration check, including pass/fail and error paths
- [ ] Verify the server hands-on inside Claude Code / Claude Desktop with the config above
- [ ] (Optional) Publish to npm so clients can run it via `npx`
- [ ] (Optional) Add an HTTP transport alongside stdio

## License

MIT — see [LICENSE](LICENSE).
