import { isDynamicRecord } from "@openbot/contracts/runtime-values";
import {
  decodeKongAnalysisRows,
  decodeKongTrendList,
  type KongAnalysisRow,
  type KongTrendList,
} from "@openbot/contracts/team-protocol/kong-github-v1";
import { File, Paths } from "expo-file-system";

/**
 * The first page of each GitHub Trending list and the analyses list, kept on this phone so the screen
 * shows them at once on the next open while it reads the new ones. One JSON file in the documents
 * folder; a file that does not read is ignored.
 */
const FILE_NAME = "kong-github-v1.json";
/** The lists kept, the newest first. Each filter of each server is one list. */
const MAX_LISTS = 40;

interface Saved {
  lists: Record<string, KongTrendList>;
  analyses: Record<string, KongAnalysisRow[]>;
  order: string[];
}

let saved: Saved | null = null;

function load(): Saved {
  if (saved) return saved;
  saved = { lists: {}, analyses: {}, order: [] };
  try {
    const file = new File(Paths.document, FILE_NAME);
    if (!file.exists) return saved;
    let value: unknown = null;
    value = JSON.parse(file.textSync());
    if (!isDynamicRecord(value)) return saved;
    const lists = isDynamicRecord(value.lists) ? value.lists : {};
    const analyses = isDynamicRecord(value.analyses) ? value.analyses : {};
    for (const [key, list] of Object.entries(lists)) {
      try {
        saved.lists[key] = decodeKongTrendList(list);
        saved.order.push(key);
      } catch {
        // A list from an older build is read again from the server.
      }
    }
    for (const [key, rows] of Object.entries(analyses)) {
      try {
        saved.analyses[key] = decodeKongAnalysisRows({ analyses: rows });
      } catch {
        // As above.
      }
    }
  } catch {
    // An unreadable file: the screen reads the server.
  }
  return saved;
}

function write(): void {
  if (!saved) return;
  // A failed write keeps the lists for this run.
  try {
    new File(Paths.document, FILE_NAME).write(JSON.stringify(saved)).catch(() => undefined);
  } catch {
    // As above.
  }
}

export function trendListKey(serverId: string, kind: string, since: string, lang: string): string {
  return `${serverId}|${kind}|${since}|${lang}`;
}

export function savedTrendList(key: string): KongTrendList | undefined {
  return load().lists[key];
}

export function saveTrendList(key: string, list: KongTrendList): void {
  const state = load();
  state.lists[key] = list;
  state.order = [key, ...state.order.filter((item) => item !== key)];
  for (const old of state.order.splice(MAX_LISTS)) delete state.lists[old];
  write();
}

export function savedAnalyses(serverId: string): KongAnalysisRow[] | undefined {
  return load().analyses[serverId];
}

export function saveAnalyses(serverId: string, rows: KongAnalysisRow[]): void {
  load().analyses[serverId] = rows;
  write();
}
