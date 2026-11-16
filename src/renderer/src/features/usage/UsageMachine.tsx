import { UsageMachineMeter } from "@openbot/ui/features/usage/UsageMachineMeter";
import { Show } from "solid-js";
import { useServerSettings } from "../servers/server-settings";
import { useServerMachineReading } from "./server-machine-reading";

/**
 * The machine use of a server in the Usage header. Only an owner or admin reads the machine, and only
 * on a host with `machine-resources-v1`; for others it shows nothing.
 */
export function UsageMachine(props: { serverId: string }) {
  const { openServerSettings } = useServerSettings();
  const shown = useServerMachineReading(() => props.serverId);
  return (
    <Show when={shown()}>
      {(current) => (
        <UsageMachineMeter
          metrics={current().metrics}
          onOpenStorage={() => openServerSettings(current().serverId, null, "storage")}
        />
      )}
    </Show>
  );
}
