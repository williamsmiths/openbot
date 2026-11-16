// Frozen optional machine-resources-v2 wire contract.
//
// What it grants, recorded here because freezing it makes it permanent: an owner or admin of a
// server can read a live monitor of the machine that runs the host. Beyond the counters of
// `machine-resources-v1`, it names the operating system, the CPU model and each GPU, and gives the
// uptime, the load average, the GPU use and temperature, the network throughput of all interfaces
// together, and the last few minutes of these readings. It has no path, no process, no interface
// name, no address and no user. `requireAdmin` on the host is the only gate for the route. Widening
// any of it needs another capability string.
import { isDynamicRecord, isString } from "../runtime-values";
import { adminRoute, count, fields, list, nullable, type OptionalRouteCodec, string } from "./admin-wire";

export const MACHINE_DETAILS_CAPABILITY = "machine-resources-v2";

export const MACHINE_DETAILS_ROUTES = {
  details: "/v1/admin/host/machine/details",
} as const;

/** The host keeps at most this many readings, oldest first. */
export const MACHINE_HISTORY_LIMIT = 120;
/** The host lists at most this many GPUs. */
export const MACHINE_GPU_LIMIT = 8;

/** One reading of the history. A value the host could not read is null. */
export interface MachineHistorySample {
  checkedAt: string;
  /** Whole percent of the CPUs the server can use. */
  cpuPercent: number | null;
  /** Whole percent of memory in use, as `machine-resources-v1` counts it. */
  memoryPercent: number | null;
  /** Whole percent use of the busiest GPU. */
  gpuPercent: number | null;
  networkReceiveBytesPerSecond: number | null;
  networkSendBytesPerSecond: number | null;
}

export interface MachineGpu {
  /** The model, such as "NVIDIA GeForce RTX 3060". */
  name: string;
  utilizationPercent: number | null;
  temperatureCelsius: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
}

export interface MachineDetails {
  /** The operating system and its version, such as "Ubuntu 24.04". */
  osName: string | null;
  /** The CPU model, such as "Intel(R) Core(TM) i9-14900K". */
  cpuModel: string | null;
  /** The logical cores of the machine. */
  cpuCores: number;
  uptimeSeconds: number;
  /** The one-minute load average, in hundredths: 820 is a load of 8.2. Null where the system has none. */
  loadAverageHundredths: number | null;
  gpus: MachineGpu[];
  /** All interfaces but loopback together, since the reading before. */
  networkReceiveBytesPerSecond: number | null;
  networkSendBytesPerSecond: number | null;
  /** The readings of the last minute, oldest first, `sampleIntervalMs` apart. */
  history: MachineHistorySample[];
  /** Milliseconds between two readings of the history. */
  sampleIntervalMs: number;
  checkedAt: string;
}

const percent = nullable(count);
const sample = fields({
  checkedAt: string(64),
  cpuPercent: percent,
  memoryPercent: percent,
  gpuPercent: percent,
  networkReceiveBytesPerSecond: nullable(count),
  networkSendBytesPerSecond: nullable(count),
});
const gpu = fields({
  name: string(200),
  utilizationPercent: percent,
  temperatureCelsius: nullable(count),
  memoryUsedBytes: nullable(count),
  memoryTotalBytes: nullable(count),
});
const details = fields({
  osName: nullable(string(200)),
  cpuModel: nullable(string(200)),
  cpuCores: count,
  uptimeSeconds: count,
  loadAverageHundredths: nullable(count),
  gpus: list(gpu, MACHINE_GPU_LIMIT),
  networkReceiveBytesPerSecond: nullable(count),
  networkSendBytesPerSecond: nullable(count),
  history: list(sample, MACHINE_HISTORY_LIMIT),
  sampleIntervalMs: count,
  checkedAt: string(64),
});

/** The request: an optional number of the newest readings to send, so a client that polls often reads less. */
const detailsRequest = fields({}, { historyLimit: count });

