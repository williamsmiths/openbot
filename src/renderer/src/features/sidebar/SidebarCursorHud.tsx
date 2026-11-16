import { CursorUsageHud } from "@openbot/ui/features/usage/CursorUsageHud";
import { useText } from "@openbot/ui/text";
import { createSignal } from "solid-js";
import { useServers } from "../servers/servers-context";
import { usePlanLimitRows } from "../usage/plan-limit-rows";
import { useServerMachineReading } from "../usage/server-machine-reading";

/** The provider the owner last picked in the HUD, kept on this computer only. */
const HUD_PROVIDER_STORAGE_KEY = "openbot.sidebar.usageHudProvider";

function readPickedProvider(): string | null {
  try {
    return window.localStorage.getItem(HUD_PROVIDER_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * The usage HUD at the bottom of the agent list, always shown while the active server has a plan
 * reading. A click picks the provider it shows. Its reactor is the CPU and memory of that server, which
 * only an owner or admin can read; for others the reactor stays dark.
 */
export function SidebarCursorHud() {
  const { t } = useText();
  const { activeServer } = useServers();
  const rows = usePlanLimitRows();
  const reading = useServerMachineReading(() => activeServer()?.id ?? null);
  const [picked, setPicked] = createSignal(readPickedProvider());
  const machine = () => {
    const current = reading();
    return current ? { name: activeServer()?.name ?? t("sidebar.topbar.localServer"), metrics: current.metrics } : null;
  };
  return (
    <CursorUsageHud
      rows={rows()}
      machine={machine()}
      selected={picked()}
      onSelect={(key) => {
        setPicked(key);
        try {
          window.localStorage.setItem(HUD_PROVIDER_STORAGE_KEY, key);
        } catch {
          // A blocked storage keeps the pick for this window only.
        }
      }}
    />
  );
}
