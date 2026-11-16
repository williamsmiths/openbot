import type { MachineDetails } from "@openbot/contracts/team-protocol/machine-resources-v2";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useRef } from "react";
import { useQueryScope } from "@/features/auth/context/mobile-session-context";
import { DOT_CHART_COLUMNS } from "@/features/servers/components/machine-monitor/dot-chart";
import { useMobileWorkspace, useMobileWorkspaceActions } from "@/features/workspace/context/mobile-workspace-context";
import { queryKeys } from "@/features/workspace/model/query-keys";
import { useAppForeground } from "@/shared/lib/use-app-foreground";

/** The host samples twice a second (`sampleIntervalMs`), so a faster poll adds nothing. */
const MACHINE_DETAILS_REFRESH_MS = 500;
/** One latency value per reading: as many as the host keeps samples. The screen of one server owns the list. */
const LATENCY_LIMIT = 60;

/**
 * The live monitor of a server's machine (`machine-resources-v2`), for an owner or admin. It reads again
 * every few seconds while the screen is on top and the app is in the foreground, and stops otherwise.
 * `latencies` holds the round trip of each read in milliseconds, measured on this phone, oldest first.
 */
/** `active` false pauses the reads, such as while the drawer that shows them is closed. */
export function useMachineDetails(serverId: string, active = true) {
  const { canReadMachineDetails } = useMobileWorkspace();
  const { loadMachineDetails } = useMobileWorkspaceActions();
  const queryScope = useQueryScope();
  const focused = useIsFocused();
  const foreground = useAppForeground();
  const available = canReadMachineDetails(serverId);
  const live = available && focused && foreground && active;
  // A screen under another one is frozen and does not render again, so `focused` above stays true there.
  // Navigation events still reach it: the poll stops at the blur without a render, and the render at the
  // next focus starts it again.
  const onTop = useRef(true);
  useFocusEffect(
    useCallback(() => {
      onTop.current = true;
      return () => {
        onTop.current = false;
      };
    }, []),
  );
  // A ref, not state: the new reading renders the screen once, and the latency goes with it.
  const latencies = useRef<number[]>([]);
  const queryFn = useCallback(async (): Promise<MachineDetails> => {
    const started = Date.now();
    // Only the readings that the charts draw, as the poll runs twice a second on an old iPhone.
    const details = await loadMachineDetails(serverId, DOT_CHART_COLUMNS);
    latencies.current = [...latencies.current.slice(-(LATENCY_LIMIT - 1)), Date.now() - started];
    return details;
  }, [loadMachineDetails, serverId]);
  const query = useQuery({
    queryKey: queryKeys.machineDetails(queryScope, serverId),
    queryFn,
    enabled: live,
    refetchInterval: () => (live && onTop.current ? MACHINE_DETAILS_REFRESH_MS : false),
    retry: false,
    staleTime: 0,
  });
  return { available, query, latencies: latencies.current };
}
