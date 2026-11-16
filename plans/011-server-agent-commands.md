# 011 — Agent commands on the server control socket

State: DONE (not committed) · Change ID: CR-011 · Owner decision: 2026-11-12 (the developer chose to add
the commands after the Local scripts trade-off was stated).

## Outcome

On a self-hosted server with no usable window, the operator can create a first agent and turn
**Local scripts** on or off for an agent from the `openbot` terminal command. The operator opts in
with one environment variable. A server without the variable behaves as before.

## Current behavior and evidence

- The control socket answers a closed list of account requests only (`src/main/server-mode.ts:209-229`).
- An agent is created only through a client (IPC `createAgent`, `src/main/ipc/agent-handlers.ts:782`)
  or by another agent (`openbot.create_agent`). A server with zero agents has neither on the host.
- `allowAutomation` is changed only by the local UI (`agent-handlers.ts:824`) and by an owner or
  admin through `agent-host-settings-v1`. The agent tools and the general remote update refuse it.
- The value a client shows is the effective one: `agent.allowAutomation ?? defaults.allowAutomation`
  (`packages/contracts/src/ipc-agents.ts:126-131`).
- The Local scripts listener starts when an agent has the flag (`application-services.ts:2338-2356`,
  on `agents-changed`, which `service.updateAgent` emits).
- The server window does not paint in server mode (seen 2026-11-12: unmapped, grey when mapped).

## Classification and risk

Authorization / security change, local to the server control socket. No schema, no migration, no
Team API protocol, no IPC endpoint, no renderer change.

Risk: **medium, accepted by the developer**.

- **Create.** A new agent starts with Full access, Computer Use and auto-approve, as an agent from
  the UI does (`ipc-agents.ts:40`). Its first message has the sender kind `user`. The
  `openbot.create_agent` tool already gives an agent this path (`agent-service.ts:1890-1902`), with
  caller limits (`openbot-tool-router.ts:2595-2600`) that the socket does not have. So the route
  takes **no message from the caller**: the first message is one fixed text. The route adds an
  agent, not an arbitrary person-level turn.
- **Local scripts.** This is the new power. An agent with Full access runs as the service user and
  can connect to the socket. With the commands on, it can turn Local scripts on for itself or for
  another agent. A local script then sends messages with the sender kind `user`, which pass the
  person gate (`openbot-tool-router.ts:2406`): edit, run or delete a workflow, save a Vault key,
  manage a channel. It can also answer approval cards and questions
  (`automation-server.ts:333-335`), change the model or the account (`:296-304`) and start a new
  chat (`:286-289`). The released product lets only a person turn the flag on.
- **Gate.** The commands exist only when the server process has `OPENBOT_SERVER_AGENT_COMMANDS=1`.
  It is a default-off switch, not a security boundary: where the service user owns its start script
  or unit (a `systemd --user` install), an agent with Full access can set the variable and restart
  the server. It is a boundary only when root owns the unit and the environment. The packaged
  launcher drops unknown keys of `openbot.env` (`scripts/hosting/openbot-hosted-server:75-81`), so
  an installer-made server cannot turn the commands on; that launcher is not changed here.
- Rollback: remove the variable and restart. No stored data changes shape.

## Impact matrix

| Area | Affected | Evidence |
|---|---|---|
| Control socket routes | yes: 3 new routes | `server-mode.ts` |
| Server-mode wiring | yes: the `agents` dependency and the gate | `application-services.ts:4223-4232` |
| `openbot` terminal command | yes: `agent` subcommands, new error texts | `scripts/hosting/openbot` |
| Agent service / store | no change; called through `createAgent`, `updateAgent`, `listAgents` | `agent-service.ts:2851` |
| Schema, migrations | no | flag is in `agent_json` |
| Team API, IPC, renderer, mobile, web | no | no contract touched |
| Installer launcher | no (commands unreachable there) | `openbot-hosted-server:75-81` |
| Docs | yes | `docs/self-hosted-server.md`, `changelog.d/` |
| Existing socket routes | must stay unchanged | AC-SA-08 |

## 1. Permission matrix

| ID | Role | Module | Operation | Data scope | Note |
|---|---|---|---|---|---|
| PM-SA-01 | Service user or root, through the control socket | Agents | Xem | all local agents | commands on only |
| PM-SA-02 | same | Agents | Tạo | — | commands on only; fixed first message; new agent has Full access |
| PM-SA-03 | same | Agents | Sửa (Local scripts on/off) | all local agents | commands on only |

