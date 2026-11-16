import { isIdentifier } from "../ipc-bounded-values";
import { isDynamicRecord } from "../runtime-values";
import type { TeamProtocolV8BaseJsonObject, TeamProtocolV8BaseJsonValue } from "./v8-base";

/**
 * Frozen optional agent-lane-turns-v1 contract: the agents that work outside their own chat. It adds
 * `laneTurns` beside the frozen keys of the `snapshot` of a `runtime-snapshot` event: at most one row
 * for each agent, each with only `botId` and `turnId`, spelled as the rest of that snapshot is (`botId`,
 * see `current-agent-keys.ts`). The turn runs in a channel, task or messaging thread of the agent, never
 * in its own chat, which `activeTurns` already carries. The thread is left out: a member who sees the
 * agent may not see the channel.
 *
 * The host adds the field only for a client that advertises the capability, on protocol 9, so the wire
 * of every released client stays as it was; such a client shows an agent at work in a channel as idle,
 * as before. The host sends only the agents that the member can see. A host without the capability
 * never sends the field, so a client keeps it whenever it is present. A present value that the runtime
 * snapshot decoder refuses fails closed. Widening any of it needs a second capability string.
 */
export const TEAM_AGENT_LANE_TURNS_CAPABILITY = "agent-lane-turns-v1";

const LANE_TURN_KEYS = ["botId", "turnId"] as const;

function isJsonObject(value: unknown): value is TeamProtocolV8BaseJsonObject {
  return isDynamicRecord(value);
}

function v1LaneTurns(turns: unknown, sending: boolean): TeamProtocolV8BaseJsonValue {
  if (!Array.isArray(turns)) throw new Error("Invalid lane turns.");
  const json: TeamProtocolV8BaseJsonValue[] = JSON.parse(JSON.stringify(turns));
  const projected = json.map((turn) => {
    if (!isJsonObject(turn)) return turn;
    const picked: TeamProtocolV8BaseJsonObject = {};
    for (const key of LANE_TURN_KEYS) if (turn[key] !== undefined) picked[key] = turn[key];
    return picked;
  });
  // The host drops a row that the client decoder would refuse, so a long provider turn id never makes
  // a client drop the connection. A client keeps every row, and its decoder refuses a bad one.
  return sending
    ? projected.filter((turn) => isJsonObject(turn) && LANE_TURN_KEYS.every((key) => isIdentifier(turn[key])))
    : projected;
}

/**
 * `projected` with the lane turns of the `runtime-snapshot` event `source`, both on the wire vocabulary.
 * Other events are unchanged. The host passes `sending`; a client keeps every row.
 */
export function withRuntimeSnapshotLaneTurns(
  projected: TeamProtocolV8BaseJsonValue,
  source: unknown,
  sending = false,
): TeamProtocolV8BaseJsonValue {
  if (!isDynamicRecord(projected) || projected.type !== "runtime-snapshot" || !isDynamicRecord(source)) {
    return projected;
  }
  const snapshot = projected.snapshot;
  const fromSnapshot = source.snapshot;
  if (!isDynamicRecord(snapshot) || !isDynamicRecord(fromSnapshot) || fromSnapshot.laneTurns === undefined) {
    return projected;
  }
  return { ...projected, snapshot: { ...snapshot, laneTurns: v1LaneTurns(fromSnapshot.laneTurns, sending) } };
}
