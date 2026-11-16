import type { MachineDetails } from "@openbot/contracts/team-protocol/machine-resources-v2";
import type { Href } from "expo-router";
import { Typography } from "heroui-native";
import { memo, useMemo } from "react";
import { Pressable, View } from "react-native";
import { DotChart } from "@/features/servers/components/machine-monitor/dot-chart";
import { useChartEmpty, usePercentSeries } from "@/features/servers/components/machine-monitor/machine-load-cards";
import { seriesOf } from "@/features/servers/model/machine-monitor-format";
import { useMachineDetails } from "@/features/servers/model/use-machine-details";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";
import { typeScale } from "@/shared/lib/type-scale";

const CHART_ROWS = 4;
const CHART_COLUMNS = 15;

function latest(details: MachineDetails, pick: (sample: MachineDetails["history"][number]) => number | null) {
  for (let index = details.history.length - 1; index >= 0; index -= 1) {
    const sample = details.history[index];
    const value = sample ? pick(sample) : null;
    if (value !== null) return value;
  }
  return null;
}

/** One reading in the drawer card: a label over a value. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-0 flex-1">
      <Typography.Paragraph className="text-text-secondary" numberOfLines={1} style={typeScale.caption}>
        {label}
      </Typography.Paragraph>
      <Typography.Paragraph className="font-semibold" numberOfLines={1} style={typeScale.rowTitle}>
        {value}
      </Typography.Paragraph>
    </View>
  );
}

/**
 * The live machine of the open server at the top of the drawer: CPU, RAM, GPU and network, and the CPU
 * history. It reads every second while the drawer is open, and opens the full monitor on a tap. Only
 * an owner or admin of a host with `machine-resources-v2` sees it.
 */
export const DrawerMachineCard = memo(function DrawerMachineCard({
  serverId,
  open,
  onNavigate,
}: {
  serverId: string;
  open: boolean;
  onNavigate: (href: Href) => void;
}) {
  const { t, format } = useText();
  const { available, query } = useMachineDetails(serverId, open);
  const details = query.data;
  const empty = useChartEmpty();
  const cpuValues = useMemo(
    () => (details ? seriesOf(details.history, (sample) => sample.cpuPercent, CHART_COLUMNS) : []),
    [details],
  );
  const cpuSeries = usePercentSeries(cpuValues, CHART_ROWS);
  if (!available || !details) return null;
  const percent = (value: number | null) => (value === null ? "-" : format.percent(value / 100));
  const rate = (value: number | null) =>
    value === null ? "-" : t("mobile.server.machine.monitor.perSecond", { size: format.fileSize(value) });
  const gpu = details.gpus[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("mobile.server.machine.monitor.load")}
      className="mx-1 mb-2 gap-2 rounded-2xl bg-control px-3 py-2.5"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      onPress={() => {
        void haptics.selection();
        onNavigate({ pathname: "/server-machine", params: { serverId } });
      }}
    >
      <View className="flex-row items-center gap-3">
        <Stat label={t("mobile.server.machine.cpu")} value={percent(latest(details, (sample) => sample.cpuPercent))} />
        <Stat
          label={t("mobile.server.machine.monitor.ram")}
          value={percent(latest(details, (sample) => sample.memoryPercent))}
        />
        {gpu ? (
          <Stat
            label={t("mobile.server.machine.monitor.gpu")}
            value={
              gpu.temperatureCelsius === null
                ? percent(gpu.utilizationPercent)
                : `${percent(gpu.utilizationPercent)} · ${t("mobile.server.machine.monitor.temperature", { value: format.number(gpu.temperatureCelsius) })}`
            }
          />
        ) : null}
      </View>
      <View className="flex-row items-end justify-between gap-3">
        <View className="min-w-0 shrink">
          <Typography.Paragraph className="text-text-secondary" numberOfLines={1} style={typeScale.caption}>
            {t("mobile.server.machine.monitor.network")}
          </Typography.Paragraph>
          <Typography.Paragraph numberOfLines={1} style={typeScale.caption}>
            {t("mobile.server.machine.monitor.networkLine", {
              down: rate(details.networkReceiveBytesPerSecond),
              up: rate(details.networkSendBytesPerSecond),
            })}
          </Typography.Paragraph>
        </View>
        <DotChart series={[cpuSeries]} empty={empty} />
      </View>
    </Pressable>
  );
});
