import { type AvatarColor, isAvatarColor } from "./ipc-agent-identity";
import { isDynamicRecord } from "./runtime-values";

/**
 * The color scheme the user picks for the desktop app: follow the system, or always light or dark.
 * The main process holds it, and each OpenBot window applies it. Visited websites and the native
 * menus follow the computer, as they did before the choice existed, unless the window is transparent.
 *
 * The identifiers cross the IPC boundary and are saved as written. Add one, never rename one: a
 * renamed identifier reads back as the default on the next launch. The order is the Settings order.
 */
export const APP_APPEARANCES = ["system", "light", "dark"] as const;

export type AppAppearance = (typeof APP_APPEARANCES)[number];

/** Dark: OpenBot was dark only before this choice existed, so an update does not change the look. */
export const DEFAULT_APP_APPEARANCE: AppAppearance = "dark";

/** Off: a see-through window is a choice, and only macOS can blur what is behind it. */
export const DEFAULT_TRANSPARENT_WINDOW = false;

/**
 * The colors that a theme palette file gives. Each is a `#rrggbb` or `#rrggbbaa` hex color. The
 * renderer makes the other tokens from them, over the light or dark palette that `scheme` names.
 *
 * The keys are the file format that other programs write, such as the Omarchy theme template. Add a
 * key only as optional, and never rename one: a file that an older template wrote must still read.
 */
export const APP_THEME_PALETTE_COLORS = [
  "canvas",
  "frame",
  "sidebar",
  "surface",
  "text",
  "textMuted",
  "border",
  "accent",
  "accentForeground",
  "success",
  "warning",
  "danger",
] as const;

export type AppThemePaletteColor = (typeof APP_THEME_PALETTE_COLORS)[number];

/**
 * The background color of conversations that the user picks for one scheme, as `#rrggbb` in lowercase,
 * or null for the color of the theme. Light and Dark keep their own color; System shows the one of the
 * scheme that it resolves to, and so does a theme palette.
 */
export type ChatBackgroundColor = AvatarColor;

/** The same rule as an agent color, because the same color picker gives both. */
export const isChatBackgroundColor: (value: unknown) => value is ChatBackgroundColor = isAvatarColor;

/**
 * The family name of a font that is installed on this computer, such as "Noto Sans Arabic". Main
 * lists them, and the renderer puts the chosen one before the default fonts in a CSS font list, in
 * quotes. A name that the computer does not have shows the default fonts. The choice is per computer,
 * because each computer has its own fonts: a joined server does not change it.
 */
export type AppFontFamily = string;

/**
 * 1 to 128 characters, with no control character and nothing that can end the quoted CSS string or
 * the property: no quote, backslash, semicolon, brace or angle bracket. Font names do not use them.
 */
