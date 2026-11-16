// Checks the agent commands of the server control socket (CR-011, AC-SA-01 to AC-SA-09). A real
// `ServerMode` listens on a Unix socket in a private temporary directory, and each request goes over
// that socket. The `agents` dependency is in memory: this proves the route contract, not the wiring
// to `AgentService`.
// Run: `bun scripts/server-agent-commands-e2e.ts`.
// Writes .openbot-build/server-agent-commands-e2e.json.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { runCauseEffect } from "../src/backend/effect-boundary";
import {
  ServerMode,
  type ServerModeAgent,
  type ServerModeAgents,
  type ServerModeOptions,
} from "../src/main/server-mode";

interface Reply {
  status: number;
  lines: Map<string, string>;
}

interface Entry {
  id: string;
  ok: boolean;
  detail: string;
}

const OUT = resolve(import.meta.dirname, "../.openbot-build/server-agent-commands-e2e.json");

/** A method that the agent routes and `GET /v1/status` never call. */
const unused = (): never => {
  throw new Error("This stub is not used by the agent routes.");
};
/** Stubs that answer `GET /v1/status`. The agent routes read none of them. */
const centralAuth: ServerModeOptions["centralAuth"] = {
  getState: () => ({ status: "signed_out" }),
  requestEmailCode: unused,
  cancelCompanySignIn: unused,
  verifyEmailCode: unused,
  canPersistSession: () => false,
  redeemServerClaim: unused,
  logout: unused,
  createMobileConnect: unused,
};
const host: ServerModeOptions["host"] = {
  getStatus: () => ({
    phase: "unconfigured",
    configured: false,
    enabledOnLaunch: false,
    serverId: null,
    serverName: null,
    apiUrl: null,
    logoUrl: null,
    apiOnline: false,
    remoteDesktopReady: false,
    remoteDesktopScreenRecordingDenied: false,
    remoteDesktopUnattended: false,
    remoteDesktopActiveSessions: 0,
    remoteDesktopMaxSessions: 0,
    message: null,
  }),
  configure: unused,
  start: unused,
  updateIdentity: unused,
  getMobileConnectHost: unused,
};

class MemoryAgents implements ServerModeAgents {
  readonly agents: ServerModeAgent[] = [];
  readonly createCalls: string[][] = [];
  #next = 1;
  list(): readonly ServerModeAgent[] {
    return this.agents.map((agent) => ({ ...agent }));
  }
  create(...args: [name: string]) {
    // The route passes the name and nothing else.
    this.createCalls.push(args);
    const [name] = args;
    const agent = { id: `agent-${this.#next++}`, name, localScripts: false };
    this.agents.push(agent);
    return Effect.succeed({ ...agent });
  }
  setLocalScripts(agentId: string, on: boolean) {
    const agent = this.agents.find((candidate) => candidate.id === agentId);
    if (!agent) return Effect.die(new Error("unknown agent in the test"));
    agent.localScripts = on;
    return Effect.succeed({ ...agent });
  }
}

