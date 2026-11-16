import { router } from "expo-router";
import { Typography } from "heroui-native";
import { Pressable, View } from "react-native";
import { useLevelColors } from "@/features/servers/components/machine-monitor/machine-card";
import { loadLevel } from "@/features/servers/model/machine-monitor-format";
import { useMachineDetails } from "@/features/servers/model/use-machine-details";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";

/** One reading in the header: a short name over a percentage in the colour of its level. */
function Reading({ label, percent }: { label: string; percent: number | null }) {
  const { format } = useText();
  const colors = useLevelColors();
  return (
    <View className="items-center" style={{ width: 40 }}>
      <Typography type="body-xs" className="text-text-secondary" style={{ fontSize: 10, lineHeight: 12 }}>
        {label}
      </Typography>
      <Typography
        type="body-sm"
        className="font-semibold"
        style={{ fontSize: 13, lineHeight: 16, color: percent === null ? undefined : colors[loadLevel(percent)] }}
      >
        {percent === null ? "-" : format.percent(percent / 100)}
      </Typography>
    </View>
  );
}

/**
 * The live machine of the open server in the home header, in place of the plan limits in the light
 * build: CPU, RAM and GPU. It reads while home is on top and opens the full monitor on a tap. It shows
 * dashes until the first reading, and nothing for a host without `machine-resources-v2`.
 */
export function MachineHeaderButton({ serverId }: { serverId: string }) {
  const { t } = useText();
  const { available, query } = useMachineDetails(serverId);
  const details = query.data;
  if (!available) return null;
  // The button keeps its width before the first reading, so the native toolbar does not resize it.
  const latest = details?.history[details.history.length - 1];
  const gpu = details ? details.gpus[0] : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("mobile.server.machine.monitor.load")}
      hitSlop={4}
      className="h-10 flex-row items-center px-1"
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
      onPress={() => {
        void haptics.impact("soft");
        router.push({ pathname: "/server-machine", params: { serverId } });
      }}
    >
      <Reading label={t("mobile.server.machine.cpu")} percent={latest?.cpuPercent ?? null} />
      <Reading label={t("mobile.server.machine.monitor.ram")} percent={latest?.memoryPercent ?? null} />
      {gpu !== undefined ? (
        <Reading label={t("mobile.server.machine.monitor.gpu")} percent={gpu?.utilizationPercent ?? null} />
      ) : null}
    </Pressable>
  );
}
