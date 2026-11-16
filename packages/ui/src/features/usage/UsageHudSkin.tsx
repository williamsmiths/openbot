import { MotionTooltip } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { createUniqueId, For, Show } from "solid-js";
import darkSkin from "../../assets/usage-hud/hud-skin-dark.webp";
import litSkin from "../../assets/usage-hud/hud-skin-lit.webp";
import { useText } from "../../text";
import { type AccountUsageWindowRow, formatUsageResetIn } from "../account/account-usage-view";
import {
  hpCellRect,
  POOL_BAR_Y,
  poolFillPoints,
  poolRestPoints,
  RING_BOX,
  SKIN,
  SKIN_TEXT,
  unlitTickPaths,
} from "./cursor-usage-hud-skin";
import {
  type CursorHudMachine,
  HUD_HP_CELLS,
  hudMachineGauges,
  litCount,
  type UsageHudReading,
} from "./cursor-usage-hud-view";

const HP_CELLS = Array.from({ length: HUD_HP_CELLS }, (_, index) => index);

/**
 * The GPT skin with one provider's reading on it: the lit image, the dim image over each part that is
 * not filled, and the text on the spots the image left for it. The reactor is the server: CPU climbs
 * its left ticks and is the number in the core, memory climbs its right ticks, and a light sweeps the
 * outer arc faster as the CPU works harder.
 */
export function UsageHudSkin(props: { reading: UsageHudReading; machine: CursorHudMachine | null; now: number }) {
  const text = useText();
  const { t, format } = text;
  const ids = { unlit: createUniqueId(), hpLit: createUniqueId(), autoLit: createUniqueId(), apiLit: createUniqueId() };
  const hp = () => props.reading.hp;
  const hpLit = () => litCount(hp().remainingPercent, HUD_HP_CELLS);
  const gauges = () => (props.machine ? hudMachineGauges(props.machine.metrics) : null);
  const cpu = () => gauges()?.[0].percent ?? null;
  const percent = (value: number) => format.percent(Math.round(value) / 100);
  const windowLines = (title: string, window: AccountUsageWindowRow) => [
    title,
    t("account.usage.window.remaining", { percent: percent(window.remainingPercent) }),
    ...(window.resetsAtLabel ? [t("account.usage.resetsAt", { time: window.resetsAtLabel })] : []),
  ];
  /** The card of one half of the reactor: CPU on the left, memory on the right, of the named server. */
  const machineLines = (index: 0 | 1) => {
    const machine = props.machine;
    const gauge = gauges()?.[index];
    if (!machine || !gauge) return null;
    return [
      t(index === 0 ? "files.machine.cpu" : "files.machine.memory"),
      gauge.percent === null
        ? t("files.machine.unknown")
        : t("files.machine.used", { percent: percent(gauge.percent) }),
      machine.name,
    ];
  };
  // Cursor names its bars AUTO and API; another provider names them by its windows.
  const barLabel = (slot: "auto" | "api", window: AccountUsageWindowRow) =>
    props.reading.cursor ? t(slot === "auto" ? "usage.hud.auto" : "usage.hud.api") : window.label;
  const barTitle = (slot: "auto" | "api", window: AccountUsageWindowRow) =>
    props.reading.cursor
      ? t(slot === "auto" ? "account.usage.window.cursorModels" : "account.usage.window.otherModels")
      : window.label;
  const reset = () => formatUsageResetIn(hp().resetsAt, props.now, text);
  // One turn of the sweep: 6 s for an idle server, about 1.2 s at full load.
  const spin = () => `${(6 - (4.8 * Math.max(0, Math.min(100, cpu() ?? 0))) / 100).toFixed(2)}s`;
  return (
    <>
      <img class="usage-hud-skin" src={litSkin} alt="" aria-hidden="true" draggable={false} />
      <svg class="usage-hud-cover" viewBox={`0 0 ${SKIN.width} ${SKIN.height}`} aria-hidden="true">
        <defs>
          <clipPath id={ids.unlit}>
            <For each={HP_CELLS}>
              {(cell) => (
                <Show when={cell >= hpLit()}>
                  <rect {...hpCellRect(cell, HUD_HP_CELLS)} />
                </Show>
              )}
            </For>
            <polygon points={poolRestPoints(props.reading.auto?.remainingPercent ?? 0, POOL_BAR_Y.auto)} />
            <polygon points={poolRestPoints(props.reading.api?.remainingPercent ?? 0, POOL_BAR_Y.api)} />
            {/* As a CSS `d`, so a new machine reading moves the ticks instead of jumping. */}
            <path
              class="usage-hud-ticks-cover"
              style={`d: path("${unlitTickPaths(cpu(), gauges()?.[1].percent ?? null)}")`}
            />
          </clipPath>
          <clipPath id={ids.hpLit}>
            <For each={HP_CELLS}>
              {(cell) => (
                <Show when={cell < hpLit()}>
                  <rect {...hpCellRect(cell, HUD_HP_CELLS)} />
                </Show>
              )}
            </For>
          </clipPath>
          <clipPath id={ids.autoLit}>
            <polygon points={poolFillPoints(props.reading.auto?.remainingPercent ?? 0, POOL_BAR_Y.auto)} />
          </clipPath>
          <clipPath id={ids.apiLit}>
            <polygon points={poolFillPoints(props.reading.api?.remainingPercent ?? 0, POOL_BAR_Y.api)} />
          </clipPath>
        </defs>
        <image href={darkSkin} width={SKIN.width} height={SKIN.height} clip-path={`url(#${ids.unlit})`} />
        {/* A low amount turns the lit part of its gauge amber, then red. */}
        <ToneLayer clip={ids.hpLit} tone={hp().tone} />
        <ToneLayer clip={ids.autoLit} tone={props.reading.auto?.tone} />
        <ToneLayer clip={ids.apiLit} tone={props.reading.api?.tone} />
      </svg>
      <Show when={props.machine}>
        <span
          class="usage-hud-sweep"
          aria-hidden="true"
          style={{
            left: `${RING_BOX.left}%`,
            top: `${RING_BOX.top}%`,
            width: `${RING_BOX.width}%`,
            height: `${RING_BOX.height}%`,
            "--usage-hud-spin": spin(),
          }}
        />
      </Show>

      <HudRow spot={SKIN_TEXT.hp} slot="total" tone={hp().tone} label={t("usage.hud.hp")} window={hp()} />
      <Show when={reset()}>
        {(time) => (
          <span class="usage-hud-text usage-hud-reset" style={place(SKIN_TEXT.reset)}>
            {t("usage.hud.reset", { time: time() })}
          </span>
        )}
      </Show>
      <Show when={props.reading.auto}>
        {(auto) => (
          <HudRow
            spot={SKIN_TEXT.auto}
            slot="auto"
            tone={auto().tone}
            label={barLabel("auto", auto())}
            window={auto()}
          />
        )}
      </Show>
      <Show when={props.reading.api}>
        {(api) => (
          <HudRow spot={SKIN_TEXT.api} slot="api" tone={api().tone} label={barLabel("api", api())} window={api()} />
        )}
      </Show>
      <Show when={cpu()}>
        {(value) => (
          <span class="usage-hud-text usage-hud-core" style={{ ...place(SKIN_TEXT.core), "--usage-hud-spin": spin() }}>
            {Math.round(value())}
          </span>
        )}
      </Show>

      {/* Hover a part to read what it counts. */}
      <Show when={machineLines(0)}>{(lines) => <HudZone box={ZONES.cpu} lines={lines()} />}</Show>
      <Show when={machineLines(1)}>{(lines) => <HudZone box={ZONES.memory} lines={lines()} />}</Show>
      <HudZone
        box={ZONES.hp}
        lines={windowLines(props.reading.hasTotal ? t("account.usage.window.total") : hp().label, hp())}
      />
      <Show when={props.reading.auto}>
        {(auto) => <HudZone box={ZONES.auto} lines={windowLines(barTitle("auto", auto()), auto())} />}
      </Show>
      <Show when={props.reading.api}>
        {(api) => <HudZone box={ZONES.api} lines={windowLines(barTitle("api", api()), api())} />}
      </Show>
    </>
  );
}

