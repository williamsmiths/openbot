import {
  type AppAppearancePreference,
  type AppChatWallpaper,
  type AppComposerGlow,
  type AppComposerGlowGradient,
  COMPOSER_GLOW_GRADIENTS,
  isChatWallpaperPhotoUrl,
} from "@openbot/contracts/app-appearance";
import { createSignal } from "solid-js";
import { appPort } from "./app-port";

type WallpaperPreference = Pick<
  AppAppearancePreference,
  | "chatWallpaper"
  | "chatWallpaperStrength"
  | "chatWallpaperBlur"
  | "chatGlass"
  | "chatWallpaperPhotoVersion"
  | "composerGlow"
  | "composerGlowGradient"
>;

/** The wallpaper that shows: `photo` with no saved photo shows as none (AC-005). */
export function shownWallpaper(preference: WallpaperPreference): AppChatWallpaper {
  return preference.chatWallpaper === "photo" && preference.chatWallpaperPhotoVersion === null
    ? "none"
    : preference.chatWallpaper;
}

/**
 * The photo of this window, as the data URL that main gave. Painting reads the plain variable, not
 * the signal: a signal read right after a write gives the old value until the next flush. The signal
 * is for the photo tile of Settings. A window reads the photo only while the photo wallpaper shows or
 * Settings wants the tile, and again when the version changes. A failed read is tried once more.
 */
const [photo, setPhoto] = createSignal<string | null>(null);
export const wallpaperPhotoUrl = photo;
let currentPhoto: string | null = null;
let loadedVersion: number | null = null;
let latestVersion: number | null = null;
let photoRequest = 0;
let photoShown = false;
let tileWanted = 0;

/** The big data URL goes on the root only while the photo wallpaper shows. */
function paintPhoto(): void {
  const root = document.documentElement;
  if (!photoShown || currentPhoto === null) root.style.removeProperty("--openbot-chat-wallpaper-photo");
  else root.style.setProperty("--openbot-chat-wallpaper-photo", `url("${currentPhoto}")`);
}

function showPhoto(next: string | null, version: number | null): void {
  currentPhoto = next;
  loadedVersion = version;
  setPhoto(next);
  paintPhoto();
}

async function readPhoto(): Promise<string | null> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const url = await appPort().getChatWallpaperPhoto();
      return isChatWallpaperPhotoUrl(url) ? url : null;
    } catch (error) {
      if (attempt >= 1) throw error;
    }
  }
}

/** Reads the photo when it is wanted and the version is new; drops it when nothing wants it. */
function syncPhoto(): void {
  const wanted = (photoShown || tileWanted > 0) && latestVersion !== null;
  if (!wanted) {
    photoRequest += 1;
    if (currentPhoto !== null) showPhoto(null, null);
    return;
  }
  if (latestVersion === loadedVersion) return;
  const version = latestVersion;
  const request = ++photoRequest;
  readPhoto()
    .then((url) => request === photoRequest && showPhoto(url, version))
    .catch(() => request === photoRequest && showPhoto(null, null));
}

/** Settings wants the saved photo for its tile until the returned function is called. */
export function wantWallpaperPhoto(): () => void {
  tileWanted += 1;
  syncPhoto();
  return () => {
    tileWanted -= 1;
    syncPhoto();
  };
}

/**
 * Sets the chat wallpaper, the glass and the message box glow on the root element. `chat-wallpaper.css`
 * paints the wallpaper behind the messages of conversations only, and the glass over the bubbles and
 * the message box (AC-005, AC-006). The preload held the numbers inside their range and let only a
 * JPEG data URL through, so each value is safe in CSS.
 */
export function applyChatWallpaper(preference: WallpaperPreference): void {
  const root = document.documentElement;
  const wallpaper = shownWallpaper(preference);
  if (wallpaper === "none") root.removeAttribute("data-openbot-chat-wallpaper");
  else root.setAttribute("data-openbot-chat-wallpaper", wallpaper);
  root.style.setProperty("--openbot-chat-wallpaper-strength", String(preference.chatWallpaperStrength / 100));
  root.style.setProperty("--openbot-chat-wallpaper-blur", `${preference.chatWallpaperBlur}px`);
  root.toggleAttribute("data-openbot-chat-glass", preference.chatGlass);
  setComposerGlow(preference.composerGlow, preference.composerGlowGradient);
  photoShown = wallpaper === "photo";
  latestVersion = preference.chatWallpaperPhotoVersion;
  syncPhoto();
  paintPhoto();
}

function setComposerGlow(glow: AppComposerGlow, gradient: AppComposerGlowGradient | null): void {
  const root = document.documentElement;
  // Turning is the default, so the attribute is absent for it.
  if (glow === "turn") root.removeAttribute("data-openbot-composer-glow");
  else root.setAttribute("data-openbot-composer-glow", glow);
  // A gradient gives the two lights and the halo their own colors; without one they take the main
  // color (AC-011). The colors come from the contract's table, never from the saved value.
  const colors = gradient === null ? null : COMPOSER_GLOW_GRADIENTS[gradient];
  if (colors === null) {
    root.style.removeProperty("--openbot-composer-glow-start");
    root.style.removeProperty("--openbot-composer-glow-end");
  } else {
    root.style.setProperty("--openbot-composer-glow-start", colors.start);
    root.style.setProperty("--openbot-composer-glow-end", colors.end);
  }
}

/** A slider drag shows at once; the saved value follows when the user lets go. */
export function previewWallpaperLevel(change: { strength?: number; blur?: number }): void {
  const root = document.documentElement;
  if (change.strength !== undefined)
    root.style.setProperty("--openbot-chat-wallpaper-strength", String(change.strength / 100));
  if (change.blur !== undefined) root.style.setProperty("--openbot-chat-wallpaper-blur", `${change.blur}px`);
}
