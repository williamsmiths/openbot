import type { MachineHistorySample } from "@openbot/contracts/team-protocol/machine-resources-v2";

export type LoadLevel = "normal" | "warning" | "danger";

/** As the desktop alert levels: orange from 80%, red from 95%. */
export function loadLevel(percent: number | null): LoadLevel {
  if (percent === null) return "normal";
  return percent >= 95 ? "danger" : percent >= 80 ? "warning" : "normal";
}

/** "Ubuntu 24.04 · i9-14900K": the vendor words of a CPU model do not fit on a phone. */
export function shortCpuModel(model: string | null): string | null {
  if (!model) return null;
  const short = model
    .replace(/@.*$/, "")
    .replace(/\((R|TM)\)/gi, "")
    .replace(/\b(Intel|AMD|Core|Ryzen|CPU|Processor|\d+-Core)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return short || model.trim();
}

/** The last `count` samples of one series, padded with nulls at the old end so columns keep their place. */
export function seriesOf(
  history: readonly MachineHistorySample[],
  pick: (sample: MachineHistorySample) => number | null,
  count: number,
): (number | null)[] {
  const values = history.slice(-count).map(pick);
  return [...Array<null>(Math.max(0, count - values.length)).fill(null), ...values];
}

/** Scales a series to 0..100 against its own peak (at least `floor`), for values with no natural maximum. */
export function scaleToPeak(values: readonly (number | null)[], floor: number): (number | null)[] {
  const peak = Math.max(floor, ...values.map((value) => value ?? 0));
  return values.map((value) => (value === null ? null : Math.round((value / peak) * 100)));
}

/** Whole days when the server is up a day or more, else hours, else minutes. */
export function uptimeParts(seconds: number): { unit: "day" | "hour" | "minute"; value: number } {
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 1440) return { unit: "day", value: Math.floor(minutes / 1440) };
  if (minutes >= 60) return { unit: "hour", value: Math.floor(minutes / 60) };
  return { unit: "minute", value: minutes };
}

/** Rate of the last readings against a minute ago: 1 rising, -1 falling, 0 level. */
export function trendOf(values: readonly (number | null)[], stepsBack: number): -1 | 0 | 1 {
  const present = values.filter((value): value is number => value !== null);
  if (present.length <= stepsBack) return 0;
  const delta = (present[present.length - 1] ?? 0) - (present[present.length - 1 - stepsBack] ?? 0);
  return delta > 0 ? 1 : delta < 0 ? -1 : 0;
}
