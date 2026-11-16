import type { AvatarColor } from "@openbot/contracts/ipc";
import type { AppTextKey } from "@openbot/i18n";
import { Button } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { createMemo, For } from "solid-js";
import { ColorPicker } from "../../color-picker";
import { Check, Palette, Plus } from "../../icons";
import { useText } from "../../text";
import { type ColorPopupPicker, createChatColorPopup } from "./ChatColorSetting";

/** The preset main colors. The hex values are data, as the agent colors are; the names are keys. */
const ACCENT_PRESETS: readonly { value: AvatarColor; label: AppTextKey }[] = [
  { value: "#3b82f6", label: "agent.color.blue" },
  { value: "#14b8c8", label: "agent.color.cyan" },
  { value: "#8b6cff", label: "agent.color.violet" },
  { value: "#22b573", label: "agent.color.green" },
  { value: "#e8892c", label: "agent.color.orange" },
  { value: "#e5508f", label: "agent.color.pink" },
];

function accentPicker(presets: () => { value: AvatarColor; label: string }[]): ColorPopupPicker {
  return (props) => {
    const { t } = useText();
    return (
      <ColorPicker
        label={props.label}
        presets={presets()}
        value={props.value}
        onChange={props.onChange}
        clearLabel={t("settings.accent.theme")}
      />
    );
  };
}

export interface AccentColorSettingProps {
  /** The saved main color, or null for the accent of the theme. */
  value: AvatarColor | null;
  onChange: (value: AvatarColor | null) => void;
}

/**
 * The main color of Settings › Appearance (AC-004): the accent of the theme, six presets, and a custom
 * color from the color picker in a popup. The custom color saves once, when the popup closes.
 */
export function AccentColorSetting(props: AccentColorSettingProps): JSX.Element {
  const { t } = useText();
  const presets = createMemo(() => ACCENT_PRESETS.map((preset) => ({ value: preset.value, label: t(preset.label) })));
  const popup = createChatColorPopup(
    () => props.value,
    (value) => props.onChange(value),
    accentPicker(presets),
  );
  const custom = () => {
    const shown = popup.shown();
    return shown !== null && !ACCENT_PRESETS.some((preset) => preset.value === shown);
  };
  const name = () => {
    const shown = popup.shown();
    if (shown === null) return t("settings.accent.theme");
    return presets().find((preset) => preset.value === shown)?.label ?? shown.toUpperCase();
  };
  return (
    <div class="accent-setting">
      <fieldset class="accent-swatches" aria-label={t("settings.accent.title")}>
        <Button
          variant="ghost"
          type="button"
          class={["accent-swatch", "accent-swatch-theme", { "accent-swatch-selected": props.value === null }]}
          aria-label={t("settings.accent.theme")}
          aria-pressed={props.value === null ? "true" : "false"}
          data-cuelume-tap="select"
          onClick={() => props.onChange(null)}
        >
          <Palette aria-hidden="true" />
        </Button>
        <For each={ACCENT_PRESETS}>
          {(preset) => (
            <Button
              variant="ghost"
              type="button"
              class={["accent-swatch", { "accent-swatch-selected": props.value === preset.value }]}
              style={{ "--accent-swatch": preset.value }}
              aria-label={t(preset.label)}
              aria-pressed={props.value === preset.value ? "true" : "false"}
              data-cuelume-tap="select"
              onClick={() => props.onChange(preset.value)}
            >
              <Check aria-hidden="true" />
            </Button>
          )}
        </For>
        <Button
          variant="ghost"
          type="button"
          class={["accent-swatch", "accent-swatch-custom", { "accent-swatch-selected": custom() }]}
          style={custom() ? { "--accent-swatch": popup.shown() ?? undefined } : undefined}
          aria-label={t("settings.accent.custom")}
          aria-haspopup="dialog"
          aria-expanded={popup.open() ? "true" : "false"}
          data-cuelume-tap="select"
          onClick={(event) => popup.toggle(event.currentTarget)}
        >
          <span ref={popup.dot} class="accent-swatch-plus" aria-hidden="true">
            {custom() ? <Check /> : <Plus />}
          </span>
        </Button>
      </fieldset>
      <span class="accent-name">{name()}</span>
      {popup.popup(t("settings.accent.title"))}
    </div>
  );
}
