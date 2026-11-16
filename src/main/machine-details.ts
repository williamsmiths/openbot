import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { cpus, loadavg, release, type, uptime } from "node:os";
import { machineMetricPercent } from "@openbot/contracts/ipc";
import {
  MACHINE_GPU_LIMIT,
  MACHINE_HISTORY_LIMIT,
  type MachineDetails,
  type MachineGpu,
  type MachineHistorySample,
} from "@openbot/contracts/team-protocol/machine-resources-v2";
import { Effect, Semaphore } from "effect";
import { MachineMetricsSampler } from "./machine-metrics";

/** The history has one reading this often: twice a second, so the monitor looks live. */
export const MACHINE_SAMPLE_INTERVAL_MS = 500;
/** `nvidia-smi` starts a process, so the GPU is read at every other sample: once a second. */
const GPU_EVERY_SAMPLES = 2;
/** Sampling stops when no request came for this long, so an unwatched host spends nothing. */
const IDLE_STOP_MS = 2 * 60_000;
const NVIDIA_SMI_TIMEOUT_MS = 3_000;
const TEXT_LIMIT = 200;
const MIB = 1024 * 1024;

interface NetworkCounters {
  at: number;
  receiveBytes: number;
  sendBytes: number;
}

interface NetworkRate {
  receive: number | null;
  send: number | null;
}

/** The part of the readings that changes at each sample and goes in the answer next to the history. */
interface Reading {
  sample: MachineHistorySample;
  gpus: MachineGpu[];
}

/**
 * Reads the live monitor of the machine for `machine-resources-v2`. It has no path, process name,
 * interface name or address. Sampling is lazy: the first `details` call starts a timer, and the
 * timer stops when no call came for two minutes. The history is then dropped.
 */
export class MachineDetailsSampler {
  readonly #metrics: MachineMetricsSampler;
  readonly #platform: NodeJS.Platform;
  readonly #lock = Semaphore.makeUnsafe(1);
  readonly #history: MachineHistorySample[] = [];
  #staticInfo: { osName: string | null; cpuModel: string | null } | null = null;
  #gpus: MachineGpu[] = [];
  #previousNetwork: NetworkCounters | null = null;
  #samples = 0;
  #timer: ReturnType<typeof setInterval> | null = null;
  #lastRequestAt = 0;
  #closed = false;

  constructor(dataPath: string, platform: NodeJS.Platform = process.platform) {
    // Its own sampler, so its frequent reads do not shorten the CPU window of the other readers.
    // The monitor reads twice a second, so a CPU pair a quarter of a second apart is enough.
    this.#metrics = new MachineMetricsSampler(dataPath, platform, 250);
    this.#platform = platform;
  }

  /** The details, with the newest `historyLimit` readings. Each call keeps the sampling timer alive. */
  details(historyLimit = MACHINE_HISTORY_LIMIT): Effect.Effect<MachineDetails> {
    return this.#details(historyLimit);
  }

