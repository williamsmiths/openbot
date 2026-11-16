import {
  type AppAppearancePreference,
  type AppChatWallpaper,
  type AppComposerGlow,
  type AppComposerGlowGradient,
  type AppFontFamily,
  type AppThemePalette,
  type ChatBackgroundColor,
  clampChatWallpaperBlur,
  clampChatWallpaperStrength,
  clampTransparentWindowLevel,
  DEFAULT_APP_APPEARANCE,
  DEFAULT_CHAT_GLASS,
  DEFAULT_CHAT_WALLPAPER,
  DEFAULT_CHAT_WALLPAPER_BLUR,
  DEFAULT_CHAT_WALLPAPER_STRENGTH,
  DEFAULT_COMPOSER_GLOW,
  DEFAULT_TRANSPARENT_WINDOW,
  DEFAULT_TRANSPARENT_WINDOW_LEVEL,
  isAppAppearance,
  isAppFontFamily,
  isAppThemePalette,
  isChatBackgroundColor,
  isChatWallpaper,
  isComposerGlow,
  isComposerGlowGradient,
  sameThemePalettes,
  selectedThemePalette,
} from "@openbot/contracts/app-appearance";
import {
  type AppearanceSelectValue,
  appearanceChangeOfSelectValue,
  appearanceSelectValue,
} from "@openbot/ui/features/settings/AppearanceSelect";
import { createSignal, onSettled } from "solid-js";
import { applyAppFonts } from "./app-fonts";
import { appPort } from "./app-port";
import { applyChatBackground } from "./chat-background";
import { applyChatWallpaper } from "./chat-wallpaper";
import { syncColorScheme } from "./color-scheme";
import { applyThemePalette } from "./theme-palette";
import { sweepTheme } from "./theme-sweep";

/** One Settings control's value. Set optimistically, and reverted if main refuses the write. */
function optimisticChoice<T extends string | number | boolean | null>(initial: T, save: (next: T) => Promise<T>) {
  const [value, setValue] = createSignal<T>(() => initial);
  let confirmed = initial;
  let latestRequest = 0;
  let pending = 0;

  /** A saved value from main. A choice that is still in flight is newer, so it stays on screen. */
  function confirm(next: T): void {
    confirmed = next;
    if (pending === 0) setValue(() => next);
  }

  function change(next: T): void {
    const request = ++latestRequest;
    pending += 1;
    setValue(() => next);
    void save(next)
      .then((saved) => {
        confirmed = saved;
        if (request === latestRequest) setValue(() => saved);
      })
      .catch(() => {
        if (request === latestRequest) setValue(() => confirmed);
      })
      .finally(() => {
        pending -= 1;
      });
  }

  return { value, confirm, change };
}

function saveTheme(next: AppearanceSelectValue): Promise<AppearanceSelectValue> {
  return appPort().setAppAppearancePreference(appearanceChangeOfSelectValue(next)).then(appearanceSelectValue);
}