export const APP_FONT_FAMILY_PATTERN = /^[^\p{Cc}"\\;{}<>]{1,128}$/u;

/** A font name that can go into a CSS font list. See `APP_FONT_FAMILY_PATTERN`. */
export function isAppFontFamily(value: unknown): value is AppFontFamily {
  return typeof value === "string" && value.trim() === value && APP_FONT_FAMILY_PATTERN.test(value);
}

/**
 * What the conversations show behind the messages. `photo` is the picture that the user picked: main
 * keeps it as one file, and a preference with no saved photo shows as `none`. AC-005.
 *
 * The identifiers are saved as written. Add one, never rename one: a renamed identifier reads back as
 * the default on the next launch. The order is the Settings order.
 */
export const APP_CHAT_WALLPAPERS = ["none", "glow", "glyphs", "dots", "photo"] as const;

export type AppChatWallpaper = (typeof APP_CHAT_WALLPAPERS)[number];

export const DEFAULT_CHAT_WALLPAPER: AppChatWallpaper = "none";

/**
 * How the glow of the message box moves. `turn` runs the light around the border, `still` keeps it
 * where it is, and `off` has no ring and no halo. AC-006. Add one, never rename one.
 */
export const APP_COMPOSER_GLOWS = ["turn", "still", "off"] as const;

export type AppComposerGlow = (typeof APP_COMPOSER_GLOWS)[number];

export const DEFAULT_COMPOSER_GLOW: AppComposerGlow = "turn";

/**
 * The two colors of the message box glow, when the user picks a gradient instead of the main color
 * (AC-011). The start color is the first light of the ring and the left halo; the end color is the
 * second light and the right halo. The hex values are data; the names are i18n keys. Add one, never
 * rename one: the id is saved.
 */
export const APP_COMPOSER_GLOW_GRADIENTS = ["sunset", "ocean", "aurora", "neon", "fire", "mint"] as const;

export type AppComposerGlowGradient = (typeof APP_COMPOSER_GLOW_GRADIENTS)[number];

export const COMPOSER_GLOW_GRADIENTS: Readonly<Record<AppComposerGlowGradient, { start: string; end: string }>> = {
  sunset: { start: "#ff8a3d", end: "#ff3d8b" },
  ocean: { start: "#2f7cff", end: "#22d3ee" },
  aurora: { start: "#22c55e", end: "#8b5cf6" },
  neon: { start: "#f43f9e", end: "#7c5cff" },
  fire: { start: "#ef4444", end: "#facc15" },
  mint: { start: "#10b981", end: "#7dd3fc" },
};

export function isComposerGlowGradient(value: unknown): value is AppComposerGlowGradient {
  return APP_COMPOSER_GLOW_GRADIENTS.some((gradient) => gradient === value);
}

/**
 * How much of the blurred desktop the transparent window shows, in percent (AC-012). 50 gives the tints
 * the window had before this choice; a higher value shows more of the desktop.
 */
export const TRANSPARENT_WINDOW_LEVEL_RANGE = { min: 10, max: 90 } as const;
export const DEFAULT_TRANSPARENT_WINDOW_LEVEL = 50;

/** Opacity of the wallpaper in percent, and its blur in pixels. Whole numbers inside these bounds. */
export const CHAT_WALLPAPER_STRENGTH_RANGE = { min: 10, max: 100 } as const;
export const CHAT_WALLPAPER_BLUR_RANGE = { min: 0, max: 30 } as const;
export const DEFAULT_CHAT_WALLPAPER_STRENGTH = 80;
export const DEFAULT_CHAT_WALLPAPER_BLUR = 0;
export const DEFAULT_CHAT_GLASS = false;

function clampWhole(value: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

/** A finite number rounded and held inside the range, or null for anything else. */
export function clampChatWallpaperStrength(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? clampWhole(value, CHAT_WALLPAPER_STRENGTH_RANGE) : null;
}

export function clampChatWallpaperBlur(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? clampWhole(value, CHAT_WALLPAPER_BLUR_RANGE) : null;
}

export function clampTransparentWindowLevel(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? clampWhole(value, TRANSPARENT_WINDOW_LEVEL_RANGE) : null;
}

export function isChatWallpaper(value: unknown): value is AppChatWallpaper {
  return APP_CHAT_WALLPAPERS.some((wallpaper) => wallpaper === value);
}

export function isComposerGlow(value: unknown): value is AppComposerGlow {
  return APP_COMPOSER_GLOWS.some((glow) => glow === value);
}

/** The data URL that main gives for the saved wallpaper photo. The preload accepts nothing else. */
export const CHAT_WALLPAPER_PHOTO_URL_PREFIX = "data:image/jpeg;base64,";

/** A JPEG data URL from main, in base64 only, so it can go into a CSS `url("…")` as it is. */
export function isChatWallpaperPhotoUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(CHAT_WALLPAPER_PHOTO_URL_PREFIX) &&
    /^[A-Za-z0-9+/]*={0,2}$/u.test(value.slice(CHAT_WALLPAPER_PHOTO_URL_PREFIX.length))
  );
}

/** The file name stem of a theme palette file, which is also its saved identifier. */
export const APP_THEME_PALETTE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/u;

/** `#rrggbb` or `#rrggbbaa`. Nothing else reaches a CSS property. */
export const APP_THEME_PALETTE_COLOR_PATTERN = /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/u;

/**
 * A palette that another program gives in `<userData>/themes/<id>.json`, such as the Omarchy theme.
 * While it is selected, it replaces the light, dark or system choice, and it follows each change to
 * the file.
 */
export interface AppThemePalette {
  id: string;
  /** The name that the file gives, such as "Omarchy". It is data, as an agent name is. */
  name: string;
  scheme: "light" | "dark";
  colors: Record<AppThemePaletteColor, string>;
}

