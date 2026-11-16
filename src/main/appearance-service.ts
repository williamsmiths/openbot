import {
  type AppAppearancePreference,
  type AppThemePalette,
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
  isAppThemePaletteId,
  isChatBackgroundColor,
  isChatWallpaper,
  isComposerGlow,
  isComposerGlowGradient,
  type SetAppAppearancePreferenceInput,
  sameThemePalettes,
} from "@openbot/contracts/ipc";
import { isDynamicRecord } from "@openbot/contracts/runtime-values";
import { Effect, Exit, Result, Scope, Semaphore } from "effect";
import { isMissingFileError } from "../backend/file-errors";
import { withBuiltInThemePalettes } from "./built-in-theme-palettes";
import { readChatWallpaperPhoto, saveChatWallpaperPhoto } from "./chat-wallpaper-photo";
import { type PreferenceFileFailure, readPreferenceFile, writePreferenceFile } from "./preference-file";
import { readThemePalettes, watchThemePalettes } from "./theme-palette-files";

/** What the file holds. The palettes are not saved: they are read from their own files. */
type StoredAppearancePreference = Pick<
  AppAppearancePreference,
  | "appearance"
  | "transparentWindow"
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
  | "chatWallpaperPhotoVersion"
  | "transparentWindowLevel"
  | "composerGlowGradient"
> & {
  /**
   * False until the user picks a theme in Settings: a light, dark or system choice, or a palette.
   * While it is false, `palette` is the palette that shows: the first one, also one that appears after
   * the start, as the Omarchy installer can write its palette while OpenBot runs. It stays until its
   * file goes, so a new file does not replace it. A change to another field keeps it false.
   */
  themeChosen: boolean;
};

/** Nothing saved: no theme chosen yet. */
const DEFAULT_PREFERENCE: StoredAppearancePreference = {
  appearance: DEFAULT_APP_APPEARANCE,
  transparentWindow: DEFAULT_TRANSPARENT_WINDOW,
  palette: null,
  chatBackgroundLight: null,
  chatBackgroundDark: null,
  interfaceFont: null,
  codeFont: null,
  accentColor: null,
  chatWallpaper: DEFAULT_CHAT_WALLPAPER,
  chatWallpaperStrength: DEFAULT_CHAT_WALLPAPER_STRENGTH,
  chatWallpaperBlur: DEFAULT_CHAT_WALLPAPER_BLUR,
  chatGlass: DEFAULT_CHAT_GLASS,
  composerGlow: DEFAULT_COMPOSER_GLOW,
  chatWallpaperPhotoVersion: null,
  transparentWindowLevel: DEFAULT_TRANSPARENT_WINDOW_LEVEL,
  composerGlowGradient: null,
  themeChosen: false,
};

/**
 * The saved appearance, or the default when nothing was saved. A file that is unreadable or names an
 * appearance this build does not offer reads as a chosen Dark: a lost choice must not stop the app
 * from starting, and must not let a palette replace it. A file with no `transparentWindow` reads as
 * an opaque window. A file with no `palette`, which every file before palettes is, reads as no
 * palette, and one with no `themeChosen` as a chosen theme: the user saved it. A file with no chat
 * background, or with a value that is not a color, reads as the color of the theme. A file with no
 * font, which every file before the font choice is, or with a name that cannot go into a CSS font
 * list, reads as the default font. A file with none of the main color, wallpaper, glass and glow
 * fields, which every file before the Appearance page is, or with a value out of range, reads as the
 * default of each (AC-007). So does a file with no transparency level or glow gradient (AC-013).
 */
const readAppearancePreference = Effect.fn("AppearancePreference.read")(function* (path: string) {
  const read = yield* Effect.result(
    readPreferenceFile(path, (parsed): StoredAppearancePreference => {
      if (!isDynamicRecord(parsed) || parsed.version !== 1 || !isAppAppearance(parsed.appearance))
        return { ...DEFAULT_PREFERENCE, themeChosen: true };
      return {
        appearance: parsed.appearance,
        transparentWindow: parsed.transparentWindow === true,
        palette: isAppThemePaletteId(parsed.palette) ? parsed.palette : null,
        chatBackgroundLight: isChatBackgroundColor(parsed.chatBackgroundLight) ? parsed.chatBackgroundLight : null,
        chatBackgroundDark: isChatBackgroundColor(parsed.chatBackgroundDark) ? parsed.chatBackgroundDark : null,
        interfaceFont: isAppFontFamily(parsed.interfaceFont) ? parsed.interfaceFont : null,
        codeFont: isAppFontFamily(parsed.codeFont) ? parsed.codeFont : null,
        accentColor: isChatBackgroundColor(parsed.accentColor) ? parsed.accentColor : null,
        chatWallpaper: isChatWallpaper(parsed.chatWallpaper) ? parsed.chatWallpaper : DEFAULT_CHAT_WALLPAPER,
        chatWallpaperStrength:
          clampChatWallpaperStrength(parsed.chatWallpaperStrength) ?? DEFAULT_CHAT_WALLPAPER_STRENGTH,
        chatWallpaperBlur: clampChatWallpaperBlur(parsed.chatWallpaperBlur) ?? DEFAULT_CHAT_WALLPAPER_BLUR,
        chatGlass: parsed.chatGlass === true,
        composerGlow: isComposerGlow(parsed.composerGlow) ? parsed.composerGlow : DEFAULT_COMPOSER_GLOW,
        chatWallpaperPhotoVersion: wholeVersion(parsed.chatWallpaperPhotoVersion),
        transparentWindowLevel:
          clampTransparentWindowLevel(parsed.transparentWindowLevel) ?? DEFAULT_TRANSPARENT_WINDOW_LEVEL,
        composerGlowGradient: isComposerGlowGradient(parsed.composerGlowGradient) ? parsed.composerGlowGradient : null,
        themeChosen: parsed.themeChosen !== false,
      };
    }),
  );
  if (Result.isSuccess(read)) return read.success;
  return isMissingFileError(read.failure.cause)
    ? { ...DEFAULT_PREFERENCE }
    : { ...DEFAULT_PREFERENCE, themeChosen: true };
});

