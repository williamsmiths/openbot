import type {
  KongAnalysisRow,
  KongRepoAnalysis,
  KongTrendKind,
  KongTrendList,
  KongTrendSince,
} from "@openbot/contracts/team-protocol/kong-github-v1";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import {
  saveAnalyses,
  savedAnalyses,
  savedTrendList,
  saveTrendList,
  trendListKey,
} from "@/features/trending/model/kong-trend-cache";
import { useMobileWorkspace } from "@/features/workspace/context/mobile-workspace-context";

/** While the companion still writes Vietnamese summaries, the list is read again this often. */
const TRANSLATING_POLL_MS = 4_000;
/** While an analysis runs, it is read this often. */
const RUNNING_POLL_MS = 2_000;
/** The companion keeps its lists 30 minutes; a list of a few minutes is fresh enough here. */
const STALE_MS = 5 * 60_000;

/**
 * A GitHub Trending or new repositories list, page by page. The first page saved on this phone shows
 * at once (any age) and the server's new one replaces it.
 */
export function useKongTrend(serverId: string, kind: KongTrendKind, since: KongTrendSince, lang: string) {
  const { canUseKongGithub, loadKongTrend } = useMobileWorkspace();
  const available = canUseKongGithub(serverId);
  const key = trendListKey(serverId, kind, since, lang);
  const saved = savedTrendList(key);
  return {
    available,
    query: useInfiniteQuery({
      queryKey: ["kong-github", "trend", key],
      enabled: available,
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        const list = await loadKongTrend(serverId, { kind, since, lang, page: pageParam });
        if (pageParam === 1) saveTrendList(key, list);
        return list;
      },
      getNextPageParam: (last: KongTrendList) => (last.has_more ? last.page + 1 : undefined),
      // The saved page counts as old, so it is read again at once.
      initialData: saved ? { pages: [saved], pageParams: [1] } : undefined,
      initialDataUpdatedAt: 0,
      staleTime: STALE_MS,
      refetchInterval: (query) =>
        query.state.data?.pages.some((page) => page.translating) ? TRANSLATING_POLL_MS : false,
    }),
  };
}

/** The latest analyses of the companion, newest first. */
export function useKongAnalyses(serverId: string, enabled: boolean) {
  const { canUseKongGithub, loadKongAnalyses } = useMobileWorkspace();
  const available = canUseKongGithub(serverId);
  return useQuery<KongAnalysisRow[]>({
    queryKey: ["kong-github", "analyses", serverId],
    enabled: available && enabled,
    queryFn: async () => {
      const rows = await loadKongAnalyses(serverId);
      saveAnalyses(serverId, rows);
      return rows;
    },
    initialData: savedAnalyses(serverId),
    initialDataUpdatedAt: 0,
    refetchInterval: (query) =>
      query.state.data?.some((row) => row.status === "running") ? RUNNING_POLL_MS * 2 : false,
  });
}

/**
 * The analysis of one repository. As on kongCowork, opening a repository that was never analysed is the
 * request: it starts the analysis once. A running one is read again until it ends.
 */
export function useKongAnalysis(serverId: string, repo: string) {
  const { canUseKongGithub, loadKongAnalysis } = useMobileWorkspace();
  const started = useRef(false);
  const available = canUseKongGithub(serverId);
  return {
    available,
    query: useQuery<KongRepoAnalysis>({
      queryKey: ["kong-github", "analysis", serverId, repo],
      enabled: available && repo.length > 0,
      queryFn: async () => {
        const current = await loadKongAnalysis(serverId, { repo });
        if (current.status !== "none" || started.current) return current;
        started.current = true;
        return loadKongAnalysis(serverId, { repo, start: true });
      },
      refetchInterval: (query) => (query.state.data?.status === "running" ? RUNNING_POLL_MS : false),
    }),
  };
}
