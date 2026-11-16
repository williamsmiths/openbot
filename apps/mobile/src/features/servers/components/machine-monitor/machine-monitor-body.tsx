import { Button, Typography } from "heroui-native";
import { View } from "react-native";
import { DiskCard, LatencyCard, NetworkCard } from "@/features/servers/components/machine-monitor/machine-io-cards";
import { GpuCard, LoadCard, MemoryCard } from "@/features/servers/components/machine-monitor/machine-load-cards";
import { shortCpuModel, uptimeParts } from "@/features/servers/model/machine-monitor-format";
import { useMachineDetails } from "@/features/servers/model/use-machine-details";
import { useMachineMetrics } from "@/features/servers/model/use-machine-metrics";
import { type MobileText, useText } from "@/shared/lib/text";
import { typeScale } from "@/shared/lib/type-scale";

const UPTIME_KEYS = {
  day: "mobile.server.machine.monitor.upDays",
  hour: "mobile.server.machine.monitor.upHours",
  minute: "mobile.server.machine.monitor.upMinutes",
} as const;

/** "Ubuntu 24.04 · i9-14900K · up 33 days": what the host names, in the order a reader looks for it. */
export function machineSubtitle(
  details: { osName: string | null; cpuModel: string | null; uptimeSeconds: number },
  { t }: MobileText,
): string {
  const { unit, value } = uptimeParts(details.uptimeSeconds);
  return [details.osName, shortCpuModel(details.cpuModel), t(UPTIME_KEYS[unit], { count: value })]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The cards of the live machine monitor (`machine-resources-v2`): load, RAM, GPU, latency, network and
 * disk. The monitor screen and the Usage screen show the same cards. `showSubtitle` adds the machine
 * line above them, for a screen whose title is not the machine. Disk and RAM sizes come from the
 * `machine-resources-v1` reading. The caller shows it only when `canReadMachineDetails` is true.
 */
export function MachineMonitorBody({ serverId, showSubtitle = false }: { serverId: string; showSubtitle?: boolean }) {
  const text = useText();
  const { t } = text;
  const { query, latencies } = useMachineDetails(serverId);
  const { query: metricsQuery } = useMachineMetrics(serverId);
  const metrics = metricsQuery.isError ? undefined : metricsQuery.data;
  const details = query.data;
  if (details)
    return (
      <View className="gap-3">
        {showSubtitle ? (
          <Typography.Paragraph className="px-1 text-text-secondary" style={typeScale.caption}>
            {machineSubtitle(details, text)}
          </Typography.Paragraph>
        ) : null}
        <LoadCard details={details} online={!query.isError} />
        <View className="flex-row gap-3">
          <MemoryCard details={details} metrics={metrics} />
          <GpuCard details={details} />
        </View>
        <View className="flex-row gap-3">
          <LatencyCard latencies={latencies} />
          <NetworkCard details={details} />
        </View>
        <DiskCard metrics={metrics} />
        {query.isError ? (
          <Typography.Paragraph accessibilityRole="alert" className="text-danger-text">
            {t("mobile.server.machine.monitor.failed")}
          </Typography.Paragraph>
        ) : null}
      </View>
    );
  if (query.isError)
    return (
      <View className="gap-2">
        <Typography.Paragraph accessibilityRole="alert">
          {t("mobile.server.machine.monitor.failed")}
        </Typography.Paragraph>
        <Button variant="ghost" onPress={() => void query.refetch()}>
          <Button.Label>{t("mobile.server.machine.monitor.retry")}</Button.Label>
        </Button>
      </View>
    );
  return <Typography.Paragraph>{t("mobile.server.machine.monitor.loading")}</Typography.Paragraph>;
}