export const MACHINE_DETAILS_CODECS: ReadonlyMap<string, OptionalRouteCodec> = new Map([
  [MACHINE_DETAILS_ROUTES.details, adminRoute(detailsRequest, details)],
]);

/** The newest readings to send. Absent or out of range: all that the host keeps. */
export function machineHistoryLimit(value: unknown): number {
  if (!isDynamicRecord(value)) return MACHINE_HISTORY_LIMIT;
  const limit = value.historyLimit;
  return isCount(limit) && limit > 0 ? Math.min(limit, MACHINE_HISTORY_LIMIT) : MACHINE_HISTORY_LIMIT;
}

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const isNullableCount = (value: unknown): value is number | null => value === null || isCount(value);
const isNullablePercent = (value: unknown): value is number | null =>
  value === null || (isCount(value) && value <= 100);
const isText = (value: unknown, maximum: number): value is string => isString(value) && value.length <= maximum;
const isNullableText = (value: unknown, maximum: number): value is string | null =>
  value === null || isText(value, maximum);

function decodeSample(value: unknown): MachineHistorySample {
  if (
    !isDynamicRecord(value) ||
    !isText(value.checkedAt, 64) ||
    !isNullablePercent(value.cpuPercent) ||
    !isNullablePercent(value.memoryPercent) ||
    !isNullablePercent(value.gpuPercent) ||
    !isNullableCount(value.networkReceiveBytesPerSecond) ||
    !isNullableCount(value.networkSendBytesPerSecond)
  )
    throw new Error("Invalid machine history.");
  return {
    checkedAt: value.checkedAt,
    cpuPercent: value.cpuPercent,
    memoryPercent: value.memoryPercent,
    gpuPercent: value.gpuPercent,
    networkReceiveBytesPerSecond: value.networkReceiveBytesPerSecond,
    networkSendBytesPerSecond: value.networkSendBytesPerSecond,
  };
}

function decodeGpu(value: unknown): MachineGpu {
  if (
    !isDynamicRecord(value) ||
    !isText(value.name, 200) ||
    !isNullablePercent(value.utilizationPercent) ||
    !isNullableCount(value.temperatureCelsius) ||
    !isNullableCount(value.memoryUsedBytes) ||
    !isNullableCount(value.memoryTotalBytes)
  )
    throw new Error("Invalid machine GPU.");
  return {
    name: value.name,
    utilizationPercent: value.utilizationPercent,
    temperatureCelsius: value.temperatureCelsius,
    memoryUsedBytes: value.memoryUsedBytes,
    memoryTotalBytes: value.memoryTotalBytes,
  };
}

/** Fails closed on any field outside the contract. */
export function decodeMachineDetails(value: unknown): MachineDetails {
  if (
    !isDynamicRecord(value) ||
    !isNullableText(value.osName, 200) ||
    !isNullableText(value.cpuModel, 200) ||
    !isCount(value.cpuCores) ||
    !isCount(value.uptimeSeconds) ||
    !isNullableCount(value.loadAverageHundredths) ||
    !Array.isArray(value.gpus) ||
    value.gpus.length > MACHINE_GPU_LIMIT ||
    !isNullableCount(value.networkReceiveBytesPerSecond) ||
    !isNullableCount(value.networkSendBytesPerSecond) ||
    !Array.isArray(value.history) ||
    value.history.length > MACHINE_HISTORY_LIMIT ||
    !isCount(value.sampleIntervalMs) ||
    !isText(value.checkedAt, 64)
  )
    throw new Error("Invalid machine details.");
  return {
    osName: value.osName,
    cpuModel: value.cpuModel,
    cpuCores: value.cpuCores,
    uptimeSeconds: value.uptimeSeconds,
    loadAverageHundredths: value.loadAverageHundredths,
    gpus: value.gpus.map(decodeGpu),
    networkReceiveBytesPerSecond: value.networkReceiveBytesPerSecond,
    networkSendBytesPerSecond: value.networkSendBytesPerSecond,
    history: value.history.map(decodeSample),
    sampleIntervalMs: value.sampleIntervalMs,
    checkedAt: value.checkedAt,
  };
}