/** The preference as it is stored and as it crosses IPC. */
export interface AppAppearancePreference {
  appearance: AppAppearance;
  /**
   * The selected theme palette, or null. Main reports an id only while that palette file is
   * present and valid; it keeps the saved id, so the palette comes back when the file does.
   */
  palette: string | null;
  /** Every valid palette file, by id. Empty on most computers. */
  palettes: AppThemePalette[];
  /**
   * The main window shows the blurred desktop behind it (macOS vibrancy). Main reports `false` on
   * other platforms. While it is on, main sets `nativeTheme.themeSource` to the appearance, because the
   * blur takes its light or dark shade from it: then visited websites and native menus follow the
   * appearance too.
   */
  transparentWindow: boolean;
  /** See `TRANSPARENT_WINDOW_LEVEL_RANGE`. Kept while the transparent window is off. */
  transparentWindowLevel: number;
  /** See `ChatBackgroundColor`. Each scheme has its own field, so a change to one keeps the other. */
  chatBackgroundLight: ChatBackgroundColor | null;
  chatBackgroundDark: ChatBackgroundColor | null;
  /** See `AppFontFamily`. The font of menus, chats and settings, or null for the default (Inter). */
  interfaceFont: AppFontFamily | null;
  /** See `AppFontFamily`. The font of code, terminals and file paths, or null for the default. */
  codeFont: AppFontFamily | null;
  /**
   * The main color: it replaces the accent of the theme, the palette and the light or dark base, as
   * `#rrggbb`. Null keeps the accent of the theme. AC-004.
   */
  accentColor: ChatBackgroundColor | null;
  /** See `AppChatWallpaper`. */
  chatWallpaper: AppChatWallpaper;
  /** Opacity of the wallpaper in percent, 10 to 100. */
  chatWallpaperStrength: number;
  /** Blur of the wallpaper in pixels, 0 to 30. */
  chatWallpaperBlur: number;
  /** Bubbles and the message box are translucent with a backdrop blur, while a wallpaper shows. */
  chatGlass: boolean;
  /** See `AppComposerGlow`. */
  composerGlow: AppComposerGlow;
  /** See `COMPOSER_GLOW_GRADIENTS`. Null: the glow takes the main color. */
  composerGlowGradient: AppComposerGlowGradient | null;
  /**
   * Changes each time main saves a new wallpaper photo, so a window knows to read it again. Null: no
   * photo is saved. Main sets it; `setAppAppearancePreference` cannot.
   */
  chatWallpaperPhotoVersion: number | null;
}

/**
 * One field or more. Each Settings control sends only its own, so two quick changes do not undo each
 * other. The theme control sends `palette: null` with a light, dark or system choice.
 */
export type SetAppAppearancePreferenceInput = Partial<
  Pick<
    AppAppearancePreference,
    | "appearance"
    | "transparentWindow"
    | "transparentWindowLevel"
    | "palette"
    | "chatBackgroundLight"
    | "chatBackgroundDark"
    | "interfaceFont"
    | "codeFont"
    | "accentColor"
    | "chatWallpaper"
    | "chatWallpaperStrength"
    | "chatWallpaperBlur"
    | "chatGlass"
    | "composerGlow"
    | "composerGlowGradient"
  >
>;

export function isAppAppearance(value: unknown): value is AppAppearance {
  return APP_APPEARANCES.some((appearance) => appearance === value);
}

export function isAppThemePaletteId(value: unknown): value is string {
  return typeof value === "string" && APP_THEME_PALETTE_ID_PATTERN.test(value);
}

/** A palette with a valid id, a light or dark scheme, a name, and a hex value for every color. */
export function isAppThemePalette(value: unknown): value is AppThemePalette {
  if (!isDynamicRecord(value)) return false;
  const { id, name, scheme, colors } = value;
  if (!isAppThemePaletteId(id) || typeof name !== "string" || (scheme !== "light" && scheme !== "dark")) return false;
  if (!isDynamicRecord(colors)) return false;
  return APP_THEME_PALETTE_COLORS.every((key) => {
    const color = colors[key];
    return typeof color === "string" && APP_THEME_PALETTE_COLOR_PATTERN.test(color);
  });
}

/** Two palette lists with the same palettes, colors and order. */
export function sameThemePalettes(left: readonly AppThemePalette[], right: readonly AppThemePalette[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** The palette that the windows show, or null for the light, dark or system choice. */
export function selectedThemePalette(preference: AppAppearancePreference): AppThemePalette | null {
  if (preference.palette === null) return null;
  return preference.palettes.find((palette) => palette.id === preference.palette) ?? null;
}