/** The Settings control state of the theme, the transparent window, the chat background and the fonts. */
export function useAppearanceChoice() {
  const theme = optimisticChoice<AppearanceSelectValue>(DEFAULT_APP_APPEARANCE, saveTheme);
  // Each event from main carries a new array. Kobalte rebuilds its list when the options change, and
  // then reports the selected value again, so an equal list must keep the same array.
  const [palettes, setPalettes] = createSignal<AppThemePalette[]>([], { equals: sameThemePalettes });
  const transparentWindow = optimisticChoice<boolean>(DEFAULT_TRANSPARENT_WINDOW, (next) =>
    appPort()
      .setAppAppearancePreference({ transparentWindow: next })
      .then((preference) => preference.transparentWindow),
  );
  const chatBackgroundLight = optimisticChoice<ChatBackgroundColor | null>(null, (next) =>
    appPort()
      .setAppAppearancePreference({ chatBackgroundLight: next })
      .then((preference) => preference.chatBackgroundLight),
  );
  const chatBackgroundDark = optimisticChoice<ChatBackgroundColor | null>(null, (next) =>
    appPort()
      .setAppAppearancePreference({ chatBackgroundDark: next })
      .then((preference) => preference.chatBackgroundDark),
  );
  const interfaceFont = optimisticChoice<AppFontFamily | null>(null, (next) =>
    appPort()
      .setAppAppearancePreference({ interfaceFont: next })
      .then((preference) => preference.interfaceFont),
  );
  const codeFont = optimisticChoice<AppFontFamily | null>(null, (next) =>
    appPort()
      .setAppAppearancePreference({ codeFont: next })
      .then((preference) => preference.codeFont),
  );
  const accentColor = optimisticChoice<ChatBackgroundColor | null>(null, (next) =>
    appPort()
      .setAppAppearancePreference({ accentColor: next })
      .then((preference) => preference.accentColor),
  );
  const chatWallpaper = optimisticChoice<AppChatWallpaper>(DEFAULT_CHAT_WALLPAPER, (next) =>
    appPort()
      .setAppAppearancePreference({ chatWallpaper: next })
      .then((preference) => preference.chatWallpaper),
  );
  const chatWallpaperStrength = optimisticChoice<number>(DEFAULT_CHAT_WALLPAPER_STRENGTH, (next) =>
    appPort()
      .setAppAppearancePreference({ chatWallpaperStrength: next })
      .then((preference) => preference.chatWallpaperStrength),
  );
  const chatWallpaperBlur = optimisticChoice<number>(DEFAULT_CHAT_WALLPAPER_BLUR, (next) =>
    appPort()
      .setAppAppearancePreference({ chatWallpaperBlur: next })
      .then((preference) => preference.chatWallpaperBlur),
  );
  const chatGlass = optimisticChoice<boolean>(DEFAULT_CHAT_GLASS, (next) =>
    appPort()
      .setAppAppearancePreference({ chatGlass: next })
      .then((preference) => preference.chatGlass),
  );
  const composerGlow = optimisticChoice<AppComposerGlow>(DEFAULT_COMPOSER_GLOW, (next) =>
    appPort()
      .setAppAppearancePreference({ composerGlow: next })
      .then((preference) => preference.composerGlow),
  );
  const composerGlowGradient = optimisticChoice<AppComposerGlowGradient | null>(null, (next) =>
    appPort()
      .setAppAppearancePreference({ composerGlowGradient: next })
      .then((preference) => preference.composerGlowGradient),
  );
  const transparentWindowLevel = optimisticChoice<number>(DEFAULT_TRANSPARENT_WINDOW_LEVEL, (next) =>
    appPort()
      .setAppAppearancePreference({ transparentWindowLevel: next })
      .then((preference) => preference.transparentWindowLevel),
  );
  const [hasPhoto, setHasPhoto] = createSignal(false);
  const confirm = (preference: AppAppearancePreference) => {
    setPalettes(() => preference.palettes);
    accentColor.confirm(preference.accentColor);
    chatWallpaper.confirm(preference.chatWallpaper);
    chatWallpaperStrength.confirm(preference.chatWallpaperStrength);
    chatWallpaperBlur.confirm(preference.chatWallpaperBlur);
    chatGlass.confirm(preference.chatGlass);
    composerGlow.confirm(preference.composerGlow);
    composerGlowGradient.confirm(preference.composerGlowGradient);
    transparentWindowLevel.confirm(preference.transparentWindowLevel);
    setHasPhoto(preference.chatWallpaperPhotoVersion !== null);
    theme.confirm(appearanceSelectValue(preference));
    transparentWindow.confirm(preference.transparentWindow);
    chatBackgroundLight.confirm(preference.chatBackgroundLight);
    chatBackgroundDark.confirm(preference.chatBackgroundDark);
    interfaceFont.confirm(preference.interfaceFont);
    codeFont.confirm(preference.codeFont);
  };

  onSettled(() => {
    void appPort()
      .getAppAppearancePreference()
      .then(confirm)
      .catch(() => undefined);
    return appPort().onAppAppearancePreference(confirm);
  });

  return {
    theme: theme.value,
    changeTheme: theme.change,
    palettes,
    transparentWindow: transparentWindow.value,
    changeTransparentWindow: transparentWindow.change,
    chatBackgroundLight: chatBackgroundLight.value,
    changeChatBackgroundLight: chatBackgroundLight.change,
    chatBackgroundDark: chatBackgroundDark.value,
    changeChatBackgroundDark: chatBackgroundDark.change,
    interfaceFont: interfaceFont.value,
    changeInterfaceFont: interfaceFont.change,
    codeFont: codeFont.value,
    changeCodeFont: codeFont.change,
    accentColor: accentColor.value,
    changeAccentColor: accentColor.change,
    chatWallpaper: chatWallpaper.value,
    changeChatWallpaper: chatWallpaper.change,
    chatWallpaperStrength: chatWallpaperStrength.value,
    changeChatWallpaperStrength: chatWallpaperStrength.change,
    chatWallpaperBlur: chatWallpaperBlur.value,
    changeChatWallpaperBlur: chatWallpaperBlur.change,
    chatGlass: chatGlass.value,
    changeChatGlass: chatGlass.change,
    composerGlow: composerGlow.value,
    changeComposerGlow: composerGlow.change,
    composerGlowGradient: composerGlowGradient.value,
    changeComposerGlowGradient: composerGlowGradient.change,
    transparentWindowLevel: transparentWindowLevel.value,
    changeTransparentWindowLevel: transparentWindowLevel.change,
    /** True while main keeps a wallpaper photo. */
    hasPhoto,
    /** Opens the image dialog in main and saves the picture as the wallpaper. Rejects when main cannot use it. */
    async pickPhoto(): Promise<void> {
      confirm(await appPort().pickChatWallpaperPhoto());
    },
  };
}

