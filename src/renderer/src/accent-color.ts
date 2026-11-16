import type { ChatBackgroundColor } from "@openbot/contracts/app-appearance";

/** Linear light of one sRGB channel, 0 to 255. */
function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/**
 * White or near-black text for a button of this color, whichever reads better: black text is the
 * better choice above a relative luminance of about 0.18.
 */
export function textOnAccent(color: ChatBackgroundColor): "#101010" | "#ffffff" {
  const [red, green, blue] = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  const luminance = 0.2126 * linear(red ?? 0) + 0.7152 * linear(green ?? 0) + 0.0722 * linear(blue ?? 0);
  return luminance > 0.18 ? "#101010" : "#ffffff";
}

function clear(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

/**
 * The accent tokens of a main color (AC-004). The hover and the text step are mixed toward the text
 * color of the theme, so they get lighter in Dark and darker in Light, as the palette tokens do.
 * `applyThemePalette` sets them after the palette tokens, so the main color wins over a palette and
 * over the base theme. The preload let only `#rrggbb` through, so each value is a color.
 */
export function accentTokens(color: ChatBackgroundColor): Record<string, string> {
  return {
    "--openbot-accent": color,
    "--openbot-accent-hover": `color-mix(in srgb, ${color}, var(--openbot-text-primary) 15%)`,
    "--openbot-accent-text": `color-mix(in srgb, ${color}, var(--openbot-text-primary) 30%)`,
    "--openbot-accent-soft": clear(color, 16),
    "--openbot-accent-strong": clear(color, 34),
    "--openbot-text-on-accent": textOnAccent(color),
  };
}
