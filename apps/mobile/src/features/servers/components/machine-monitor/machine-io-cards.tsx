import type { MachineMetrics } from "@openbot/contracts/ipc";
import type { MachineDetails } from "@openbot/contracts/team-protocol/machine-resources-v2";
import { Typography } from "heroui-native";
import { useThemeColor } from "heroui-native/hooks";
import ArrowDown from "lucide-react-native/icons/arrow-down";
import ArrowLeftRight from "lucide-react-native/icons/arrow-left-right";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import HardDrive from "lucide-react-native/icons/hard-drive";
import Signal from "lucide-react-native/icons/signal";
import { useMemo } from "react";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";
import { DOT_CHART_COLUMNS, DotChart, type DotSeries } from "@/features/servers/components/machine-monitor/dot-chart";
import { BigValue, MachineCard, useLevelColors } from "@/features/servers/components/machine-monitor/machine-card";
import { useChartEmpty } from "@/features/servers/components/machine-monitor/machine-load-cards";
import { type LoadLevel, loadLevel, scaleToPeak, seriesOf } from "@/features/servers/model/machine-monitor-format";
import { useText } from "@/shared/lib/text";

const STATUS_KEYS = {
  normal: "mobile.server.machine.monitor.stable",
  warning: "mobile.server.machine.monitor.busy",
  danger: "mobile.server.machine.monitor.high",
} as const satisfies Record<LoadLevel, string>;
/** The scale of a rate chart never drops below these, so a quiet link does not fill the chart. */
const NETWORK_FLOOR_BYTES = 64 * 1024;
const LATENCY_FLOOR_MS = 200;

function latencyLevel(ms: number): LoadLevel {
  return ms >= 800 ? "danger" : ms >= 300 ? "warning" : "normal";
}

/** The round trip from this phone to the host, measured on each read. */
export function LatencyCard({ latencies }: { latencies: readonly number[] }) {
  const { t, format } = useText();
  const empty = useChartEmpty();
  const colors = useLevelColors();
  const values = useMemo(() => {
    const recent = latencies.slice(-DOT_CHART_COLUMNS);
    return [...Array<null>(Math.max(0, DOT_CHART_COLUMNS - recent.length)).fill(null), ...recent];
  }, [latencies]);
  const series = useMemo<DotSeries>(() => {
    const scaled = scaleToPeak(values, LATENCY_FLOOR_MS);
    return { values: scaled, rows: 7, colorOf: () => colors.normal };
  }, [values, colors]);
  const now = latencies[latencies.length - 1];
  const average = latencies.length ? Math.round(latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length) : null;
  const ms = (value: number) => t("mobile.server.machine.monitor.ms", { value: format.number(value) });
  return (
    <MachineCard title={t("mobile.server.machine.monitor.latency")} Icon={Signal} className="flex-1">
      <BigValue value={now === undefined ? "-" : format.number(now)} unit={now === undefined ? undefined : "ms"} />
      {average !== null ? (
        <Typography type="body-xs" className="text-grouped-secondary" numberOfLines={1}>
          {t("mobile.server.machine.monitor.latencyAverage", {
            average: ms(average),
            status: t(STATUS_KEYS[latencyLevel(average)]),
          })}
        </Typography>
      ) : null}
      <DotChart series={[series]} empty={empty} />
    </MachineCard>
  );
}

