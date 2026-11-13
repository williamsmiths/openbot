import { readFile } from "node:fs/promises";
import { attachmentMimeTypeForName } from "@openbot/contracts/attachment-files";
import { ATTACHMENT_LIMITS } from "@openbot/contracts/input-limits";
import { type FilePreview, filePreviewKindForFile, filePreviewMimeTypeForName } from "@openbot/contracts/ipc";
import { sourceText } from "@openbot/i18n/source";
import { Effect } from "effect";
import { attachmentCall } from "../backend/attachment-effects";
import { filePreviewPages } from "./file-preview-pages";

export function mimeTypeForName(name: string) {
  return attachmentMimeTypeForName(name);
}

/**
 * The preview of a file that a joined server sent. An HTML file gets a page address, as a local
 * file does, so the panel shows it in the same sandboxed visual-page frame. `generation` is read
 * before the download, so a page from a replaced renderer is not kept.
 */
export function filePreviewFromBytes(name: string, bytes: Uint8Array, generation: number): FilePreview {
  if (bytes.byteLength > ATTACHMENT_LIMITS.fileBytes) throw new Error(sourceText("error.attachment.previewTooLarge"));
  const mimeType = filePreviewMimeTypeForName(name);
  const kind = filePreviewKindForFile(name, mimeType);
  const previewBytes = kind === "none" ? null : bytes;
  const pageUrl = previewBytes ? filePreviewPages.add(mimeType, previewBytes, generation) : undefined;
  return {
    name,
    size: bytes.byteLength,
    mimeType,
    previewKind: kind,
    bytes: previewBytes,
    ...(pageUrl ? { pageUrl } : {}),
  };
}

export const localFilePreview = Effect.fn("FilePreview.local")(function* (
  path: string,
  name: string,
  size: number,
  generation: number,
  maxBytes: number = ATTACHMENT_LIMITS.fileBytes,
) {
  const mimeType = filePreviewMimeTypeForName(name);
  // A file over the limit is not read. The panel still opens, reveals and saves it by its path.
  const kind = size > Math.min(maxBytes, ATTACHMENT_LIMITS.fileBytes) ? "none" : filePreviewKindForFile(name, mimeType);
  const bytes = kind === "none" ? null : new Uint8Array(yield* attachmentCall(() => readFile(path)));
  const pageUrl = bytes ? filePreviewPages.add(mimeType, bytes, generation) : undefined;
  return {
    name,
    size,
    mimeType,
    previewKind: kind,
    bytes,
    ...(pageUrl ? { pageUrl } : {}),
  };
});
