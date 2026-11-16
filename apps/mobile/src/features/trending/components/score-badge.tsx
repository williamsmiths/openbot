import { Typography } from "heroui-native";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";

/** The repository score from 0 to 100, green from 75, orange from 50, red below. */
export function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const [success, warning, danger] = useCSSVariable(["--openbot-success", "--openbot-warning", "--openbot-danger"]);
  const color = String(score >= 75 ? success : score >= 50 ? warning : danger);
  const large = size === "lg";
  return (
    <View
      className={`items-center justify-center rounded-full ${large ? "size-14" : "size-9"}`}
      style={{ borderWidth: large ? 3 : 2, borderColor: color }}
    >
      <Typography
        type={large ? "body" : "body-sm"}
        className="font-semibold"
        style={{ color, fontVariant: ["tabular-nums"] }}
      >
        {String(score)}
      </Typography>
    </View>
  );
}