  readonly #details = Effect.fn("MachineDetails.details")(function* (
    this: MachineDetailsSampler,
    historyLimit: number,
  ) {
    this.#lastRequestAt = Date.now();
    this.#startTimer();
    // The first request after a pause has no reading yet.
    const latest = this.#history.at(-1) ?? (yield* this.#sample()).sample;
    const info = this.#staticInfo ?? (yield* this.#readStaticInfo());
    this.#staticInfo = info;
    const cores = cpus().length;
    return {
      osName: info.osName,
      cpuModel: info.cpuModel,
      cpuCores: cores,
      uptimeSeconds: Math.floor(uptime()),
      loadAverageHundredths: this.#platform === "win32" ? null : Math.round((loadavg()[0] ?? 0) * 100),
      gpus: [...this.#gpus],
      networkReceiveBytesPerSecond: latest.networkReceiveBytesPerSecond,
      networkSendBytesPerSecond: latest.networkSendBytesPerSecond,
      history: this.#history.slice(-Math.max(1, historyLimit)),
      sampleIntervalMs: MACHINE_SAMPLE_INTERVAL_MS,
      checkedAt: latest.checkedAt,
    } satisfies MachineDetails;
  });

  /** Stops the timer. Called at shutdown. */
  close(): void {
    this.#closed = true;
    this.#stopTimer();
  }

  #startTimer(): void {
    if (this.#timer || this.#closed) return;
    this.#timer = setInterval(() => void this.#tick(), MACHINE_SAMPLE_INTERVAL_MS);
    this.#timer.unref();
  }

  #stopTimer(): void {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
    this.#history.length = 0;
    this.#gpus = [];
    this.#previousNetwork = null;
  }

  async #tick(): Promise<void> {
    if (Date.now() - this.#lastRequestAt > IDLE_STOP_MS) {
      this.#stopTimer();
      return;
    }
    // Every read below catches its own failure, so a failed sample only leaves a gap.
    await Effect.runPromise(this.#sample());
  }

  /** One reading, added to the history. One at a time, so the network rate has a clean pair. */
  #sample = Effect.fn("MachineDetails.sample")(function* (this: MachineDetailsSampler) {
    return yield* this.#lock.withPermit(
      Effect.gen({ self: this }, function* () {
        const readsGpu = this.#samples % GPU_EVERY_SAMPLES === 0 || this.#gpus.length === 0;
        this.#samples += 1;
        const gpuRead = readsGpu ? readGpus() : Effect.succeed(this.#gpus);
        const [metrics, gpus, network] = yield* Effect.all([this.#metrics.read(), gpuRead, this.#readNetwork()], {
          concurrency: "unbounded",
        });
        const gpuPercents = gpus.flatMap((gpu) => (gpu.utilizationPercent === null ? [] : [gpu.utilizationPercent]));
        const sample: MachineHistorySample = {
          checkedAt: metrics.checkedAt,
          cpuPercent: metrics.cpuPercent,
          memoryPercent: machineMetricPercent(metrics, "memory"),
          gpuPercent: gpuPercents.length > 0 ? Math.max(...gpuPercents) : null,
          networkReceiveBytesPerSecond: network.receive,
          networkSendBytesPerSecond: network.send,
        };
        this.#history.push(sample);
        if (this.#history.length > MACHINE_HISTORY_LIMIT)
          this.#history.splice(0, this.#history.length - MACHINE_HISTORY_LIMIT);
        this.#gpus = gpus;
        return { sample, gpus } satisfies Reading;
      }),
    );
  });

  /** Bytes per second of all interfaces but loopback since the reading before. Null on the first read or off Linux. */
  #readNetwork = Effect.fn("MachineDetails.network")(function* (this: MachineDetailsSampler) {
    if (this.#platform !== "linux") return { receive: null, send: null } satisfies NetworkRate;
    const text = yield* Effect.tryPromise(() => readFile("/proc/net/dev", "utf8")).pipe(
      Effect.catch(() => Effect.succeed(null)),
    );
    const current = text === null ? null : parseNetworkCounters(text, Date.now());
    const previous = this.#previousNetwork;
    this.#previousNetwork = current;
    return networkRate(previous, current);
  });

  readonly #readStaticInfo = Effect.fn("MachineDetails.static")(function* (this: MachineDetailsSampler) {
    const osName =
      this.#platform === "linux"
        ? yield* Effect.tryPromise(() => readFile("/etc/os-release", "utf8")).pipe(
            Effect.map(parseOsRelease),
            Effect.catch(() => Effect.succeed(null)),
          )
        : otherOsName();
    const model = cpus()[0]?.model.replace(/\s+/gu, " ").trim() ?? "";
    return { osName, cpuModel: model ? model.slice(0, TEXT_LIMIT) : null };
  });
}

