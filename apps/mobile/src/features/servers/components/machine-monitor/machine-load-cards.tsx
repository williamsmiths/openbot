import type { MachineMetrics } from "@openbot/contracts/ipc";
import type { MachineDetails } from "@openbot/contracts/team-protocol/machine-resources-v2";
import { Typography } from "heroui-native";
import Cpu from "lucide-react-native/icons/cpu";
import Gpu from "lucide-react-native/icons/gpu";
import MemoryStick from "lucide-react-native/icons/memory-stick";
import { useMemo } from "react";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";
import { DOT_CHART_COLUMNS, DotChart, type DotSeries } from "@/features/servers/components/machine-monitor/dot-chart";
import { BigValue, MachineCard, useLevelColors } from "@/features/servers/components/machine-monitor/machine-card";
import { type LoadLevel, loadLevel, seriesOf, trendOf } from "@/features/servers/model/machine-monitor-format";
import { type MobileText, useText } from "@/shared/lib/text";

const STATUS_KEYS = {
  normal: "mobile.server.machine.monitor.stable",
  warning: "mobile.server.machine.monitor.busy",
  danger: "mobile.server.machine.monitor.high",
} as const satisfies Record<LoadLevel, string>;
/** The readings in a minute, from the host's interval, so the trend compares now with a minute ago. */
const minuteSteps = (intervalMs: number) => Math.max(1, Math.round(60_000 / Math.max(1, intervalMs)));

export function useChartEmpty(): string {
  return String(useCSSVariable("--openbot-text-grouped-secondary"));
}

/** A percentage series in the colour of its level. */
export function usePercentSeries(values: readonly (number | null)[], rows: number): DotSeries {
  const colors = useLevelColors();
  return useMemo(() => ({ values, rows, colorOf: (value) => colors[loadLevel(value)] }), [values, rows, colors]);
}

function lastPercent(values: readonly (number | null)[]): number | null {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

function AgoLabels({ details, t }: { details: MachineDetails; t: MobileText["t"] }) {
  // The span of the chart: its columns times the host's interval, in seconds under a minute.
  const seconds = Math.round((DOT_CHART_COLUMNS * details.sampleIntervalMs) / 1000);
  const ago =
    seconds < 60
      ? t("mobile.server.machine.monitor.secondsAgo", { count: seconds })
      : t("mobile.server.machine.monitor.minutesAgo", { count: Math.round(seconds / 60) });
  return (
    <View className="flex-row justify-between">
      <Typography type="body-xs" className="text-grouped-secondary">
        {ago}
      </Typography>
      <Typography type="body-xs" className="text-grouped-secondary">
        {t("mobile.server.machine.monitor.now")}
      </Typography>
    </View>
  );
}

/** The big card: the CPU in a huge number, the RAM and GPU beside it, the trend, and the CPU history. */
export function LoadCard({ details, online }: { details: MachineDetails; online: boolean }) {
  const { t, format } = useText();
  const colors = useLevelColors();
  const empty = useChartEmpty();
  const cpu = useMemo(() => seriesOf(details.history, (sample) => sample.cpuPercent, DOT_CHART_COLUMNS), [details]);
  const cpuNow = lastPercent(cpu);
  const memory = lastPercent(seriesOf(details.history, (sample) => sample.memoryPercent, 1));
  const gpu = details.gpus.length ? lastPercent(seriesOf(details.history, (sample) => sample.gpuPercent, 1)) : null;
  const series = usePercentSeries(cpu, 7);
  const level = loadLevel(cpuNow);
  const load =
    details.loadAverageHundredths === null
      ? null
      : format.number(details.loadAverageHundredths / 100, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  // The client reads only the readings that the chart draws, so the trend compares across the chart.
  const steps = Math.min(minuteSteps(details.sampleIntervalMs), DOT_CHART_COLUMNS - 1);
  const trend = trendOf(
    seriesOf(details.history, (sample) => sample.cpuPercent, steps + 1),
    steps,
  );
  const percent = (value: number | null) => (value === null ? "-" : format.percent(value / 100));
  const line = t(
    details.gpus.length ? "mobile.server.machine.monitor.loadLine" : "mobile.server.machine.monitor.loadLineNoGpu",
    {
      ram: percent(memory),
      gpu: percent(gpu),
    },
  );
  const status = t(STATUS_KEYS[level]);
  return (
    <MachineCard
      title={t("mobile.server.machine.monitor.load")}
      Icon={Cpu}
      trailing={
        <View className="flex-row items-center gap-2">
          {load ? (
            <Typography type="body-xs" className="text-grouped-secondary">
              {`${trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} ${t("mobile.server.machine.monitor.loadChip", { load })}`}
            </Typography>
          ) : null}
          <OnlinePill online={online} label={t("mobile.server.machine.monitor.online")} />
        </View>
      }
    >
      <View className="flex-row items-end justify-between gap-3">
        <View className="min-w-0 shrink gap-1">
          <BigValue value={cpuNow === null ? "-" : format.percent(cpuNow / 100)} size={44} />
          <Typography type="body-xs" className="text-grouped-secondary" numberOfLines={2}>
            {line}
          </Typography>
          <View className="flex-row items-center gap-1.5">
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[level] }} />
            <Typography type="body-xs" numberOfLines={1}>
              {load ? t("mobile.server.machine.monitor.statusLoad", { status, load }) : status}
            </Typography>
          </View>
        </View>
        <DotChart series={[series]} empty={empty} />
      </View>
      <AgoLabels details={details} t={t} />
    </MachineCard>
  );
}

