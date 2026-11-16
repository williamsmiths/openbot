import type { AppAppearance } from "@openbot/contracts/app-appearance";
import type { AppTextKey } from "@openbot/i18n";
import { Button, SlidingTabs } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { For, Show } from "solid-js";
import { LayoutGrid, Monitor, Moon, Sun } from "../../icons";
import { useText } from "../../text";
import { type AppearanceSelectValue, paletteSelectValue } from "./AppearanceSelect";

export type ThemeFilter = "all" | "dark" | "light";

const THEME_FILTERS = ["all", "dark", "light"] as const satisfies readonly ThemeFilter[];

const FILTER_LABEL = {
  all: "settings.appearance.mode.all",
  dark: "settings.appearance.theme.dark",
  light: "settings.appearance.theme.light",
} as const satisfies Record<ThemeFilter, AppTextKey>;

const FILTER_ICON = { all: LayoutGrid, dark: Moon, light: Sun } as const;

/** The order of the plain themes: System, then Dark, then Light. */
const BASE_THEMES = ["system", "dark", "light"] as const satisfies readonly AppAppearance[];

const APPEARANCE_LABEL = {
  system: "settings.appearance.theme.system",
  light: "settings.appearance.theme.light",
  dark: "settings.appearance.theme.dark",
} as const satisfies Record<AppAppearance, AppTextKey>;

const APPEARANCE_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

export interface ThemeCardPalette {
  id: string;
  /** The name that the palette file gives. It is data, so it shows as written. */
  name: string;
  scheme: "light" | "dark";
  /** Hex colors that main validated; the mini preview draws them. */
  colors: { frame: string; canvas: string; surface: string; border: string; accent: string };
}

function isThemeFilter(value: string): value is ThemeFilter {
  return THEME_FILTERS.some((filter) => filter === value);
}

/** The Mode filter of the theme cards: all of them, or the dark or the light ones. UI state only. */
export function ThemeModeFilter(props: { value: ThemeFilter; onChange: (value: ThemeFilter) => void }): JSX.Element {
  const { t } = useText();
  return (
    <SlidingTabs.Root value={props.value} onChange={(value) => isThemeFilter(value) && props.onChange(value)}>
      <SlidingTabs.List aria-label={t("settings.appearance.mode.label")}>
        <For each={THEME_FILTERS}>
          {(filter) => {
            const Icon = FILTER_ICON[filter];
            return (
              <SlidingTabs.Trigger value={filter} class="appearance-segment">
                <Icon aria-hidden="true" />
                <span>{t(FILTER_LABEL[filter])}</span>
              </SlidingTabs.Trigger>
            );
          }}
        </For>
      </SlidingTabs.List>
    </SlidingTabs.Root>
  );
}

/**
 * A small drawing of the app: a sidebar, a message and a message box. A palette gives its colors; the
 * Dark and Light cards use the fixed card tokens, so each shows its own theme in either theme.
 */
function ThemeMini(props: { palette?: ThemeCardPalette; scheme?: "dark" | "light" }): JSX.Element {
  const colors = () => props.palette?.colors;
  return (
    <span
      class={["theme-card-mini", props.scheme ? `theme-card-mini-${props.scheme}` : undefined]}
      style={
        colors()
          ? {
              "--theme-card-frame": colors()?.frame,
              "--theme-card-canvas": colors()?.canvas,
              "--theme-card-surface": colors()?.surface,
              "--theme-card-border": colors()?.border,
              "--theme-card-accent": colors()?.accent,
            }
          : undefined
      }
      aria-hidden="true"
    >
      <span class="theme-card-sidebar">
        <i />
        <i />
        <i />
      </span>
      <span class="theme-card-content">
        <span class="theme-card-bubble" />
        <span class="theme-card-composer" />
      </span>
    </span>
  );
}

function ThemeCard(props: {
  selected: boolean;
  name: string;
  onSelect: () => void;
  children: JSX.Element;
  icon: JSX.Element;
}) {
  return (
    <Button
      variant="ghost"
      type="button"
      class={["theme-card", { "theme-card-selected": props.selected }]}
      aria-pressed={props.selected ? "true" : "false"}
      aria-label={props.name}
      data-cuelume-tap="select"
      onClick={props.onSelect}
    >
      <span class="theme-card-preview">{props.children}</span>
      <span class="theme-card-name">
        {props.icon}
        <span class="ui-text-truncate">{props.name}</span>
      </span>
    </Button>
  );
}

export interface ThemeCardGridProps {
  value: AppearanceSelectValue;
  onChange: (value: AppearanceSelectValue) => void;
  /** Theme palettes: the ones that ship with the app and the palette files. */
  palettes: readonly ThemeCardPalette[];
  filter: ThemeFilter;
}

/** The theme cards of Settings › Appearance: System, Dark, Light, then each palette (AC-001, AC-002). */
export function ThemeCardGrid(props: ThemeCardGridProps): JSX.Element {
  const { t } = useText();
  const shown = (scheme: "dark" | "light") => props.filter === "all" || props.filter === scheme;
  return (
    <fieldset class="theme-card-grid" aria-label={t("settings.appearance.theme.title")}>
      <For
        each={BASE_THEMES.filter((appearance) =>
          appearance === "system" ? props.filter === "all" : shown(appearance),
        )}
      >
        {(appearance) => {
          const Icon = APPEARANCE_ICON[appearance];
          return (
            <ThemeCard
              selected={props.value === appearance}
              name={t(APPEARANCE_LABEL[appearance])}
              onSelect={() => props.onChange(appearance)}
              icon={<Icon class="theme-card-icon" aria-hidden="true" />}
            >
              <Show
                when={appearance === "system"}
                fallback={<ThemeMini scheme={appearance === "light" ? "light" : "dark"} />}
              >
                <span class="theme-card-split">
                  <ThemeMini scheme="dark" />
                  <span class="theme-card-split-light">
                    <ThemeMini scheme="light" />
                  </span>
                </span>
              </Show>
            </ThemeCard>
          );
        }}
      </For>
      <For each={props.palettes.filter((palette) => shown(palette.scheme))}>
        {(palette) => (
          <ThemeCard
            selected={props.value === paletteSelectValue(palette.id)}
            name={palette.name}
            onSelect={() => props.onChange(paletteSelectValue(palette.id))}
            icon={
              <span
                class="theme-card-dot"
                style={{ "--theme-card-accent": palette.colors.accent }}
                aria-hidden="true"
              />
            }
          >
            <ThemeMini palette={palette} />
          </ThemeCard>
        )}
      </For>
    </fieldset>
  );
}
