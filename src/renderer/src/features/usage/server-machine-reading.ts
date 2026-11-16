import type { MachineMetrics, OpenBotDesktopApi } from "@openbot/contracts/ipc";
import { MACHINE_RESOURCES_CAPABILITY } from "@openbot/contracts/team-protocol/machine-resources-v1";
import { createMemo, createSignal, untrack } from "solid-js";
import { createUsageRefreshPoll } from "../account/usage-refresh-poll";
import { canManageStorage } from "../files/storage-usage";
import { serverSupportsCapability } from "../servers/server-capabilities";
import { useServers } from "../servers/servers-context";

/** Memory and CPU change fast, so the reading is live. The host reads CPU since the reading before. */
const MACHINE_REFRESH_MS = 5_000;
/** The poll compares the age often, so a reading is at most this much later than its interval. */
const MACHINE_REFRESH_CHECK_MS = 1_000;

type MachinePort = Pick<OpenBotDesktopApi["storage"], "getMachineMetrics">;

/** Read on each call: tests and stories replace `window.openbot` per case. */
function machinePort(): MachinePort {
  return window.openbot.storage;
}

export interface ServerMachineReading {
  serverId: string;
  metrics: MachineMetrics;
}

/**
 * The live machine use of one server, for the Usage header and the Cursor HUD of the rail. Only an
 * owner or admin reads the machine, and only on a host with `machine-resources-v1`; for others it is
 * null. It reads every few seconds while the window is visible, and at once when the window shows
 * again. The poll lives as long as its owner, so a hover card reads only while it is open.
 */
export function useServerMachineReading(serverId: () => string | null) {
  const { servers } = useServers();
  const target = createMemo(() => {
    const id = serverId();
    const server = id ? servers().find((candidate) => candidate.id === id) : undefined;
    return server && serverSupportsCapability(server, MACHINE_RESOURCES_CAPABILITY) && canManageStorage(server)
      ? server.id
      : null;
  });
  const [reading, setReading] = createSignal<ServerMachineReading | null>(null);
  /** A slow remote host does not get a second read of the same server before it answers the first. */
  let pending: string | null = null;

  function refresh(id: string): void {
    if (pending === id) return;
    pending = id;
    machinePort()
      .getMachineMetrics(id)
      .finally(() => {
        if (pending === id) pending = null;
      })
      .then(
        (metrics) => {
          // An answer for a server that the owner no longer shows is dropped.
          if (untrack(target) === id) setReading(metrics ? { serverId: id, metrics } : null);
        },
        // A failed read shows no reading, so an old reading does not look live. The next poll asks again.
        () => {
          if (untrack(target) === id) setReading(null);
        },
      );
  }
  createUsageRefreshPoll({
    target,
    refresh,
    refreshAtStart: true,
    refreshMs: MACHINE_REFRESH_MS,
    checkMs: MACHINE_REFRESH_CHECK_MS,
  });

  /** A reading of a server that the owner showed before does not show. */
  return (): ServerMachineReading | null => {
    const current = reading();
    return current && current.serverId === target() ? current : null;
  };
}