/** This window's copy of the choice, so the first paint after a launch has the saved colors. */
const CACHED_APPEARANCE_KEY = "openbot.appearance";
const CACHED_TRANSPARENT_WINDOW_KEY = "openbot.transparentWindow";
/** The selected palette whole, so the first paint has its colors before main answers. */
const CACHED_THEME_PALETTE_KEY = "openbot.themePalette";
const CACHED_CHAT_BACKGROUND_LIGHT_KEY = "openbot.chatBackgroundLight";
const CACHED_CHAT_BACKGROUND_DARK_KEY = "openbot.chatBackgroundDark";
const CACHED_INTERFACE_FONT_KEY = "openbot.interfaceFont";
const CACHED_CODE_FONT_KEY = "openbot.codeFont";
const CACHED_ACCENT_COLOR_KEY = "openbot.accentColor";
const CACHED_CHAT_WALLPAPER_KEY = "openbot.chatWallpaper";
const CACHED_CHAT_WALLPAPER_STRENGTH_KEY = "openbot.chatWallpaperStrength";
const CACHED_CHAT_WALLPAPER_BLUR_KEY = "openbot.chatWallpaperBlur";
const CACHED_CHAT_GLASS_KEY = "openbot.chatGlass";
const CACHED_COMPOSER_GLOW_KEY = "openbot.composerGlow";
const CACHED_CHAT_WALLPAPER_PHOTO_VERSION_KEY = "openbot.chatWallpaperPhotoVersion";
const CACHED_COMPOSER_GLOW_GRADIENT_KEY = "openbot.composerGlowGradient";
const CACHED_TRANSPARENT_WINDOW_LEVEL_KEY = "openbot.transparentWindowLevel";

function cachedFont(key: string): AppFontFamily | null {
  const font = window.localStorage.getItem(key);
  return isAppFontFamily(font) ? font : null;
}

function cacheFont(key: string, font: AppFontFamily | null): void {
  if (font === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, font);
}

function cachedChatBackground(key: string): ChatBackgroundColor | null {
  const color = window.localStorage.getItem(key);
  return isChatBackgroundColor(color) ? color : null;
}

function cacheChatBackground(key: string, color: ChatBackgroundColor | null): void {
  if (color === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, color);
}

function cachedPalette(): AppThemePalette | null {
  const text = window.localStorage.getItem(CACHED_THEME_PALETTE_KEY);
  if (text === null) return null;
  try {
    const palette = JSON.parse(text);
    return isAppThemePalette(palette) ? palette : null;
  } catch {
    return null;
  }
}

type Look = Pick<
  AppAppearancePreference,
  | "accentColor"
  | "chatWallpaper"
  | "chatWallpaperStrength"
  | "chatWallpaperBlur"
  | "chatGlass"
  | "composerGlow"
  | "chatWallpaperPhotoVersion"
  | "composerGlowGradient"
  | "transparentWindowLevel"
>;

const DEFAULT_LOOK: Look = {
  accentColor: null,
  chatWallpaper: DEFAULT_CHAT_WALLPAPER,
  chatWallpaperStrength: DEFAULT_CHAT_WALLPAPER_STRENGTH,
  chatWallpaperBlur: DEFAULT_CHAT_WALLPAPER_BLUR,
  chatGlass: DEFAULT_CHAT_GLASS,
  composerGlow: DEFAULT_COMPOSER_GLOW,
  chatWallpaperPhotoVersion: null,
  composerGlowGradient: null,
  transparentWindowLevel: DEFAULT_TRANSPARENT_WINDOW_LEVEL,
};