Other OS users have no access: the socket is 0600 in a 0700 directory (existing check, unchanged).
A team member, a renderer and a joined client get nothing new.

## 2. State machine

N/A — no entity gets a new state. `allowAutomation` is an existing boolean.

## 3. API list (control socket, form body, `key=value` lines)

| Method | Path | Role | Purpose | Constraints |
|---|---|---|---|---|
| GET | `/v1/agents` | PM-SA-01 | List agents | Answer: `agents=<n>`, then `agent_<i>=<id> <on\|off> <name>`, `i` from 1 |
| POST | `/v1/agents/create` | PM-SA-02 | Create one agent | `name`: trimmed, 1..`INPUT_LIMITS.agentName`, no control, format or line-separator character. No other field is read. Answer: `id`, `name`, `local_scripts` |
| POST | `/v1/agents/local-scripts` | PM-SA-03 | Set the flag | `agent` = id, or name (case ignored); `state` = `on` or `off`. Answer: `id`, `name`, `local_scripts` |

- `local_scripts` and the list column are the **effective** value (`agentAutomationAllowed`).
- A name in an answer has its control characters removed (it can reach a root terminal).
- Create: description is the product default or empty; `avatarSeed` is a new UUID; `avatarHue` is
  null; provider and model are the defaults of `createAgent`; sender is undefined and `welcome` is
  false, as for the `create_agent` tool. The first message is one constant in `server-mode.ts`.
- Create refuses a name that an agent already has (case ignored): a repeat after a timeout makes no
  second agent, and a name always finds one agent.
- Errors: `403 agent_commands_off` (all three routes) · `400 invalid_agent_name` ·
  `409 agent_exists` · `400 invalid_state` · `404 agent_not_found` · `409 agent_ambiguous` (two
  agents from before this change have the name). A service failure (no provider, the 100-agent
  limit, an agent deleted during the request) keeps the existing `400 failed` path with the
  service message. Error texts for the new codes are in the terminal command, as for the existing
  codes; the main process adds no user text.
- A signed-out server can use the commands: agents are local.

## 4. Module doc

Purpose: first-agent bootstrap and the Local scripts switch for a headless server. Entity: agent
(`AgentSummary`). Role: the server operator. Flow: `openbot agent create <name>` → `openbot agent
local-scripts <agent> on` → `openbot-cli` can message the agent. Edge cases: commands off; name in
use; name used by two older agents; agent deleted during the request; repeat of `on`.

## 5. Acceptance criteria

```gherkin
Scenario: AC-SA-01 commands off refuse every agent command
  Given the server runs without OPENBOT_SERVER_AGENT_COMMANDS=1
  When the operator sends GET /v1/agents, POST /v1/agents/create or POST /v1/agents/local-scripts
  Then each answer is 403 agent_commands_off and no agent is created or changed

Scenario: AC-SA-02 operator creates an agent
  Given the commands are on and no agent is named "CEO"
  When the operator posts name "CEO" to /v1/agents/create
  Then the answer is 200 with id, name=CEO and the effective local_scripts value
  And the create dependency got only the name

Scenario: AC-SA-03 invalid or used name
  When the name is empty, too long, or (case ignored) the name of an agent
  Then the answer is 400 invalid_agent_name or 409 agent_exists and no agent is created

Scenario: AC-SA-04 operator turns Local scripts on by name
  Given agent "CEO" has Local scripts off
  When the operator posts agent=ceo state=on to /v1/agents/local-scripts
  Then the answer is 200 local_scripts=on and the agent has allowAutomation true

Scenario: AC-SA-05 repeat is idempotent
  When the same on request is sent again
  Then the answer is 200 local_scripts=on and nothing else changes

Scenario: AC-SA-06 unknown, ambiguous agent or bad state
  When agent names no agent, two agents have that name, or state is not on or off
  Then the answer is 404 agent_not_found, 409 agent_ambiguous or 400 invalid_state and no flag changes

Scenario: AC-SA-07 operator turns Local scripts off
  When the operator posts state=off
  Then the answer is 200 local_scripts=off and allowAutomation is false

Scenario: AC-SA-08 existing routes are unchanged
  When the operator sends GET /v1/status with the commands on or off
  Then the answer has the same lines as before this change

Scenario: AC-SA-09 operator lists agents
  Given the commands are on
  When the operator sends GET /v1/agents with zero agents, then with two agents
  Then the answer is agents=0, then agents=2 with one agent_<i> line each: id, on or off, name
  And a control character in a name is not in the answer
```