function wholeVersion(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** The saved transparent window choice, read before the service exists, so the first window is built with it. */
export const readSavedTransparentWindow = Effect.fn("AppearancePreference.readTransparentWindow")(function* (
  path: string,
) {
  return (yield* readAppearancePreference(path)).transparentWindow;
});

const writeAppearancePreference = Effect.fn("AppearancePreference.write")(function* (
  path: string,
  preference: StoredAppearancePreference,
) {
  yield* writePreferenceFile(path, { version: 1, ...preference });
  return { ...preference };
});

/**
 * The light, dark or system appearance of OpenBot's own windows, or a theme palette that another
 * program gives. Main holds it so every window reads one choice, and it tells each window about a
 * change through `subscribe`, a change to a palette file included.
 */
export class AppearanceService {
  readonly #path: string;
  readonly #paletteDirectory: string;
  readonly #supportsTransparentWindow: boolean;
  readonly #photoPath: string;
  readonly #listeners = new Set<(preference: AppAppearancePreference) => void>();
  #preference: StoredAppearancePreference = { ...DEFAULT_PREFERENCE };
  /** The palette files. The palettes that ship with the app are added in `preference`. */
  #palettes: AppThemePalette[] = [];
  #writes = Semaphore.makeUnsafe(1);
  #paletteReads = Semaphore.makeUnsafe(1);
  /** A read is waiting for its turn. It sees each change made before it starts, so one is enough. */
  #paletteReadQueued = false;

  /**
   * `supportsTransparentWindow` is false where the window cannot blur the desktop: there it reads as
   * off. `paletteDirectory` is the folder of palette files. `photoPath` is the file of the wallpaper
   * photo.
   */
  constructor(input: {
    path: string;
    paletteDirectory: string;
    photoPath: string;
    supportsTransparentWindow: boolean;
  }) {
    this.#path = input.path;
    this.#photoPath = input.photoPath;
    this.#paletteDirectory = input.paletteDirectory;
    this.#supportsTransparentWindow = input.supportsTransparentWindow;
  }

  get preference(): AppAppearancePreference {
    const wanted = this.#preference.palette;
    // The files and the palettes that ship with the app. `#palettes` holds the files only.
    const palettes = withBuiltInThemePalettes(this.#palettes);
    const palette = palettes.some((item) => item.id === wanted) ? wanted : null;
    return {
      appearance: this.#preference.appearance,
      transparentWindow: this.#supportsTransparentWindow && this.#preference.transparentWindow,
      palette,
      palettes: palettes.map((item) => ({ ...item, colors: { ...item.colors } })),
      chatBackgroundLight: this.#preference.chatBackgroundLight,
      chatBackgroundDark: this.#preference.chatBackgroundDark,
      interfaceFont: this.#preference.interfaceFont,
      codeFont: this.#preference.codeFont,
      accentColor: this.#preference.accentColor,
      chatWallpaper: this.#preference.chatWallpaper,
      chatWallpaperStrength: this.#preference.chatWallpaperStrength,
      chatWallpaperBlur: this.#preference.chatWallpaperBlur,
      chatGlass: this.#preference.chatGlass,
      composerGlow: this.#preference.composerGlow,
      chatWallpaperPhotoVersion: this.#preference.chatWallpaperPhotoVersion,
      transparentWindowLevel: this.#preference.transparentWindowLevel,
      composerGlowGradient: this.#preference.composerGlowGradient,
    };
  }

  /**
   * Read the saved preference and the palette files. Called once at startup, before the first
   * window loads.
   *
   * Until the user picks a theme, the first palette shows: the Omarchy installer writes its palette
   * before the first start, so a new install matches the desktop. A saved choice, Dark included,
   * stays as it is.
   */
  load(): Effect.Effect<AppAppearancePreference, PreferenceFileFailure> {
    return Effect.gen({ self: this }, function* () {
      this.#preference = yield* readAppearancePreference(this.#path);
      this.#palettes = yield* readThemePalettes(this.#paletteDirectory);
      this.#showFirstPalette();
      return this.preference;
    });
  }

  /**
   * Follows the palette folder until the returned function is called. A change to a palette file,
   * such as an Omarchy theme switch, reaches every window without a restart. The returned function
   * stops the watch and waits for a read that already started, so no window hears of a change after
   * it.
   */
  followPalettes(): Effect.Effect<() => Promise<void>> {
    return Effect.gen({ self: this }, function* () {
      const reads = Scope.makeUnsafe();
      const stopWatch = yield* watchThemePalettes(this.#paletteDirectory, () => {
        // One write is several events (the temporary file and the rename). A read that waits for
        // its turn sees all of them.
        if (this.#paletteReadQueued) return;
        this.#paletteReadQueued = true;
        Effect.runFork(this.refreshPalettes().pipe(Effect.forkIn(reads, { startImmediately: true })));
      }).pipe(Effect.orElseSucceed(() => () => undefined));
      // A file written between `load` and the start of the watch has no event of its own.
      yield* this.refreshPalettes();
      return () => {
        stopWatch();
        return Effect.runPromise(Scope.close(reads, Exit.void));
      };
    });
  }

  /** Reads the palette files again, one read at a time, and tells the windows when they changed. */
  refreshPalettes(): Effect.Effect<void> {
    return this.#paletteReads.withPermit(
      Effect.gen({ self: this }, function* () {
        this.#paletteReadQueued = false;
        const palettes = yield* readThemePalettes(this.#paletteDirectory);
        if (sameThemePalettes(palettes, this.#palettes)) return;
        this.#palettes = palettes;
        this.#showFirstPalette();
        this.#notify();
      }),
    );
  }

  /**
   * Serialized, as `LogoColorService.set` is, so two quick choices save the newer one. A field the
   * input leaves out keeps its saved value. An appearance or a palette is a theme choice.
   */
  set(change: SetAppAppearancePreferenceInput): Effect.Effect<AppAppearancePreference, PreferenceFileFailure> {
    return this.#writes.withPermit(this.#write(change));
  }

  /** The saved wallpaper photo as a data URL, or null when none is saved (AC-008). */
  readPhoto() {
    return readChatWallpaperPhoto(this.#photoPath);
  }

  /**
   * Saves the picture at `sourcePath` as the wallpaper photo, shows it, and bumps the version so each
   * window reads it again. Serialized with the other writes. A picture that cannot be read changes
   * nothing (AC-008).
   */
  setPhoto(sourcePath: string): Effect.Effect<AppAppearancePreference, PreferenceFileFailure> {
    return this.#writes.withPermit(
      Effect.gen({ self: this }, function* () {
        const version = Date.now();
        yield* saveChatWallpaperPhoto(this.#photoPath, sourcePath);
        return yield* this.#write({ chatWallpaper: "photo" }, { chatWallpaperPhotoVersion: version }).pipe(
          // The file is new already. If the preference file cannot be written, the windows still
          // show the new photo, and the next write saves the choice.
          Effect.tapError(() =>
            Effect.sync(() => {
              this.#preference = { ...this.#preference, chatWallpaper: "photo", chatWallpaperPhotoVersion: version };
              this.#notify();
            }),
          ),
        );
      }),
    );
  }

  #write(
    change: SetAppAppearancePreferenceInput,
    extra: Partial<Pick<StoredAppearancePreference, "chatWallpaperPhotoVersion">> = {},
  ): Effect.Effect<AppAppearancePreference, PreferenceFileFailure> {
    return Effect.gen({ self: this }, function* () {
      const themeChosen =
        this.#preference.themeChosen || change.appearance !== undefined || change.palette !== undefined;
      this.#preference = yield* writeAppearancePreference(this.#path, {
        ...this.#preference,
        ...change,
        ...extra,
        themeChosen,
      });
      this.#notify();
      return this.preference;
    }).pipe(Effect.uninterruptible);
  }

  /**
   * While no theme is chosen, the palette that shows stays until its file goes. Then the first palette
   * shows. Settings shows it as selected, so a click on it is no change and cannot fix it.
   */
  #showFirstPalette(): void {
    if (this.#preference.themeChosen) return;
    const shown = this.#preference.palette;
    if (this.#palettes.some((item) => item.id === shown)) return;
    this.#preference = { ...this.#preference, palette: this.#palettes[0]?.id ?? null };
  }

  #notify(): void {
    for (const listener of this.#listeners) listener(this.preference);
  }

  subscribe(listener: (preference: AppAppearancePreference) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }
}