function OnlinePill({ online, label }: { online: boolean; label: string }) {
  const colors = useLevelColors();
  if (!online) return null;
  return (
    <View className="flex-row items-center gap-1 overflow-hidden rounded-full px-2 py-0.5">
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: colors.normal,
          opacity: 0.16,
        }}
      />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.normal }} />
      <Typography type="body-xs" className="text-success-text">
        {label}
      </Typography>
    </View>
  );
}

/** RAM in bytes when the v1 metrics are there, else the percentage alone. */
export function MemoryCard({ details, metrics }: { details: MachineDetails; metrics: MachineMetrics | undefined }) {
  const { t, format } = useText();
  const empty = useChartEmpty();
  const values = useMemo(
    () => seriesOf(details.history, (sample) => sample.memoryPercent, DOT_CHART_COLUMNS),
    [details],
  );
  const series = usePercentSeries(values, 7);
  const now = lastPercent(values);
  const total = metrics?.memoryTotalBytes ?? null;
  const free = metrics?.memoryAvailableBytes ?? null;
  const used = total !== null && free !== null ? Math.max(0, total - free) : null;
  return (
    <MachineCard title={t("mobile.server.machine.monitor.ram")} Icon={MemoryStick} className="flex-1">
      <BigValue value={now === null ? "-" : format.percent(now / 100)} />
      {used !== null && total !== null ? (
        <Typography type="body-xs" className="text-grouped-secondary" numberOfLines={1}>
          {t("mobile.server.machine.sizeDetail", { used: format.fileSize(used), total: format.fileSize(total) })}
        </Typography>
      ) : null}
      <DotChart series={[series]} empty={empty} />
    </MachineCard>
  );
}

/** The busiest GPU. The card is not drawn without a GPU. */
export function GpuCard({ details }: { details: MachineDetails }) {
  const { t, format } = useText();
  const empty = useChartEmpty();
  const values = useMemo(() => seriesOf(details.history, (sample) => sample.gpuPercent, DOT_CHART_COLUMNS), [details]);
  const series = usePercentSeries(values, 7);
  const gpu = details.gpus[0];
  if (!gpu) return null;
  const now = gpu.utilizationPercent ?? lastPercent(values);
  const name = gpu.name.replace(/^(NVIDIA|AMD|Intel)\s+/i, "").replace(/GeForce\s+/i, "");
  const temperature =
    gpu.temperatureCelsius === null
      ? null
      : t("mobile.server.machine.monitor.temperature", { value: format.number(gpu.temperatureCelsius) });
  return (
    <MachineCard title={t("mobile.server.machine.monitor.gpu")} Icon={Gpu} className="flex-1">
      <BigValue value={now === null ? "-" : format.percent(now / 100)} />
      <Typography type="body-xs" className="text-grouped-secondary" numberOfLines={1}>
        {temperature ? `${name} · ${temperature}` : name}
      </Typography>
      <DotChart series={[series]} empty={empty} />
    </MachineCard>
  );
}
