import { useLocalSearchParams } from "expo-router";
import {
  MachineMonitorBody,
  machineSubtitle,
} from "@/features/servers/components/machine-monitor/machine-monitor-body";
import { useMachineDetails } from "@/features/servers/model/use-machine-details";
import { SettingsNote } from "@/features/settings/components/settings-content";
import { useMobileWorkspace } from "@/features/workspace/context/mobile-workspace-context";
import { LargeTitleScrollView } from "@/shared/components/large-title";
import { KONG_LITE } from "@/shared/lib/kong-lite";
import { useText } from "@/shared/lib/text";

/**
 * The live monitor of a server's machine (`machine-resources-v2`), opened from the drawer and from the
 * Usage screen. Owners and admins only. The title is the server, and the line under it names the machine.
 */
export function ServerMachineScreen() {
  const text = useText();
  const { t } = text;
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const { servers } = useMobileWorkspace();
  const server = servers.find((item) => item.id === serverId);
  const { available, query } = useMachineDetails(serverId);
  const title = server?.name ?? t("mobile.server.machine.title");
  return (
    <LargeTitleScrollView
      title={title}
      caption={query.data ? machineSubtitle(query.data, text) : undefined}
      contentContainerClassName="px-4 pt-3 pb-8"
    >
      {!server ? (
        <SettingsNote>{t("mobile.server.unavailable")}</SettingsNote>
      ) : !available ? (
        <SettingsNote>{t("mobile.server.machine.unsupported")}</SettingsNote>
      ) : (
        // The light build has no caption under a big title, so the machine line goes above the cards.
        <MachineMonitorBody serverId={server.id} showSubtitle={KONG_LITE} />
      )}
    </LargeTitleScrollView>
  );
}
