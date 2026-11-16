import { readFile, stat } from "node:fs/promises";
import { CHAT_WALLPAPER_PHOTO_URL_PREFIX } from "@openbot/contracts/app-appearance";
import { sourceText } from "@openbot/i18n/source";
import { createOpenBotLogger, toLogValue } from "@openbot/logging";
import { Effect } from "effect";
import { nativeImage } from "electron";
import { writeFileAtomically } from "../backend/atomic-json-file";
import { isMissingFileError } from "../backend/file-errors";
import { PreferenceFileFailure } from "./preference-file";

const logger = createOpenBotLogger("chat-wallpaper-photo");

/** The wallpaper photo, inside the user data folder. Only main reads or writes it (AC-008). */
export const CHAT_WALLPAPER_PHOTO_FILE = "chat-wallpaper.jpg";

/** The longest side after the resize. A wallpaper does not need more, and the data URL stays small. */
const MAX_SIDE_PX = 2560;
const JPEG_QUALITY = 85;
/** A larger source is refused before it is decoded: decoding a huge image can use all the memory. */
const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
/** A larger picture is refused from its header: 50 megapixels decode to about 200 MB of pixels. */
const MAX_SOURCE_PIXELS = 50_000_000;

/**
 * The width and height that a PNG or JPEG header states, or null when the bytes are neither or the
 * header is cut short. Read from the bytes, so the picture is not decoded to learn its size.
 */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // A start of frame (not DHT, JPG or DAC) holds the size.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
    }
    offset += 2 + view.getUint16(offset + 2);
  }
  return null;
}

/** The failure that the renderer reads: the text is safe to show, and the native cause stays in main. */
function unusable(cause?: unknown): PreferenceFileFailure {
  if (cause !== undefined) logger.warn("The wallpaper photo could not be used.", toLogValue(cause));
  return new PreferenceFileFailure({ cause: new Error(sourceText("error.app.wallpaperPhoto")) });
}

/** The saved photo as a JPEG data URL, or null when there is none. Any other failure is an error. */
export const readChatWallpaperPhoto = Effect.fn("ChatWallpaperPhoto.read")(function* (path: string) {
  const bytes = yield* Effect.tryPromise({
    try: () => readFile(path),
    catch: (cause) => cause,
  }).pipe(Effect.catch((cause) => (isMissingFileError(cause) ? Effect.succeed(null) : Effect.fail(unusable(cause)))));
  return bytes === null ? null : `${CHAT_WALLPAPER_PHOTO_URL_PREFIX}${bytes.toString("base64")}`;
});

/** Resizes the picture at `sourcePath` to a JPEG of at most 2560 px and saves it at `photoPath`. */
export const saveChatWallpaperPhoto = Effect.fn("ChatWallpaperPhoto.save")(function* (
  photoPath: string,
  sourcePath: string,
) {
  const jpeg = yield* Effect.tryPromise({
    try: async () => {
      const info = await stat(sourcePath);
      // A pipe or a device reports size 0 and would pass the cap.
      if (!info.isFile() || info.size > MAX_SOURCE_BYTES) throw new Error("Not a regular file of a fitting size.");
      const bytes = await readFile(sourcePath);
      const size = imageSize(bytes);
      if (size === null || size.width * size.height > MAX_SOURCE_PIXELS)
        throw new Error("Not a PNG or JPEG that fits.");
      const image = nativeImage.createFromBuffer(bytes);
      const { width, height } = image.getSize();
      if (image.isEmpty() || width === 0 || height === 0) throw new Error("Not an image.");
      const scale = Math.min(1, MAX_SIDE_PX / Math.max(width, height));
      const resized =
        scale < 1
          ? image.resize({
              width: Math.max(1, Math.round(width * scale)),
              height: Math.max(1, Math.round(height * scale)),
              quality: "best",
            })
          : image;
      return resized.toJPEG(JPEG_QUALITY);
    },
    catch: unusable,
  });
  yield* writeFileAtomically(photoPath, jpeg, { createDirectory: true }).pipe(Effect.mapError(unusable));
});
