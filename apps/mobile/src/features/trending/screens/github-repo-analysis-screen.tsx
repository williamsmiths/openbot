import type { KongRepoAnalysis } from "@openbot/contracts/team-protocol/kong-github-v1";
import { useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { Spinner, Typography } from "heroui-native";
import MessagesSquare from "lucide-react-native/icons/messages-square";
import SendHorizontal from "lucide-react-native/icons/send-horizontal";
import Sparkles from "lucide-react-native/icons/sparkles";
import Star from "lucide-react-native/icons/star";
import { useState } from "react";
import { Linking, Pressable, TextInput, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { SettingsNote } from "@/features/settings/components/settings-content";
import { AnalysisCard, AnalysisSections } from "@/features/trending/components/analysis-sections";
import { ScoreBadge } from "@/features/trending/components/score-badge";
import { useKongAnalysis } from "@/features/trending/model/use-kong-github";
import { useMobileWorkspace } from "@/features/workspace/context/mobile-workspace-context";
import { LargeTitleScrollView } from "@/shared/components/large-title";
import { formatUpdatedAt } from "@/shared/lib/format-updated-at";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";

/**
 * The AI analysis of one GitHub repository, from the KongCowork companion. It starts on open for a
 * repository that was never analysed and shows its progress; the result stays on the server.
 */
export function GithubRepoAnalysisScreen() {
  const { t, format, errorMessage } = useText();
  const { serverId = "", repo = "" } = useLocalSearchParams<{ serverId: string; repo: string }>();
  const { available, query } = useKongAnalysis(serverId, repo);
  const { loadKongAnalysis } = useMobileWorkspace();
  const queryClient = useQueryClient();
  const [muted, accent] = useCSSVariable(["--openbot-text-grouped-secondary", "--openbot-accent"]).map(String);
  const analysis = query.data;
  const name = repo.split("/")[1] ?? repo;
  const start = (force: boolean) => {
    void haptics.impact("soft");
    void loadKongAnalysis(serverId, { repo, start: true, force })
      .then((next) => queryClient.setQueryData(["kong-github", "analysis", serverId, repo], next))
      .catch(() => undefined);
  };

  return (
    <LargeTitleScrollView title={name} caption={repo} contentContainerClassName="gap-3 px-4 pt-3 pb-8">
      {analysis?.status === "done" ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="arrow.clockwise"
            accessibilityLabel={t("mobile.server.trending.rerun")}
            onPress={() => start(true)}
          />
        </Stack.Toolbar>
      ) : null}
      {!available ? (
        <SettingsNote>{t("mobile.server.trending.unsupported")}</SettingsNote>
      ) : !analysis ? (
        query.isError ? (
          <SettingsNote>{errorMessage(query.error, t("mobile.server.trending.loadFailed"))}</SettingsNote>
        ) : (
          <View className="items-center py-10">
            <Spinner />
          </View>
        )
      ) : (
        <>
          <Pressable
            accessibilityRole="link"
            className="flex-row items-center gap-3 rounded-grouped bg-grouped p-4"
            onPress={() =>
              void Linking.openURL(analysis.facts?.url || `https://github.com/${repo}`).catch(() => undefined)
            }
          >
            <View className="min-w-0 flex-1 gap-1">
              {analysis.facts?.description ? (
                <Typography.Paragraph numberOfLines={3}>{analysis.facts.description}</Typography.Paragraph>
              ) : null}
              <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
                {analysis.facts?.language ? (
                  <Typography type="body-sm" className="text-grouped-secondary">
                    {analysis.facts.language}
                  </Typography>
                ) : null}
                {analysis.facts ? (
                  <View className="flex-row items-center gap-1">
                    <Star size={13} color={muted} strokeWidth={1.75} />
                    <Typography type="body-sm" className="text-grouped-secondary">
                      {format.compact(analysis.facts.stars)}
                    </Typography>
                  </View>
                ) : null}
                {analysis.facts?.license ? (
                  <Typography type="body-sm" className="text-grouped-secondary">
                    {analysis.facts.license}
                  </Typography>
                ) : null}
                <Typography type="body-sm" className="text-accent">
                  {t("mobile.server.trending.openGithub")}
                </Typography>
              </View>
            </View>
            {analysis.score ? <ScoreBadge score={analysis.score.overall} size="lg" /> : null}
          </Pressable>
          <AnalysisStatus analysis={analysis} />
          {analysis.status === "none" || (analysis.status === "error" && !analysis.ai) ? (
            <Pressable
              accessibilityRole="button"
              className="flex-row items-center justify-center gap-2 rounded-grouped bg-grouped py-3.5"
              style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
              onPress={() => start(analysis.status === "error")}
            >
              <Sparkles size={16} color={accent} strokeWidth={2} />
              <Typography.Paragraph className="font-medium text-accent">
                {t(
                  analysis.status === "error" ? "mobile.server.trending.rerun" : "mobile.server.trending.startAnalysis",
                )}
              </Typography.Paragraph>
            </Pressable>
          ) : null}
          {analysis.ai ? <AnalysisSections analysis={analysis} /> : null}
          {analysis.status === "done" ? <AskCard serverId={serverId} analysis={analysis} /> : null}
          {analysis.generated_at ? (
            <Typography type="body-xs" className="text-center text-grouped-secondary">
              {t("mobile.server.trending.generated", { time: formatUpdatedAt(analysis.generated_at) })}
            </Typography>
          ) : null}
        </>
      )}
    </LargeTitleScrollView>
  );
}

function AnalysisStatus({ analysis }: { analysis: KongRepoAnalysis }) {
  const { t } = useText();
  if (analysis.status === "running")
    return (
      <View className="flex-row items-center gap-3 rounded-grouped bg-grouped p-4">
        <Spinner size="sm" />
        <Typography.Paragraph className="flex-1">
          {t(
            analysis.stage === "queued"
              ? "mobile.server.trending.stage.queued"
              : analysis.stage === "fetch"
                ? "mobile.server.trending.stage.fetch"
                : "mobile.server.trending.stage.ai",
          )}
        </Typography.Paragraph>
      </View>
    );
  if (analysis.status === "none") return <SettingsNote>{t("mobile.server.trending.notAnalyzed")}</SettingsNote>;
  if (analysis.error) return <SettingsNote>{analysis.error}</SettingsNote>;
  return null;
}

function AskCard({ serverId, analysis }: { serverId: string; analysis: KongRepoAnalysis }) {
  const { t, errorMessage } = useText();
  const { askKongRepo } = useMobileWorkspace();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foreground, muted, accent] = useCSSVariable([
    "--openbot-foreground",
    "--openbot-text-grouped-secondary",
    "--openbot-accent",
  ]);
  const asking = analysis.qa.some((item) => item.status === "running");
  const send = () => {
    const text = question.trim();
    if (!text || sending || asking) return;
    void haptics.impact("light");
    setSending(true);
    setError(null);
    askKongRepo(serverId, { repo: analysis.repo, question: text })
      .then((next) => {
        setQuestion("");
        queryClient.setQueryData(["kong-github", "analysis", serverId, analysis.repo], next);
      })
      .catch((cause: unknown) => setError(errorMessage(cause, t("mobile.server.trending.askFailed"))))
      .finally(() => setSending(false));
  };
  return (
    <AnalysisCard
      title={t("mobile.server.trending.section.ask")}
      Icon={MessagesSquare}
      note={t("mobile.server.trending.section.askNote")}
    >
      {analysis.qa.map((item) => (
        <View key={item.id} className="gap-1">
          <Typography type="body-sm" className="font-semibold">
            {item.question}
          </Typography>
          {item.status === "running" ? (
            <View className="flex-row items-center gap-2">
              <Spinner size="sm" />
              <Typography type="body-sm" className="text-grouped-secondary">
                {t("mobile.server.trending.answering")}
              </Typography>
            </View>
          ) : (
            <Typography.Paragraph>{item.answer || item.error}</Typography.Paragraph>
          )}
        </View>
      ))}
      <View className="flex-row items-end gap-2 rounded-2xl bg-control/60 py-1 pr-1 pl-3">
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder={t("mobile.server.trending.askPlaceholder")}
          placeholderTextColor={String(muted)}
          multiline
          maxLength={500}
          className="flex-1 py-2 text-base"
          style={{ color: String(foreground), maxHeight: 120 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("mobile.server.trending.send")}
          disabled={!question.trim() || sending || asking}
          className="size-9 items-center justify-center"
          onPress={send}
        >
          {sending ? (
            <Spinner size="sm" />
          ) : (
            <SendHorizontal size={20} color={String(question.trim() ? accent : muted)} strokeWidth={2} />
          )}
        </Pressable>
      </View>
      {error ? (
        <Typography type="body-sm" className="text-danger">
          {error}
        </Typography>
      ) : null}
    </AnalysisCard>
  );
}
