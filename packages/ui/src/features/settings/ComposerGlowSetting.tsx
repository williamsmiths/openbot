import {
  APP_COMPOSER_GLOW_GRADIENTS,
  APP_COMPOSER_GLOWS,
  type AppComposerGlow,
  type AppComposerGlowGradient,
  COMPOSER_GLOW_GRADIENTS,
  isComposerGlow,
} from "@openbot/contracts/app-appearance";
import type { AppTextKey } from "@openbot/i18n";
import { Button, SlidingTabs } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { For } from "solid-js";
import { Ban, Check, Palette, Pause, RotateCw } from "../../icons";
import { useText } from "../../text";

const GLOW_LABEL = {
  turn: "settings.composerGlow.turn",
  still: "settings.composerGlow.still",
  off: "settings.composerGlow.off",
} as const satisfies Record<AppComposerGlow, AppTextKey>;

const GLOW_ICON = { turn: RotateCw, still: Pause, off: Ban } as const;

const GRADIENT_LABEL = {
  sunset: "settings.composerGlow.gradient.sunset",
  ocean: "settings.composerGlow.gradient.ocean",
  aurora: "settings.composerGlow.gradient.aurora",
  neon: "settings.composerGlow.gradient.neon",
  fire: "settings.composerGlow.gradient.fire",
  mint: "settings.composerGlow.gradient.mint",
} as const satisfies Record<AppComposerGlowGradient, AppTextKey>;

/**
 * The glow of the message box: the light turns, stays still, or is off (AC-006), and its colors: the
 * main color or one of the gradients (AC-011). The colors stay while the glow is off, so they come back.
 */
export function ComposerGlowSetting(props: {
  value: AppComposerGlow;
  onChange: (value: AppComposerGlow) => void;
  gradient: AppComposerGlowGradient | null;
  onGradient: (value: AppComposerGlowGradient | null) => void;
}): JSX.Element {
  const { t } = useText();
  const name = () => (props.gradient === null ? t("settings.accent.title") : t(GRADIENT_LABEL[props.gradient]));
  return (
    <div class="composer-glow-setting">
      <SlidingTabs.Root value={props.value} onChange={(value) => isComposerGlow(value) && props.onChange(value)}>
        <SlidingTabs.List aria-label={t("settings.composerGlow.title")}>
          <For each={APP_COMPOSER_GLOWS}>
            {(glow) => {
              const Icon = GLOW_ICON[glow];
              return (
                <SlidingTabs.Trigger value={glow} class="appearance-segment">
                  <Icon aria-hidden="true" />
                  <span>{t(GLOW_LABEL[glow])}</span>
                </SlidingTabs.Trigger>
              );
            }}
          </For>
        </SlidingTabs.List>
      </SlidingTabs.Root>
      <div class="accent-setting">
        <fieldset
          class="accent-swatches"
          aria-label={t("settings.composerGlow.colors")}
          disabled={props.value === "off"}
        >
          <Button
            variant="ghost"
            type="button"
            class={["accent-swatch", "accent-swatch-theme", { "accent-swatch-selected": props.gradient === null }]}
            aria-label={t("settings.accent.title")}
            aria-pressed={props.gradient === null ? "true" : "false"}
            data-cuelume-tap="select"
            onClick={() => props.onGradient(null)}
          >
            <Palette aria-hidden="true" />
          </Button>
          <For each={APP_COMPOSER_GLOW_GRADIENTS}>
            {(gradient) => {
              const colors = COMPOSER_GLOW_GRADIENTS[gradient];
              return (
                <Button
                  variant="ghost"
                  type="button"
                  class={["accent-swatch", { "accent-swatch-selected": props.gradient === gradient }]}
                  style={{ "--accent-swatch": `linear-gradient(135deg, ${colors.start}, ${colors.end})` }}
                  title={t(GRADIENT_LABEL[gradient])}
                  aria-label={t(GRADIENT_LABEL[gradient])}
                  aria-pressed={props.gradient === gradient ? "true" : "false"}
                  data-cuelume-tap="select"
                  onClick={() => props.onGradient(gradient)}
                >
                  <Check aria-hidden="true" />
                </Button>
              );
            }}
          </For>
        </fieldset>
        <span class="accent-name">{name()}</span>
      </div>
    </div>
  );
}