/** The main color, wallpaper and glow of the cache. A value that is missing or out of range reads as the default. */
function cachedLook(): Look {
  const storage = window.localStorage;
  const accent = storage.getItem(CACHED_ACCENT_COLOR_KEY);
  const wallpaper = storage.getItem(CACHED_CHAT_WALLPAPER_KEY);
  const glow = storage.getItem(CACHED_COMPOSER_GLOW_KEY);
  const gradient = storage.getItem(CACHED_COMPOSER_GLOW_GRADIENT_KEY);
  const version = Number(storage.getItem(CACHED_CHAT_WALLPAPER_PHOTO_VERSION_KEY));
  // `Number(null)` is 0, so a missing key must not reach the clamp.
  const cachedNumber = (key: string) => {
    const text = storage.getItem(key);
    return text === null ? null : Number(text);
  };
  return {
    accentColor: isChatBackgroundColor(accent) ? accent : null,
    chatWallpaper: isChatWallpaper(wallpaper) ? wallpaper : DEFAULT_CHAT_WALLPAPER,
    chatWallpaperStrength:
      clampChatWallpaperStrength(cachedNumber(CACHED_CHAT_WALLPAPER_STRENGTH_KEY)) ?? DEFAULT_CHAT_WALLPAPER_STRENGTH,
    chatWallpaperBlur:
      clampChatWallpaperBlur(cachedNumber(CACHED_CHAT_WALLPAPER_BLUR_KEY)) ?? DEFAULT_CHAT_WALLPAPER_BLUR,
    chatGlass: storage.getItem(CACHED_CHAT_GLASS_KEY) === "true",
    composerGlow: isComposerGlow(glow) ? glow : DEFAULT_COMPOSER_GLOW,
    chatWallpaperPhotoVersion: Number.isSafeInteger(version) && version > 0 ? version : null,
    composerGlowGradient: isComposerGlowGradient(gradient) ? gradient : null,
    transparentWindowLevel:
      clampTransparentWindowLevel(cachedNumber(CACHED_TRANSPARENT_WINDOW_LEVEL_KEY)) ??
      DEFAULT_TRANSPARENT_WINDOW_LEVEL,
  };
}

function cacheLook(look: Look): void {
  const storage = window.localStorage;
  if (look.accentColor === null) storage.removeItem(CACHED_ACCENT_COLOR_KEY);
  else storage.setItem(CACHED_ACCENT_COLOR_KEY, look.accentColor);
  storage.setItem(CACHED_CHAT_WALLPAPER_KEY, look.chatWallpaper);
  storage.setItem(CACHED_CHAT_WALLPAPER_STRENGTH_KEY, String(look.chatWallpaperStrength));
  storage.setItem(CACHED_CHAT_WALLPAPER_BLUR_KEY, String(look.chatWallpaperBlur));
  storage.setItem(CACHED_CHAT_GLASS_KEY, String(look.chatGlass));
  storage.setItem(CACHED_COMPOSER_GLOW_KEY, look.composerGlow);
  if (look.chatWallpaperPhotoVersion === null) storage.removeItem(CACHED_CHAT_WALLPAPER_PHOTO_VERSION_KEY);
  else storage.setItem(CACHED_CHAT_WALLPAPER_PHOTO_VERSION_KEY, String(look.chatWallpaperPhotoVersion));
  if (look.composerGlowGradient === null) storage.removeItem(CACHED_COMPOSER_GLOW_GRADIENT_KEY);
  else storage.setItem(CACHED_COMPOSER_GLOW_GRADIENT_KEY, look.composerGlowGradient);
  storage.setItem(CACHED_TRANSPARENT_WINDOW_LEVEL_KEY, String(look.transparentWindowLevel));
}

/** Reading `window.localStorage` throws when the browser blocks storage, so it is read inside the guard. */
function cachedPreference(): AppAppearancePreference {
  try {
    const appearance = window.localStorage.getItem(CACHED_APPEARANCE_KEY);
    const palette = cachedPalette();
    return {
      appearance: isAppAppearance(appearance) ? appearance : DEFAULT_APP_APPEARANCE,
      transparentWindow: window.localStorage.getItem(CACHED_TRANSPARENT_WINDOW_KEY) === "true",
      palette: palette === null ? null : palette.id,
      palettes: palette === null ? [] : [palette],
      chatBackgroundLight: cachedChatBackground(CACHED_CHAT_BACKGROUND_LIGHT_KEY),
      chatBackgroundDark: cachedChatBackground(CACHED_CHAT_BACKGROUND_DARK_KEY),
      interfaceFont: cachedFont(CACHED_INTERFACE_FONT_KEY),
      codeFont: cachedFont(CACHED_CODE_FONT_KEY),
      ...cachedLook(),
    };
  } catch {
    return {
      appearance: DEFAULT_APP_APPEARANCE,
      transparentWindow: DEFAULT_TRANSPARENT_WINDOW,
      palette: null,
      palettes: [],
      chatBackgroundLight: null,
      chatBackgroundDark: null,
      interfaceFont: null,
      codeFont: null,
      ...DEFAULT_LOOK,
    };
  }
}

