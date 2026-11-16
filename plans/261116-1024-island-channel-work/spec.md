# Island shows agents that work outside their own chat — spec delta

Type: bug fix / behavior change (existing product). Surfaces: backend runtime snapshot, Team API
(new optional capability), desktop renderer (local + joined server), web client (shares renderer
turns code), team-client island coordinator (desktop non-active servers, mobile Live Activity).

## Context (root cause, evidence)
- Mac app on joined server kong-lab. Agent CEO ran turn `abc41b95…` 03:15:57–03:19:06 UTC in
  channel "ilets_v3.0_fullstack" (thread `openbot-thread-28fbb158…`). Island stayed idle.
- `AgentService.#emit` drops an event that `channels` / `messaging` / `tasks` consume
  (`src/backend/agent-service.ts:6410`). Channel `turn-started` / `turn-completed` are consumed
  (`channel-service.ts:2613`), so clients never see them.
- Runtime snapshot `activeTurns` holds only each agent's own chat thread (`runtime-snapshot.ts:202`).
- Island working = `activeTurns[agent]` or a running delivery in the agent's chat queue.

## Permission matrix
N/A — no new action. Read-only status. Host keeps member visibility: `hiddenAgentView` drops every
object whose `agentId` is hidden, so a hidden agent's lane turn never reaches that member.

## State machine
Lane turn (per turnId): `absent → running` on consumed `turn-started`; `running → absent` on any
`turn-completed` (consumed or not) or agent removal. The snapshot keeps only turns that
`TurnLifecycle.turnStartedAt` still reports running, so a turn that ends with no event drops out
(REV M2). In memory only; a restart interrupts turns anyway.

## API / contract
- `AgentRuntimeSnapshot.laneTurns?: Array<{ agentId; turnId }>` — one running turn of each agent
  outside its own chat (channel, task, messaging thread). Optional; absent = none known. No thread id:
  a member who sees the agent may not see the channel.
- Team API: new V9-only capability `agent-lane-turns-v1`. Host adds `snapshot.laneTurns` (wire
  spelling `botId`, as `context-usage-v1`) to a `runtime-snapshot` event only for a peer that advertises it. Client
  decoder keeps a present `laneTurns`; a malformed one fails closed (`isAgentRuntimeSnapshot`).
  Older host: field absent, island behaves as before. Older client: does not advertise, gets nothing.
- Host emits a fresh runtime snapshot when a consumed lane turn starts or ends.

## Module doc
- `ipc-agent-runtime.ts`: type + validation (≤ `INPUT_LIMITS.agents`, one row per agent).
- Host send filter keeps only rows the client decoder accepts (`isIdentifier`), so a long turn id
  never disconnects a client (REV M1).
- `team-protocol/agent-lane-turns-v1.ts`: capability + `withRuntimeSnapshotLaneTurns`.
- `v8-base-adapter.ts`: encode option `laneTurns`, decode keeps field. Host passes the option in
  `team-api-server.ts` and `team-webrtc-host-peer.ts`.
- Renderer `turns.tsx` keeps `laneTurns`; `agent-activity.ts` counts them as working (sidebar,
  avatar); island bridge passes them.
- team-client island: `DynamicIslandPresentationInput.laneTurns?`; `isAgentWorking` reads it; the
  working item's `turnId` stays the chat turn, so the island Stop button does not stop a channel turn.

## Acceptance criteria
- AC-001 Given agent A works only in a channel on the local server, When the turn starts, Then the
  island shows A in working mode; When it ends, Then the island leaves working mode for A.
- AC-002 Given a joined server with `agent-lane-turns-v1` and a client that advertises it, When A
  works in a channel there, Then the client's island shows A working (desktop WebRTC + WebSocket,
  web client).
- AC-003 Given a host without the capability, Then the client behaves as before (no error).
- AC-004 Given A is hidden from member M, Then M's snapshot has no lane turn of A.
- AC-005 The island shows no Stop button for a lane-only working agent.
- AC-006 A malformed `laneTurns` from a host is a protocol error, as other snapshot fields.

## Not in scope
Mobile in-app agent list working badge (mobile UI does not read the field yet); its Live Activity
uses the team-client coordinator, so it gains AC-001/002 through `#replaceRuntimeSnapshot`.
