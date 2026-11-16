import type { KongRepoAnalysis } from "@openbot/contracts/team-protocol/kong-github-v1";
import { Typography } from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import CircleHelp from "lucide-react-native/icons/circle-question-mark";
import Gauge from "lucide-react-native/icons/gauge";
import GitFork from "lucide-react-native/icons/git-fork";
import Layers from "lucide-react-native/icons/layers";
import ListChecks from "lucide-react-native/icons/list-checks";
import Sparkles from "lucide-react-native/icons/sparkles";
import SquareTerminal from "lucide-react-native/icons/square-terminal";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import UsersRound from "lucide-react-native/icons/users-round";
import Workflow from "lucide-react-native/icons/workflow";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";
import { useText } from "@/shared/lib/text";

/** A titled card of the analysis, as the grouped lists draw them. */
export function AnalysisCard({
  title,
  Icon,
  note,
  children,
}: PropsWithChildren<{ title: string; Icon: LucideIcon; note?: string }>) {
  const muted = String(useCSSVariable("--openbot-text-grouped-secondary"));
  return (
    <View className="gap-3 rounded-grouped bg-grouped p-4">
      <View className="gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <Icon size={15} color={muted} strokeWidth={1.75} />
          <Typography.Paragraph className="font-semibold">{title}</Typography.Paragraph>
        </View>
        {note ? (
          <Typography type="body-xs" className="text-grouped-secondary">
            {note}
          </Typography>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <View className="gap-1.5">
      {items.map((item) => (
        // The lines have no id; the companion does not repeat a line.
        <View key={item} className="flex-row gap-2">
          <Typography.Paragraph className="text-grouped-secondary">•</Typography.Paragraph>
          <Typography.Paragraph className="flex-1">{item}</Typography.Paragraph>
        </View>
      ))}
    </View>
  );
}

function Chips({ items }: { items: readonly string[] }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => (
        <View key={item} className="rounded-full bg-control/60 px-3 py-1">
          <Typography type="body-sm">{item}</Typography>
        </View>
      ))}
    </View>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const [success, warning, danger] = useCSSVariable(["--openbot-success", "--openbot-warning", "--openbot-danger"]);
  const color = String(value >= 75 ? success : value >= 50 ? warning : danger);
  return (
    <View className="gap-1">
      <View className="flex-row justify-between">
        <Typography type="body-sm">{label}</Typography>
        <Typography type="body-sm" className="font-semibold" style={{ fontVariant: ["tabular-nums"] }}>
          {String(value)}
        </Typography>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-control/60">
        <View className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** The sections of a finished analysis, in the order of kongCowork. Empty sections are left out. */
export function AnalysisSections({ analysis }: { analysis: KongRepoAnalysis }) {
  const { t } = useText();
  const { ai, score } = analysis;
  const warning = String(useCSSVariable("--openbot-warning"));
  return (
    <>
      {ai?.summary ? (
        <AnalysisCard title={t("mobile.server.trending.section.summary")} Icon={Sparkles}>
          <Typography.Paragraph>{ai.summary}</Typography.Paragraph>
          {ai.highlights.length ? <Bullets items={ai.highlights} /> : null}
          {ai.caveats.length ? (
            <View className="gap-1.5">
              <Typography type="body-sm" className="font-semibold" style={{ color: warning }}>
                {t("mobile.server.trending.section.caveats")}
              </Typography>
              <Bullets items={ai.caveats} />
            </View>
          ) : null}
        </AnalysisCard>
      ) : null}
      {score ? (
        <AnalysisCard
          title={t("mobile.server.trending.section.score")}
          Icon={Gauge}
          note={t("mobile.server.trending.section.scoreNote")}
        >
          <ScoreRow label={t("mobile.server.trending.score.popularity")} value={score.popularity} />
          <ScoreRow label={t("mobile.server.trending.score.freshness")} value={score.freshness} />
          <ScoreRow label={t("mobile.server.trending.score.community")} value={score.community} />
          <ScoreRow label={t("mobile.server.trending.score.docs")} value={score.docs} />
          <ScoreRow label={t("mobile.server.trending.score.releases")} value={score.releases} />
        </AnalysisCard>
      ) : null}
      {ai?.tech_stack.length ? (
        <AnalysisCard title={t("mobile.server.trending.section.stack")} Icon={Layers}>
          <Chips items={ai.tech_stack} />
        </AnalysisCard>
      ) : null}
      {ai?.quickstart.length ? (
        <AnalysisCard title={t("mobile.server.trending.section.quickstart")} Icon={SquareTerminal}>
          {ai.quickstart.map((step, index) => (
            <View key={`${step.step}|${step.cmd}`} className="gap-1">
              <Typography type="body-sm" className="font-semibold">
                {`${index + 1}. ${step.step}`}
              </Typography>
              {step.cmd ? (
                <View className="rounded-xl bg-control/60 px-3 py-2">
                  <Typography type="body-sm" style={{ fontFamily: "Menlo" }} selectable>
                    {step.cmd}
                  </Typography>
                </View>
              ) : null}
              {step.note ? (
                <Typography type="body-sm" className="text-grouped-secondary">
                  {step.note}
                </Typography>
              ) : null}
            </View>
          ))}
        </AnalysisCard>
      ) : null}
      {ai?.use_cases.length ? (
        <AnalysisCard title={t("mobile.server.trending.section.useCases")} Icon={ListChecks}>
          <Bullets items={ai.use_cases} />
        </AnalysisCard>
      ) : null}
      {ai?.what_is ? (
        <AnalysisCard title={t("mobile.server.trending.section.whatIs")} Icon={CircleHelp}>
          <Typography.Paragraph>{ai.what_is}</Typography.Paragraph>
        </AnalysisCard>
      ) : null}
      {ai?.problem_before || ai?.problem_solution ? (
        <AnalysisCard title={t("mobile.server.trending.section.problem")} Icon={Sparkles}>
          {ai.problem_before ? <Typography.Paragraph>{ai.problem_before}</Typography.Paragraph> : null}
          {ai.problem_solution ? <Typography.Paragraph>{ai.problem_solution}</Typography.Paragraph> : null}
        </AnalysisCard>
      ) : null}
      {ai?.fit_for.length || ai?.not_for.length ? (
        <AnalysisCard title={t("mobile.server.trending.section.audience")} Icon={UsersRound}>
          {ai.fit_for.length ? <Bullets items={ai.fit_for} /> : null}
          {ai.not_for.length ? (
            <View className="gap-1.5">
              <Typography type="body-sm" className="font-semibold text-grouped-secondary">
                {t("mobile.server.trending.section.notFor")}
              </Typography>
              <Bullets items={ai.not_for} />
            </View>
          ) : null}
        </AnalysisCard>
      ) : null}
      {ai?.how_it_works.length ? (
        <AnalysisCard title={t("mobile.server.trending.section.howItWorks")} Icon={Workflow}>
          <Bullets items={ai.how_it_works} />
        </AnalysisCard>
      ) : null}
      {ai?.risks.length ? (
        <AnalysisCard title={t("mobile.server.trending.section.risks")} Icon={TriangleAlert}>
          <Bullets items={ai.risks} />
        </AnalysisCard>
      ) : null}
      {ai?.alternatives.length ? (
        <AnalysisCard
          title={t("mobile.server.trending.section.alternatives")}
          Icon={GitFork}
          note={t("mobile.server.trending.section.alternativesNote")}
        >
          {ai.alternatives.map((item) => (
            <View key={item.name} className="gap-0.5">
              <Typography.Paragraph className="font-semibold">{item.name}</Typography.Paragraph>
              {item.note ? (
                <Typography type="body-sm" className="text-grouped-secondary">
                  {item.note}
                </Typography>
              ) : null}
            </View>
          ))}
        </AnalysisCard>
      ) : null}
    </>
  );
}