/** Download and upload of all interfaces together, two bands of dots, each on the scale of both. */
export function NetworkCard({ details }: { details: MachineDetails }) {
  const { t, format } = useText();
  const empty = useChartEmpty();
  const [success, accent] = [String(useCSSVariable("--openbot-success")), String(useThemeColor("accent"))];
  const series = useMemo<DotSeries[]>(() => {
    const down = seriesOf(details.history, (sample) => sample.networkReceiveBytesPerSecond, DOT_CHART_COLUMNS);
    const up = seriesOf(details.history, (sample) => sample.networkSendBytesPerSecond, DOT_CHART_COLUMNS);
    const peak = Math.max(NETWORK_FLOOR_BYTES, ...down.map((v) => v ?? 0), ...up.map((v) => v ?? 0));
    const scale = (values: (number | null)[]) => values.map((v) => (v === null ? null : Math.round((v / peak) * 100)));
    return [
      { values: scale(down), rows: 3, colorOf: () => success },
      { values: scale(up), rows: 3, colorOf: () => accent },
    ];
  }, [details, success, accent]);
  const rate = (bytes: number | null) =>
    bytes === null ? "-" : t("mobile.server.machine.monitor.perSecond", { size: format.fileSize(bytes) });
  return (
    <MachineCard title={t("mobile.server.machine.monitor.network")} Icon={ArrowLeftRight} className="flex-1">
      <View className="gap-0.5">
        <View className="flex-row items-center gap-1">
          <ArrowDown size={14} color={success} strokeWidth={2} />
          <Typography.Paragraph
            className="font-semibold"
            numberOfLines={1}
            style={{ fontSize: 20, lineHeight: 26, fontVariant: ["tabular-nums"] }}
          >
            {rate(details.networkReceiveBytesPerSecond)}
          </Typography.Paragraph>
        </View>
        <View className="flex-row items-center gap-1">
          <ArrowUp size={12} color={accent} strokeWidth={2} />
          <Typography type="body-xs" className="text-grouped-secondary" numberOfLines={1}>
            {rate(details.networkSendBytesPerSecond)}
          </Typography>
        </View>
      </View>
      <DotChart series={series} empty={empty} />
      <View className="flex-row items-center gap-3">
        <Legend color={success} label={t("mobile.server.machine.monitor.download")} />
        <Legend color={accent} label={t("mobile.server.machine.monitor.upload")} />
      </View>
    </MachineCard>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Typography type="body-xs" className="text-grouped-secondary" numberOfLines={1}>
        {label}
      </Typography>
    </View>
  );
}

/** The system disk from the v1 reading, as a two-row bar of dots. Not drawn without it. */
export function DiskCard({ metrics }: { metrics: MachineMetrics | undefined }) {
  const { t, format } = useText();
  const empty = useChartEmpty();
  const used = metrics?.diskUsedBytes ?? null;
  const free = metrics?.diskFreeBytes ?? null;
  const total = metrics?.diskTotalBytes ?? null;
  const percent = used !== null && free !== null && used + free > 0 ? Math.round((used / (used + free)) * 100) : null;
  const colors = useLevelColors();
  const bands = useMemo<DotSeries[]>(() => {
    if (percent === null) return [];
    const color = colors[loadLevel(percent)];
    const dots = DOT_CHART_COLUMNS * 2;
    const on = Math.round((percent / 100) * dots);
    const cells = Array.from({ length: dots }, (_, index) => (index < on ? 100 : 0));
    return [
      { values: cells.slice(0, DOT_CHART_COLUMNS), rows: 1, colorOf: () => color },
      { values: cells.slice(DOT_CHART_COLUMNS), rows: 1, colorOf: () => color },
    ];
  }, [percent, colors]);
  if (percent === null || free === null || total === null) return null;
  return (
    <MachineCard title={t("mobile.server.machine.disk")} Icon={HardDrive}>
      <View className="flex-row items-end justify-between gap-3">
        <View className="min-w-0 shrink gap-0.5">
          <Typography.Paragraph className="font-semibold" numberOfLines={1}>
            {t("mobile.server.machine.monitor.diskSystem")}
          </Typography.Paragraph>
          <Typography type="body-xs" className="text-grouped-secondary" numberOfLines={1}>
            {t("mobile.server.machine.monitor.diskFree", {
              free: format.fileSize(free),
              total: format.fileSize(total),
            })}
          </Typography>
          <Typography type="body-xs" className="text-grouped-secondary" numberOfLines={1}>
            {t("mobile.server.machine.monitor.diskUsed", { percent: format.percent(percent / 100) })}
          </Typography>
        </View>
        <DotChart series={bands} empty={empty} />
      </View>
    </MachineCard>
  );
}
