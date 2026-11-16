import type { KongTrendRepo } from "@openbot/contracts/team-protocol/kong-github-v1";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Typography } from "heroui-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Star from "lucide-react-native/icons/star";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { ScoreBadge } from "@/features/trending/components/score-badge";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";

/**
 * One repository of GitHub Trending, as on kongCowork: its place, owner picture, name, the stars of
 * the period (or the score of an analysed one), the Vietnamese summary, and a line with the language,
 * stars and forks. A tap opens its AI analysis.
 */
export const TrendingRepoCard = memo(function TrendingRepoCard({
  repo,
  rank,
  serverId,
}: {
  repo: KongTrendRepo;
  rank: number;
  serverId: string;
}) {
  const { t, format } = useText();
  const [muted, success] = useCSSVariable(["--openbot-text-grouped-secondary", "--openbot-success"]);
  const summary = repo.summary_vi || repo.description;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={repo.full_name}
      className="gap-2.5 rounded-grouped bg-grouped p-4"
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
      onPress={() => {
        void haptics.impact("soft");
        router.push({ pathname: "/github-repo", params: { serverId, repo: repo.full_name } });
      }}
    >
      <View className="flex-row items-center gap-3">
        <Typography type="body-sm" className="w-5 text-center font-semibold text-grouped-secondary">
          {rank}
        </Typography>
        {repo.avatar ? (
          <Image source={{ uri: repo.avatar }} style={{ width: 40, height: 40, borderRadius: 10 }} />
        ) : null}
        <View className="min-w-0 flex-1">
          <Typography.Paragraph className="font-semibold" numberOfLines={1}>
            {repo.name}
          </Typography.Paragraph>
          <Typography type="body-sm" className="text-grouped-secondary" numberOfLines={1}>
            {repo.owner}
          </Typography>
        </View>
        {repo.score !== null ? (
          <ScoreBadge score={repo.score} />
        ) : repo.period_stars > 0 ? (
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${String(success)}26` }}>
            <Typography type="body-sm" className="font-semibold" style={{ color: String(success) }}>
              {`+${format.compact(repo.period_stars)}`}
            </Typography>
          </View>
        ) : null}
      </View>
      {summary ? <Typography.Paragraph numberOfLines={3}>{summary}</Typography.Paragraph> : null}
      <View className="flex-row items-center gap-4">
        {repo.language ? (
          <Typography type="body-sm" className="text-grouped-secondary" numberOfLines={1}>
            {repo.language}
          </Typography>
        ) : null}
        <View className="flex-row items-center gap-1">
          <Star size={13} color={String(muted)} strokeWidth={1.75} />
          <Typography type="body-sm" className="text-grouped-secondary">
            {format.compact(repo.stars)}
          </Typography>
        </View>
        <Typography type="body-sm" className="text-grouped-secondary">
          {t("mobile.server.trending.forks", { count: format.compact(repo.forks) })}
        </Typography>
        <View className="flex-1" />
        <View className="flex-row items-center gap-0.5">
          <Typography type="body-sm" className="text-grouped-secondary">
            {t("mobile.server.trending.analyze")}
          </Typography>
          <ChevronRight size={14} color={String(muted)} strokeWidth={1.75} />
        </View>
      </View>
    </Pressable>
  );
});