async function send(socketPath: string, method: string, path: string, fields?: Record<string, string>): Promise<Reply> {
  const body = fields ? new URLSearchParams(fields).toString() : undefined;
  return new Promise((resolveReply, reject) => {
    const req = request(
      {
        socketPath,
        method,
        path,
        headers: body
          ? { "content-type": "application/x-www-form-urlencoded", "content-length": Buffer.byteLength(body) }
          : {},
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const lines = new Map<string, string>();
          for (const line of Buffer.concat(chunks).toString("utf8").split("\n")) {
            const at = line.indexOf("=");
            if (at > 0) lines.set(line.slice(0, at), line.slice(at + 1));
          }
          resolveReply({ status: response.statusCode ?? 0, lines });
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

function expectError(reply: Reply, status: number, error: string): void {
  assert.equal(reply.status, status);
  assert.equal(reply.lines.get("error"), error);
}

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "openbot-agent-commands-"));
  const results: Entry[] = [];
  const servers: ServerMode[] = [];
  const start = async (name: string, agents: ServerModeAgents | null): Promise<string> => {
    const { mkdir } = await import("node:fs/promises");
    const directory = join(root, name);
    await mkdir(directory, { mode: 0o700 });
    const controlSocketPath = join(directory, "control.sock");
    const server = new ServerMode({
      environment: { controlSocketPath, agentCommands: agents !== null },
      version: "e2e",
      centralAuth,
      host,
      memory: null,
      agents,
      onError: (message, error) => process.stderr.write(`${message} ${String(error)}\n`),
    });
    await runCauseEffect(server.listen());
    servers.push(server);
    return controlSocketPath;
  };
  const check = async (id: string, run: () => Promise<string>): Promise<void> => {
    try {
      results.push({ id, ok: true, detail: await run() });
    } catch (error) {
      results.push({ id, ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  };

  try {
    const offSocket = await start("off", null);
    const store = new MemoryAgents();
    const onSocket = await start("on", store);

    await check("AC-SA-01", async () => {
      const replies = [
        await send(offSocket, "GET", "/v1/agents"),
        await send(offSocket, "POST", "/v1/agents/create", { name: "CEO" }),
        await send(offSocket, "POST", "/v1/agents/local-scripts", { agent: "x", state: "on" }),
      ];
      for (const reply of replies) expectError(reply, 403, "agent_commands_off");
      return "three routes answered 403 agent_commands_off";
    });

    await check("AC-SA-09", async () => {
      const empty = await send(onSocket, "GET", "/v1/agents");
      assert.equal(empty.status, 200);
      assert.equal(empty.lines.get("agents"), "0");
      assert.equal(empty.lines.has("agent_1"), false);
      store.agents.push({ id: "old-1", name: "Evil\u001b[31mName\r\nfake=1", localScripts: true });
      store.agents.push({ id: "old-2", name: "Plain", localScripts: false });
      const list = await send(onSocket, "GET", "/v1/agents");
      assert.equal(list.status, 200);
      assert.equal(list.lines.get("agents"), "2");
      assert.equal(list.lines.get("agent_1"), "old-1 on Evil[31mNamefake=1");
      assert.equal(list.lines.get("agent_2"), "old-2 off Plain");
      assert.equal(list.lines.has("fake"), false);
      for (const value of list.lines.values()) assert.doesNotMatch(value, /\p{Cc}/u);
      store.agents.length = 0;
      return "agents=0, then agents=2 with id, on or off, name; control characters removed";
    });

    await check("AC-SA-02", async () => {
      const reply = await send(onSocket, "POST", "/v1/agents/create", {
        name: "  CEO ",
        description: "x",
        initialMessage: "hello",
        message: "hello",
      });
      assert.equal(reply.status, 200);
      assert.equal(reply.lines.get("id"), "agent-1");
      assert.equal(reply.lines.get("name"), "CEO");
      assert.equal(reply.lines.get("local_scripts"), "off");
      assert.deepEqual(store.createCalls, [["CEO"]]);
      return "200 id=agent-1 name=CEO local_scripts=off; create got only the name";
    });

    await check("AC-SA-03", async () => {
      const before = store.agents.length;
      expectError(await send(onSocket, "POST", "/v1/agents/create", { name: "   " }), 400, "invalid_agent_name");
      expectError(await send(onSocket, "POST", "/v1/agents/create", {}), 400, "invalid_agent_name");
      expectError(
        await send(onSocket, "POST", "/v1/agents/create", { name: "x".repeat(81) }),
        400,
        "invalid_agent_name",
      );
      expectError(await send(onSocket, "POST", "/v1/agents/create", { name: "ceo" }), 409, "agent_exists");
      assert.equal(store.agents.length, before);
      return "empty and 81 characters: 400 invalid_agent_name; ceo: 409 agent_exists; no agent made";
    });

    await check("AC-SA-04", async () => {
      const reply = await send(onSocket, "POST", "/v1/agents/local-scripts", { agent: "ceo", state: "on" });
      assert.equal(reply.status, 200);
      assert.equal(reply.lines.get("local_scripts"), "on");
      assert.equal(reply.lines.get("id"), "agent-1");
      assert.equal(store.agents.find((agent) => agent.id === "agent-1")?.localScripts, true);
      return "agent=ceo state=on: 200 local_scripts=on, flag true";
    });

    await check("AC-SA-05", async () => {
      const reply = await send(onSocket, "POST", "/v1/agents/local-scripts", { agent: "agent-1", state: "on" });
      assert.equal(reply.status, 200);
      assert.equal(reply.lines.get("local_scripts"), "on");
      assert.equal(store.agents.length, 1);
      assert.equal(store.agents.find((agent) => agent.id === "agent-1")?.localScripts, true);
      return "second on by id: 200 local_scripts=on, one agent, flag still true";
    });

    await check("AC-SA-06", async () => {
      store.agents.push(
        { id: "dup-1", name: "Twin", localScripts: false },
        { id: "dup-2", name: "twin", localScripts: false },
      );
      const flags = () => JSON.stringify(store.agents.map((agent) => agent.localScripts));
      const before = flags();
      expectError(
        await send(onSocket, "POST", "/v1/agents/local-scripts", { agent: "nobody", state: "on" }),
        404,
        "agent_not_found",
      );
      expectError(
        await send(onSocket, "POST", "/v1/agents/local-scripts", { agent: "TWIN", state: "on" }),
        409,
        "agent_ambiguous",
      );
      expectError(
        await send(onSocket, "POST", "/v1/agents/local-scripts", { agent: "ceo", state: "yes" }),
        400,
        "invalid_state",
      );
      expectError(await send(onSocket, "POST", "/v1/agents/local-scripts", { agent: "ceo" }), 400, "invalid_state");
      assert.equal(flags(), before);
      // An id is exact and wins over a name, so one of two same-named agents can still be set.
      const byId = await send(onSocket, "POST", "/v1/agents/local-scripts", { agent: "dup-2", state: "on" });
      assert.equal(byId.status, 200);
      assert.equal(byId.lines.get("id"), "dup-2");
      return "404 agent_not_found, 409 agent_ambiguous, 400 invalid_state; no flag changed; id resolves a twin";
    });

    await check("AC-SA-07", async () => {
      const reply = await send(onSocket, "POST", "/v1/agents/local-scripts", { agent: "CEO", state: "off" });
      assert.equal(reply.status, 200);
      assert.equal(reply.lines.get("local_scripts"), "off");
      assert.equal(store.agents.find((agent) => agent.id === "agent-1")?.localScripts, false);
      return "state=off: 200 local_scripts=off, flag false";
    });

    await check("AC-SA-08", async () => {
      const keys = ["version", "account", "server"];
      for (const [label, socket] of [
        ["off", offSocket],
        ["on", onSocket],
      ] as const) {
        const reply = await send(socket, "GET", "/v1/status");
        assert.equal(reply.status, 200, label);
        assert.equal(reply.lines.get("version"), "e2e", label);
        assert.equal(reply.lines.get("account"), "signed_out", label);
        assert.equal(reply.lines.get("server"), "unconfigured", label);
        assert.deepEqual([...reply.lines.keys()].sort(), [...keys].sort(), label);
        expectError(await send(socket, "GET", "/v1/nothing"), 404, "not_found");
      }
      return "GET /v1/status has version, account, server with the commands on and off; unknown path 404";
    });
  } finally {
    for (const server of servers) await runCauseEffect(server.close()).catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }

  mkdirSync(resolve(OUT, ".."), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(results, null, 2)}\nReport: ${OUT}\n`);
  if (results.some((entry) => !entry.ok) || results.length !== 9) process.exitCode = 1;
}

await main();