/** "Ubuntu 24.04" from the NAME and VERSION_ID of `/etc/os-release`. A distribution with no version has its name only. */
export function parseOsRelease(text: string): string | null {
  const value = (key: string): string | null => {
    const match = new RegExp(`^${key}=(.*)$`, "mu").exec(text);
    const raw = match?.[1]
      ?.trim()
      .replace(/^(["'])(.*)\1$/u, "$2")
      .trim();
    return raw ? raw : null;
  };
  const name = value("NAME") ?? value("PRETTY_NAME");
  if (!name) return null;
  const version = value("VERSION_ID");
  return (version ? `${name} ${version}` : name).slice(0, TEXT_LIMIT);
}

function otherOsName(): string | null {
  const name = `${type()} ${release()}`.trim();
  return name ? name.slice(0, TEXT_LIMIT) : null;
}

/** The sum of every interface but `lo`. Null when no interface line has numbers. */
export function parseNetworkCounters(text: string, at: number): NetworkCounters | null {
  let receiveBytes = 0;
  let sendBytes = 0;
  let found = false;
  for (const line of text.split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    if (line.slice(0, colon).trim() === "lo") continue;
    const fields = line
      .slice(colon + 1)
      .trim()
      .split(/\s+/u)
      .map(Number);
    const receive = fields[0];
    const send = fields[8];
    if (receive === undefined || send === undefined || !Number.isFinite(receive) || !Number.isFinite(send)) continue;
    receiveBytes += receive;
    sendBytes += send;
    found = true;
  }
  return found ? { at, receiveBytes, sendBytes } : null;
}

function networkRate(previous: NetworkCounters | null, current: NetworkCounters | null): NetworkRate {
  const seconds = previous && current ? (current.at - previous.at) / 1000 : 0;
  // A counter that went down means an interface left or the counter wrapped: no rate for this pair.
  if (
    !previous ||
    !current ||
    seconds <= 0 ||
    current.receiveBytes < previous.receiveBytes ||
    current.sendBytes < previous.sendBytes
  )
    return { receive: null, send: null };
  return {
    receive: Math.round((current.receiveBytes - previous.receiveBytes) / seconds),
    send: Math.round((current.sendBytes - previous.sendBytes) / seconds),
  };
}

const readNvidiaSmi = Effect.callback<string, Error>((resume) => {
  const child = execFile(
    "nvidia-smi",
    ["--query-gpu=name,utilization.gpu,temperature.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"],
    { encoding: "utf8", timeout: NVIDIA_SMI_TIMEOUT_MS },
    (error, stdout) => resume(error ? Effect.fail(error) : Effect.succeed(stdout)),
  );
  return Effect.sync(() => {
    child.kill();
  });
});

/** The GPUs that `nvidia-smi` lists. A host with no such program, or a failed call, has none. */
const readGpus = Effect.fn("MachineDetails.gpus")(function* () {
  return yield* readNvidiaSmi.pipe(
    Effect.map(parseNvidiaSmi),
    Effect.catch((): Effect.Effect<MachineGpu[]> => Effect.succeed([])),
  );
});

function number(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Each line is "name, use %, temperature, used MiB, total MiB". "[N/A]" reads as null. */
export function parseNvidiaSmi(text: string): MachineGpu[] {
  const gpus: MachineGpu[] = [];
  for (const line of text.split("\n")) {
    const parts = line.split(",").map((part) => part.trim());
    if (parts.length < 5) continue;
    const [used, total] = parts.slice(-2);
    const [utilization, temperature] = parts.slice(-4, -2);
    const name = parts.slice(0, -4).join(", ").slice(0, TEXT_LIMIT);
    if (!name) continue;
    const memoryUsed = number(used);
    const memoryTotal = number(total);
    const utilizationValue = number(utilization);
    const temperatureValue = number(temperature);
    gpus.push({
      name,
      utilizationPercent: utilizationValue === null ? null : Math.min(100, Math.round(utilizationValue)),
      temperatureCelsius: temperatureValue === null ? null : Math.round(temperatureValue),
      memoryUsedBytes: memoryUsed === null ? null : Math.round(memoryUsed * MIB),
      memoryTotalBytes: memoryTotal === null ? null : Math.round(memoryTotal * MIB),
    });
    if (gpus.length >= MACHINE_GPU_LIMIT) break;
  }
  return gpus;
}
