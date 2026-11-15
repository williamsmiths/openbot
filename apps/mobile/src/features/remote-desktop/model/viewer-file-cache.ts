/** A file answer of the host, as the viewer proxy serves it. */
export interface ViewerFile {
  name: string;
  mimeType: string;
  base64: string;
}

/**
 * Moonlight's scripts and styles of each server, kept for this app run. Without them each connect
 * loads about 80 files again over the Team API, four at a time. They are the host's runtime files,
 * the same for every session. HTML and API answers are not kept: the host makes them for a session.
 * Nothing is written to disk. A host update can change the files while the app runs: a viewer that
 * reports an error forgets the server's files, so the next try loads them again.
 */
const files = new Map<string, ViewerFile>();
const MAX_FILES = 300;
/** A few servers' Moonlight files; an old phone has little memory. */
const MAX_BASE64_LENGTH = 16 * 1024 * 1024;
let keptLength = 0;
const KEPT_TYPES = /javascript|css|wasm|font|image\//u;

/** The key of a static Moonlight file: the server and the file's path below the session. */
export function viewerFileKey(scope: string, moonlightPath: string, path: string): string | null {
  // A query can carry session values; a file below the session's Moonlight path has none.
  if (path.includes("?") || !path.startsWith(moonlightPath)) return null;
  return `${scope}\n${path.slice(moonlightPath.length)}`;
}

export function cachedViewerFile(key: string | null): ViewerFile | undefined {
  return key === null ? undefined : files.get(key);
}

/** Keeps a static file. A file that names the session, such as the host's `config.js`, is not static. */
export function keepViewerFile(key: string | null, status: number, file: ViewerFile, sessionId: string): void {
  if (key === null || status !== 200 || file.mimeType.includes("html") || !KEPT_TYPES.test(file.mimeType)) return;
  if (atob(file.base64).includes(sessionId)) return;
  if (files.size >= MAX_FILES || keptLength + file.base64.length > MAX_BASE64_LENGTH) {
    files.clear();
    keptLength = 0;
  }
  keptLength += file.base64.length - (files.get(key)?.base64.length ?? 0);
  files.set(key, file);
}

/** Forgets the kept files of a server. */
export function forgetViewerFiles(scope: string): void {
  for (const [key, file] of files) {
    if (!key.startsWith(`${scope}\n`)) continue;
    keptLength -= file.base64.length;
    files.delete(key);
  }
}
