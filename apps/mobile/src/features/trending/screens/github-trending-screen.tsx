import type { KongTrendKind, KongTrendSince } from "@openbot/contracts/team-protocol/kong-github-v1";
import { router, Stack } from "expo-router";
import { Spinner, Typography } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { UsageSegments } from "@/features/agents/components/usage-segments";
import { SettingsNote } from "@/features/settings/components/settings-content";
import { ScoreBadge } from "@/features/trending/components/score-badge";
import { TrendingRepoCard } from "@/features/trending/components/trending-repo-card";
import { useKongAnalyses, useKongTrend } from "@/features/trending/model/use-kong-github";
import { useMobileWorkspace } from "@/features/workspace/context/mobile-workspace-context";
import { LargeTitleScrollView } from "@/shared/components/large-title";
import { formatUpdatedAt } from "@/shared/lib/format-updated-at";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";

type Tab = KongTrendKind | "analyzed";

/** The languages of the filter, by their GitHub name. "" is all languages. */
const LANGUAGES = ["", "Python", "TypeScript", "JavaScript", "Rust", "Go", "Swift", "Kotlin", "C++", "Java"] as const;
const RANGES: readonly KongTrendSince[] = ["daily", "weekly", "monthly"];

/**
 * GitHub Trending, from the KongCowork companion on the open server: the trending and new repositories
 * with a Vietnamese summary, and the AI analyses. A tap on a repository opens its analysis.
 */
export function GithubTrendingScreen() {
  const { t } = useText();
  const { activeServer } = useMobileWorkspace();
  const serverId = activeServer.id;
  const [tab, setTab] = useState<Tab>("trending");
  const [since, setSince] = useState<KongTrendSince>("daily");
  const [lang, setLang] = useState("");
  const kind: KongTrendKind = tab === "new" ? "new" : "trending";
  const trend = useKongTrend(serverId, kind, since, lang);
  const analyses = useKongAnalyses(serverId, tab === "analyzed");

  const rangeLabel = (value: KongTrendSince) =>
    t(
      value === "daily"
        ? "mobile.server.trending.today"
        : value === "weekly"
          ? "mobile.server.trending.week"
          : "mobile.server.trending.month",
    );
  const languageLabel = lang || t("mobile.server.trending.allLanguages");

  return (
    <LargeTitleScrollView
      title={t("mobile.app.route.trending")}
      caption={`${rangeLabel(since)} · ${languageLabel}`}
      contentContainerClassName="gap-3 px-4 pt-3 pb-8"
    >
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon="slider.horizontal.3"
          accessibilityLabel={t("mobile.server.trending.filter")}
          title={t("mobile.server.trending.filter")}
        >
          <Stack.Toolbar.Menu inline title={t("mobile.server.trending.range")}>
            {RANGES.map((value) => (
              <Stack.Toolbar.MenuAction key={value} isOn={since === value} onPress={() => setSince(value)}>
                {rangeLabel(value)}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu inline title={t("mobile.server.trending.language")}>
            {LANGUAGES.map((value) => (
              <Stack.Toolbar.MenuAction key={value || "all"} isOn={lang === value} onPress={() => setLang(value)}>
                {value || t("mobile.server.trending.allLanguages")}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <UsageSegments
        value={tab}
        accessibilityLabel={t("mobile.app.route.trending")}
        options={[
          { value: "trending", label: t("mobile.server.trending.tab.trending") },
          { value: "new", label: t("mobile.server.trending.tab.new") },
          { value: "analyzed", label: t("mobile.server.trending.tab.analyzed") },
        ]}
        onChange={setTab}
      />
      {!trend.available ? (
        <SettingsNote>{t("mobile.server.trending.unsupported")}</SettingsNote>
      ) : tab === "analyzed" ? (
        <AnalysesList serverId={serverId} query={analyses} />
      ) : (
        <TrendList serverId={serverId} trend={trend.query} />
      )}
    </LargeTitleScrollView>
  );
}

function Loading() {
  return (
    <View className="items-center py-10">
      <Spinner />
    </View>
  );
}

function TrendList({ serverId, trend }: { serverId: string; trend: ReturnType<typeof useKongTrend>["query"] }) {
  const { t, errorMessage } = useText();
  const pages = trend.data?.pages ?? [];
  const repos = pages.flatMap((page) => page.repos);
  const first = pages[0];
  if (repos.length === 0)
    return trend.isPending || trend.isFetching ? (
      <Loading />
    ) : (
      <SettingsNote>
        {trend.isError
          ? errorMessage(trend.error, t("mobile.server.trending.loadFailed"))
          : t("mobile.server.trending.empty")}
      </SettingsNote>
    );
  return (
    <>
      {first?.translating ? (
        <View className="flex-row items-center gap-2 px-1">
          <Spinner size="sm" />
          <Typography type="body-sm" className="text-grouped-secondary">
            {t("mobile.server.trending.translating")}
          </Typography>
        </View>
      ) : null}
      {repos.map((repo, index) => (
        <TrendingRepoCard key={repo.full_name} repo={repo} rank={index + 1} serverId={serverId} />
      ))}
      {trend.hasNextPage ? (
        <Pressable
          accessibilityRole="button"
          className="items-center rounded-grouped bg-grouped py-3"
          disabled={trend.isFetchingNextPage}
          onPress={() => {
            void haptics.selection();
            void trend.fetchNextPage();
          }}
        >
          {trend.isFetchingNextPage ? (
            <Spinner size="sm" />
          ) : (
            <Typography.Paragraph className="font-medium text-accent">
              {t("mobile.server.trending.more")}
            </Typography.Paragraph>
          )}
        </Pressable>
      ) : null}
      {first?.fetched_at ? (
        <Typography type="body-xs" className="px-1 text-center text-grouped-secondary">
          {t("mobile.server.trending.updated", { time: formatUpdatedAt(first.fetched_at) })}
        </Typography>
      ) : null}
    </>
  );
}

function AnalysesList({ serverId, query }: { serverId: string; query: ReturnType<typeof useKongAnalyses> }) {
  const { t, errorMessage } = useText();
  const rows = query.data ?? [];
  if (rows.length === 0)
    return query.isPending || query.isFetching ? (
      <Loading />
    ) : (
      <SettingsNote>
        {query.isError
          ? errorMessage(query.error, t("mobile.server.trending.loadFailed"))
          : t("mobile.server.trending.analyzedEmpty")}
      </SettingsNote>
    );
  return rows.map((row) => {
    const [owner, name] = row.repo.split("/");
    return (
      <Pressable
        key={row.repo}
        accessibilityRole="button"
        accessibilityLabel={row.repo}
        className="flex-row items-center gap-3 rounded-grouped bg-grouped p-4"
        style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        onPress={() => {
          void haptics.impact("soft");
          router.push({ pathname: "/github-repo", params: { serverId, repo: row.repo } });
        }}
      >
        <View className="min-w-0 flex-1 gap-1">
          <Typography.Paragraph className="font-semibold" numberOfLines={1}>
            {name ?? row.repo}
          </Typography.Paragraph>
          <Typography type="body-sm" className="text-grouped-secondary" numberOfLines={1}>
            {row.status === "running"
              ? t("mobile.server.trending.running")
              : `${owner ?? ""} · ${formatUpdatedAt(row.generated_at || null)}`}
          </Typography>
          {row.summary ? (
            <Typography.Paragraph type="body-sm" numberOfLines={2}>
              {row.summary}
            </Typography.Paragraph>
          ) : null}
        </View>
        {row.overall !== null ? <ScoreBadge score={row.overall} /> : null}
      </Pressable>
    );
  });
}