function cachePreference(preference: AppAppearancePreference): void {
  try {
    window.localStorage.setItem(CACHED_APPEARANCE_KEY, preference.appearance);
    window.localStorage.setItem(CACHED_TRANSPARENT_WINDOW_KEY, String(preference.transparentWindow));
    const palette = selectedThemePalette(preference);
    if (palette === null) window.localStorage.removeItem(CACHED_THEME_PALETTE_KEY);
    else window.localStorage.setItem(CACHED_THEME_PALETTE_KEY, JSON.stringify(palette));
    cacheChatBackground(CACHED_CHAT_BACKGROUND_LIGHT_KEY, preference.chatBackgroundLight);
    cacheChatBackground(CACHED_CHAT_BACKGROUND_DARK_KEY, preference.chatBackgroundDark);
    cacheFont(CACHED_INTERFACE_FONT_KEY, preference.interfaceFont);
    cacheFont(CACHED_CODE_FONT_KEY, preference.codeFont);
    cacheLook(preference);
  } catch {
    // Main's value still applies; only the next first paint can show the default.
  }
}

/**
 * Keeps a desktop window on the appearance that main keeps. The copy in browser storage gives the
 * first paint; main's value then replaces it. The Dynamic Island does not call this: it stays dark.
 * A selected theme palette gives the light or dark base, and its colors go over that base. The main
 * color goes over the palette. The chat background of each scheme and the wallpaper go over both, in
 * conversations only. The chosen fonts go before the
 * default fonts.
 *
 * Only the main window passes `windowGlass`: main gives the macOS blur to that window alone, so in
 * another window a transparent page would show the desktop with no blur.
 *
 * A helper window, such as the agent dock or the browser dock, passes `sweep: false` and changes the
 * theme at once: a wash across its transparent window does not align with the main window.
 */
export function syncAppearance(options: { windowGlass?: boolean; sweep?: boolean } = {}): void {
  let preference = cachedPreference();
  const scheme = syncColorScheme(() => selectedThemePalette(preference)?.scheme ?? preference.appearance);
  applyThemePalette(selectedThemePalette(preference), preference.accentColor);
  applyChatBackground(preference);
  applyChatWallpaper(preference);
  applyAppFonts(preference);
  const showGlass = () => {
    if (!options.windowGlass) return;
    const root = document.documentElement;
    root.toggleAttribute("data-openbot-window-glass", preference.transparentWindow);
    // `window-glass.css` scales each tint by this: 1 at the default level, less for a clearer window.
    root.style.setProperty("--openbot-window-glass-tint", String(windowGlassTint(preference.transparentWindowLevel)));
  };
  showGlass();
  const apply = (next: AppAppearancePreference) => {
    preference = next;
    cachePreference(next);
    scheme.refresh();
    applyThemePalette(selectedThemePalette(next), next.accentColor);
    applyChatBackground(next);
    applyChatWallpaper(next);
    applyAppFonts(next);
    showGlass();
  };
  // A sweep applies its value later, so each change compares with the last value from main, and a
  // sweep applies the newest value: a fast second change cannot be replaced by an older one.
  let latest = preference;
  void appPort()
    .getAppAppearancePreference()
    .then((next) => {
      latest = next;
      apply(next);
    })
    .catch(() => undefined);
  // Main sends each saved change. A change that the window shows moves in behind a band; the first
  // value above replaces the cached copy at once, as it is not a choice the user made now.
  appPort().onAppAppearancePreference((next) => {
    const before = latest;
    latest = next;
    if (options.sweep === false || visibleLook(next) === visibleLook(before)) apply(next);
    else sweepTheme(() => apply(latest));
  });
}

/** The tint scale of a transparency level: 1 at 50 %, 1.8 at 10 % and 0.2 at 90 % (AC-012). */
export function windowGlassTint(level: number): number {
  return (100 - level) / 50;
}

/** What the window shows of a preference: the palette, or the light or dark scheme. */
function visibleLook(preference: AppAppearancePreference): string {
  const palette = selectedThemePalette(preference);
  if (palette !== null) return `palette:${palette.id}`;
  if (preference.appearance !== "system") return preference.appearance;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