Wrong role (another OS user): the existing directory and socket checks (`server-mode.ts:106,139`),
not changed, no new scenario. Concurrent: two creates of one name can both pass the name check
(no lock; same as two clients today); two sets of one flag end in the last value.

## Tests

- `scripts/server-agent-commands-e2e.ts`: starts a real `ServerMode` on a temporary socket with an
  in-memory `agents` dependency, sends each request of AC-SA-01..09 over the socket, and writes
  `.openbot-build/server-agent-commands-e2e.json`. It proves the route contract, not the wiring.
- The wiring to `AgentService` is proved once on the real server (`openbot agent create`,
  `openbot agent local-scripts … on`, `openbot-cli list`); the commands and answers go in the
  review log. Not repeatable in CI: stated limit.

## Review log

### REV-011-1 — spec review, separate reviewer agent, 2026-11-12 — gate NEEDS_REVISION

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | No AC for the list; no scenario for another OS user | Low | AC-SA-09 added. OS-user check is unchanged code: no scenario |
| 2 | New agent has Full access, Computer Use, auto-approve; not stated | Medium | Stated in Risk and PM-SA-02. Kept: same as an agent from the UI |
| 3 | `local_scripts=off` wrong (effective value); "upstream prevents this" too strong | Medium | Effective value specified. Risk rewritten; `create_agent` path confirmed at `agent-service.ts:1890-1902` |
| 4a | Create alone gave a person-level turn with a caller message | High | Route reads no message; one fixed first message |
| 4b | Local scripts also answers approvals, changes model/account, starts a new chat | High | Added to Risk |
| 4c | Gate location undefined; cosmetic where the service user owns its unit | High | Location and limit stated in Risk |
| 5a | 4096-byte body is about 450 Vietnamese characters; `too_large` has no text | Medium | No message field any more; a name fits |
| 5b | Create not idempotent after a curl timeout | Medium | `409 agent_exists` on a used name |
| 5c | Deleted agent gives `400 failed`; control characters in a name; signed-out server | Low | Documented `400 failed`; control characters removed; signed-out stated |
| 6 | In-memory fake does not prove the service; new messages need `sourceText` | Medium | Limit stated; real-server pass recorded. No new main-process text |
| 7 | Create contract unspecified (seed, hue, description, sender, welcome); wiring file missing | Medium | Specified in section 3; `application-services.ts` in the matrix |

Gate after revision: **PASS_WITH_CONDITIONS** — conditions: code review of the diff before the
server restart; the real-server pass recorded here.

### REV-011-2 — code review, separate reviewer agent, 2026-11-12 — gate PASS_WITH_CONDITIONS

No blocking defect. Five Low findings:

| # | Finding | Resolution |
|---|---|---|
| 1 | Create stored a name with control characters; the cleaned name then did not match | Create refuses control, format and line-separator characters (`invalid_agent_name`) |
| 2 | `cleanName` kept direction-override characters | Same character class removed in answers |
| 3 | `agent list` printed nothing for zero agents; usage note | Fixed in `scripts/hosting/openbot` |
| 4 | AC-SA-05 did not assert the flag; script not in `package.json` or CI | Flag asserted. Not added to CI: open |
| 5 | The fixed first message is an English literal in the chat | Kept: a prompt to the agent, allowed by section 3 |

### Checks and real-server pass, 2026-11-12

- `bun run typecheck:node`: exit 0. `biome check` on the changed `.ts` files: no diagnostics.
  `bash -n scripts/hosting/openbot`: exit 0. `bun scripts/server-agent-commands-e2e.ts`: 9 of 9.
- `bun run build`: exit 0. `electron-builder --dir --linux --x64`: exit 0. Server restarted, online.
- `openbot agent list` → "No agents." · `openbot agent create CEO` → created, Local scripts off ·
  `openbot agent create ceo` → refused, exit 1 · `openbot agent local-scripts ceo on` → on ·
  `openbot-cli list` → CEO. The automation files appeared after the switch.
- A script message to CEO then created four agents and built a workflow: a script message passes
  the person gate, as the Risk section says.
- Not run: the repository-wide checks, the Mac client (no client change), CI.

Final gate: **PASS_WITH_CONDITIONS** — open: the e2e script is not in CI; nothing is committed.
