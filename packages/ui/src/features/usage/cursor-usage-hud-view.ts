import {
  DEFAULT_MACHINE_ALERT_SETTINGS,
  type MachineMetrics,
  type MachineMetricTone,
  machineAlertLevel,
  machineMetricPercent,
  machineMetricTone,
} from "@openbot/contracts/ipc";
import type { AccountUsageProviderRow, AccountUsageWindowRow, CursorUsageSlot } from "../account/account-usage-view";

/** One reading of a Cursor plan as the HUD draws it: the total as HP, then its two model pools. */
export interface CursorHudReading {
  /** The total of the plan. With no total, the pool that stops work first. */
  hp: AccountUsageWindowRow;
  /** Cursor's own models. Null on a merged plan, which has the total only. */
  auto: AccountUsageWindowRow | null;
  /** Every other model. Null on a merged plan. */
  api: AccountUsageWindowRow | null;
  /**
   * Whether HP is the plan total. A joined server or the web client gets no total, because the Team
   * API does not send it, so HP is then the pool that stops work first and shows that pool's name.
   */
  hasTotal: boolean;
}

/** The server that the HUD ring reads: its name and its latest machine reading. */
export interface CursorHudMachine {
  name: string;
  metrics: MachineMetrics;
}

/** The CPU or the memory of the server, as one half of the ring draws it. */
export interface HudMachineGauge {
  metric: "cpu" | "memory";
  /** Whole percent in use, or null when the host could not read it. */
  percent: number | null;
  tone: MachineMetricTone;
}

/** Cells of the HP bar. */
export const HUD_HP_CELLS = 22;
/** Ticks of each half ring: CPU on the left, memory on the right. */
export const HUD_TICKS = 16;

/**
 * The HUD reading of a Cursor row, or null when the row is not Cursor or has no reading. A peer on
 * an older host gets no total (the Team API does not send it), so HP is then the lower pool.
 */
export function cursorHudReading(row: AccountUsageProviderRow): CursorHudReading | null {
  if (row.provider !== "cursor" || !row.reportsUsage) return null;
  const slot = (name: CursorUsageSlot) => row.windows.find((window) => window.cursorSlot === name) ?? null;
  const auto = slot("auto");
  const api = slot("api");
  const pools = [auto, api].filter((window): window is AccountUsageWindowRow => window !== null);
  const lowest = pools.reduce<AccountUsageWindowRow | null>(
    (low, window) => (low === null || window.remainingPercent < low.remainingPercent ? window : low),
    null,
  );
  const total = slot("total");
  const hp = total ?? lowest;
  return hp ? { hp, auto, api, hasTotal: total !== null } : null;
}

/** The HUD reading of any provider row: Cursor as above, others by their own windows. */
export interface UsageHudReading extends CursorHudReading {
  /** Cursor names its bars AUTO and API; another provider names them by its windows (5-hour, weekly). */
  cursor: boolean;
}

/**
 * The HUD reading of a provider row, or null when it has no reading. Cursor shows its total and its
 * two pools. Another provider shows its two shortest windows on the bars, and HP is the one that
 * stops work first, as its rail ring did.
 */
export function usageHudReading(row: AccountUsageProviderRow): UsageHudReading | null {
  if (row.provider === "cursor") {
    const cursor = cursorHudReading(row);
    return cursor ? { ...cursor, cursor: true } : null;
  }
  if (!row.reportsUsage) return null;
  const [first, second] = row.ringWindows.length > 0 ? row.ringWindows : row.windows;
  if (!first) return null;
  const hp = second && second.remainingPercent < first.remainingPercent ? second : first;
  return { hp, auto: first, api: second ?? null, hasTotal: false, cursor: false };
}

/** The key of a row that the HUD can draw, to remember the provider the owner picked. */
export function usageHudRowKey(row: AccountUsageProviderRow): string {
  return `${row.provider}:${row.accountId ?? ""}`;
}

/** CPU and memory of the server, with the tones of the default machine alert levels. */
export function hudMachineGauges(metrics: MachineMetrics): readonly [HudMachineGauge, HudMachineGauge] {
  const gauge = (metric: "cpu" | "memory"): HudMachineGauge => {
    const percent = machineMetricPercent(metrics, metric);
    return {
      metric,
      percent,
      tone: machineMetricTone(percent, machineAlertLevel(DEFAULT_MACHINE_ALERT_SETTINGS, metric)),
    };
  };
  return [gauge("cpu"), gauge("memory")];
}

/** How many of `count` cells or ticks a percentage lights. Any amount above zero lights at least one. */
export function litCount(percent: number, count: number): number {
  if (percent <= 0) return 0;
  return Math.max(1, Math.min(count, Math.round((count * percent) / 100)));
}