/** A label and its number, as "HP 77" sits on the skin. */
function HudRow(props: {
  spot: { left: number; top: number };
  slot: "total" | "auto" | "api";
  tone: AccountUsageWindowRow["tone"];
  label: string;
  window: AccountUsageWindowRow;
}) {
  return (
    <span
      class="usage-hud-text usage-hud-row"
      data-hud-slot={props.slot}
      data-usage-tone={props.tone}
      style={place(props.spot)}
    >
      <span class="usage-hud-label">{props.label}</span>
      <span class="usage-hud-value">{String(Math.round(props.window.remainingPercent)).padStart(2, "0")}</span>
    </span>
  );
}

/** The lit skin again over a lit gauge, turned to the gauge's low tone. Nothing at the neutral tone. */
function ToneLayer(props: { clip: string; tone: AccountUsageWindowRow["tone"] | undefined }) {
  return (
    <Show when={props.tone && props.tone !== "neutral"}>
      <image
        class="usage-hud-tone"
        data-usage-tone={props.tone}
        href={litSkin}
        width={SKIN.width}
        height={SKIN.height}
        clip-path={`url(#${props.clip})`}
      />
    </Show>
  );
}

/** The hover areas of the HUD, in percent of its box. */
const ZONES = {
  cpu: { left: 1.2, top: 2.4, width: 16.8, height: 87 },
  memory: { left: 18, top: 2.4, width: 16.8, height: 87 },
  hp: { left: 37, top: 9.6, width: 59.7, height: 37 },
  auto: { left: 37, top: 51.3, width: 59.7, height: 16 },
  api: { left: 37, top: 69.9, width: 59.7, height: 16.6 },
} as const;

function HudZone(props: {
  box: { left: number; top: number; width: number; height: number };
  lines: readonly string[];
}) {
  return (
    <span
      class="usage-hud-zone"
      style={{
        left: `${props.box.left}%`,
        top: `${props.box.top}%`,
        width: `${props.box.width}%`,
        height: `${props.box.height}%`,
      }}
    >
      {/* A card in the HUD's own neon: the name, then the amount, then the reset or the server. */}
      <MotionTooltip
        placement="right"
        class="usage-hud-tip-card"
        openDelay={80}
        closeDelay={40}
        content={
          <span class="usage-hud-tip">
            <For each={props.lines}>{(line) => <span>{line}</span>}</For>
          </span>
        }
      >
        <span class="usage-hud-zone-area" />
      </MotionTooltip>
    </span>
  );
}

/** Places a text at its spot on the skin. */
function place(spot: { left?: number; right?: number; top: number }): JSX.CSSProperties {
  return {
    ...(spot.left === undefined ? {} : { left: `${spot.left}%` }),
    ...(spot.right === undefined ? {} : { right: `${spot.right}%` }),
    top: `${spot.top}%`,
  };
}
