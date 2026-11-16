import * as SliderPrimitive from "@kobalte/core/slider";
import { AGENT_REASONING_EFFORTS } from "@openbot/contracts/ipc";
import type { JSX } from "@solidjs/web";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { Brain, Lock } from "./icons";
import { useText } from "./text";

/** One effort of a model, or one variant of an OpenCode model, in its order from fast to smart. */
export interface EffortSliderOption {
  id: string;
  name: string;
}

export interface EffortSliderProps {
  options: readonly EffortSliderOption[];
  value: string | undefined;
  /** The effort that the model starts on. It gets the Recommended mark. */
  recommended?: string | undefined;
  disabled?: boolean;
  /** The name that screen readers announce for the control. */
  label: string;
  /** With one effort the agent decides: the heading says so, as "Cursor decides", over a locked track. */
  lockedLabel?: string | undefined;
  /** Runs once per choice: on a click, a key, or when a drag ends. */
  onChange: (id: string) => void;
}

/** The step names fit under the track up to this many steps. Above it, only the heading names it. */
const MAX_NAMED_STEPS = 6;
const COLUMNS = 46;
const ROWS = 4;

/** A fixed pseudo-random brightness per cell, so the track looks like a field of stars and never changes. */
function cellNoise(index: number): number {
  const value = Math.sin(index * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const CELLS = Array.from({ length: COLUMNS * ROWS }, (_, index) => {
  const x = (index % COLUMNS) / (COLUMNS - 1);
  // Brighter toward the smart end, as the design shows.
  return {
    x,
    alpha: 0.45 + 0.55 * cellNoise(index) * (0.55 + 0.45 * x),
    // About one cell in six twinkles.
    twinkle: cellNoise(index + 7919) > 0.83,
  };
});

/** Where an effort sits on the full scale from None to Ultra, 0 to 1. A variant name sits in the middle. */
export function scalePosition(id: string | undefined): number {
  const place = AGENT_REASONING_EFFORTS.findIndex((effort) => effort === id);
  return place < 0 ? 0.5 : place / (AGENT_REASONING_EFFORTS.length - 1);
}

/** Where a step sits, 0 to 1. The stylesheet turns it into the knob centre's offset on the track. */
function stepAt(step: number, last: number): JSX.CSSProperties {
  return { "--effort-step": last === 0 ? 1 : step / last };
}

/** The model picker's effort control: a pixel track from Faster to Smarter with a glowing knob. */
export function EffortSlider(props: EffortSliderProps): JSX.Element {
  const { t } = useText();
  const last = () => Math.max(props.options.length - 1, 0);
  const selectedIndex = () =>
    Math.max(
      0,
      props.options.findIndex((option) => option.id === props.value),
    );
  /** The step under the pointer during a drag. The choice is saved when the drag ends. */
  const [dragIndex, setDragIndex] = createSignal<number | undefined>();
  /**
   * A choice sent to the host, shown until `value` changes: the host saves it asynchronously, and the
   * knob must not jump back to the old step meanwhile. A second key press starts from it.
   */
  const [pendingIndex, setPendingIndex] = createSignal<number | undefined>();
  createEffect(
    () => props.value,
    () => setPendingIndex(undefined),
  );
  const index = () => dragIndex() ?? pendingIndex() ?? selectedIndex();
  /** One effort is not a choice: the track still shows, locked at that effort's place on the full scale. */
  const locked = () => props.options.length < 2;
  const position = createMemo(() => (locked() ? scalePosition(props.options[0]?.id) : index() / last()));
  const current = () => props.options[index()];
  const recommendedIndex = () => props.options.findIndex((option) => option.id === props.recommended);
  const showsNames = () => !locked() && props.options.length <= MAX_NAMED_STEPS;
  // The pill would cover "Faster" or "Smarter" at an end step, so it shows on the steps between.
  const showsRecommended = () => recommendedIndex() > 0 && recommendedIndex() < last();

  function commit(step: number): void {
    setDragIndex(undefined);
    const option = props.options[step];
    if (!option || option.id === (props.options[pendingIndex() ?? -1]?.id ?? props.value)) return;
    setPendingIndex(option.id === props.value ? undefined : step);
    props.onChange(option.id);
  }

  let pointerActive = false;
  /** Ends a drag. A cancelled pointer drops the preview; a released one saves it. */
  function endPointer(event: PointerEvent): void {
    document.removeEventListener("pointerup", endPointer);
    document.removeEventListener("pointercancel", endPointer);
    if (!pointerActive) return;
    pointerActive = false;
    if (event.type === "pointerup") commit(index());
    else setDragIndex(undefined);
  }
  /** Captured before Kobalte moves the value, so the first report of a drag is already a preview. */
  function beginPointer(): void {
    if (props.disabled) return;
    pointerActive = true;
    document.addEventListener("pointerup", endPointer);
    document.addEventListener("pointercancel", endPointer);
  }
  // A picker that closes during a drag saves nothing.
  onCleanup(() => {
    pointerActive = false;
    document.removeEventListener("pointerup", endPointer);
    document.removeEventListener("pointercancel", endPointer);
  });

  // On each move Kobalte reports the new value and then its own value again, before Solid applies the
  // write. The first report of a task is the real one, as in `SliderField`.
  let reportedThisTask = false;
  function report(step: number): void {
    if (reportedThisTask) return;
    reportedThisTask = true;
    queueMicrotask(() => {
      reportedThisTask = false;
    });
    if (pointerActive) setDragIndex(step);
    else commit(step);
  }

  return (
    <div class="effort-slider" style={{ "--effort-at": position() }}>
      <div class="effort-slider-head">
        <span>{t("provider.picker.effort")}</span>
        {/* Keyed, so the name pops in again on each change. */}
        <Show when={locked() && props.lockedLabel ? props.lockedLabel : current()?.name} keyed>
          {(name) => (
            <strong class={["effort-slider-value", { "effort-slider-value-locked": locked() }]}>
              <Show when={locked()}>
                <Lock class="effort-slider-lock" aria-hidden="true" />
              </Show>
              {name}
            </strong>
          )}
        </Show>
      </div>
      <div class="effort-slider-ends" aria-hidden="true">
        <span>{t("provider.picker.effortFaster")}</span>
        <Show when={showsRecommended()}>
          <span class="effort-slider-recommended" style={stepAt(recommendedIndex(), last())}>
            {t("provider.picker.effortRecommended")}
          </span>
        </Show>
        <span>{t("provider.picker.effortSmarter")}</span>
      </div>
      <SliderPrimitive.Root
        ref={(element: HTMLElement) => element.addEventListener("pointerdown", beginPointer, true)}
        class={["effort-slider-root", { "effort-slider-locked": locked() }]}
        value={[index()]}
        minValue={0}
        maxValue={last()}
        step={1}
        disabled={props.disabled ?? false}
        getValueLabel={(params) => props.options[params.values[0] ?? 0]?.name ?? ""}
        onChange={(values) => report(values[0] ?? selectedIndex())}
      >
        <SliderPrimitive.Track class="effort-slider-track">
          <span
            class="effort-slider-pixels"
            style={{ "--effort-columns": COLUMNS, "--effort-rows": ROWS }}
            aria-hidden="true"
          >
            <For each={CELLS}>
              {(cell) => (
                <span
                  class={[
                    "effort-slider-cell",
                    {
                      "effort-slider-cell-lit": cell.x <= position() + 0.001,
                      "effort-slider-cell-twinkle": cell.twinkle,
                    },
                  ]}
                  style={{ "--effort-x": cell.x, "--effort-alpha": cell.alpha }}
                />
              )}
            </For>
          </span>
          <For each={locked() ? [] : props.options}>
            {(_, step) => (
              <span
                class={["effort-slider-step", { "effort-slider-step-recommended": step() === recommendedIndex() }]}
                style={stepAt(step(), last())}
                aria-hidden="true"
              />
            )}
          </For>
          <SliderPrimitive.Thumb
            class="effort-slider-knob"
            // Kobalte writes `left` and a centring transform inline; the knob uses the same step
            // geometry as the dots and the names instead.
            style={{
              "--effort-step": position(),
              left: "calc(var(--effort-step) * (100% - var(--effort-knob)))",
              transform: "none",
            }}
            aria-label={props.label}
            aria-valuetext={current()?.name}
            aria-disabled={props.disabled ? "true" : undefined}
          >
            <Brain class="effort-slider-icon" aria-hidden="true" />
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Track>
      </SliderPrimitive.Root>
      <Show when={showsNames()}>
        <div class="effort-slider-names" aria-hidden="true">
          <For each={props.options}>
            {(option, step) => (
              <span
                class={[
                  "effort-slider-name",
                  {
                    "effort-slider-name-current": step() === index(),
                    "effort-slider-name-first": step() === 0,
                    "effort-slider-name-last": step() === last() && step() > 0,
                  },
                ]}
                style={stepAt(step(), last())}
              >
                {option.name}
              </span>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
