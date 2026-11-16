import { Typography } from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import type { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";
import type { LoadLevel } from "@/features/servers/model/machine-monitor-format";

/** The card surface of every monitor block, as the grouped lists use. */
export function MachineCard({
  title,
  Icon,
  trailing,
  className = "",
  children,
}: PropsWithChildren<{ title: string; Icon: LucideIcon; trailing?: ReactNode; className?: string }>) {
  const muted = String(useCSSVariable("--openbot-text-grouped-secondary"));
  return (
    <View className={`gap-3 rounded-grouped bg-grouped p-4 ${className}`}>
      <View className="min-h-6 flex-row items-center justify-between gap-2">
        <View className="min-w-0 shrink flex-row items-center gap-1.5">
          <Icon size={14} color={muted} strokeWidth={1.75} />
          <Typography type="body-xs" className="text-grouped-secondary" numberOfLines={1}>
            {title}
          </Typography>
        </View>
        {trailing}
      </View>
      {children}
    </View>
  );
}

/** The colours of the levels: green normal, orange from 80%, red from 95%. */
export function useLevelColors(): Record<LoadLevel, string> {
  const [success, warning, danger] = useCSSVariable(["--openbot-success", "--openbot-warning", "--openbot-danger"]);
  return { normal: String(success), warning: String(warning), danger: String(danger) };
}

/** A big number with its unit, set in tabular digits so it does not jump as it changes. */
export function BigValue({ value, unit, size = 30 }: { value: string; unit?: string; size?: number }) {
  return (
    <View className="flex-row items-baseline gap-1">
      <Typography.Paragraph
        className="font-semibold"
        numberOfLines={1}
        style={{ fontSize: size, lineHeight: size + 6, fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Typography.Paragraph>
      {unit ? (
        <Typography type="body-sm" className="text-grouped-secondary">
          {unit}
        </Typography>
      ) : null}
    </View>
  );
}
