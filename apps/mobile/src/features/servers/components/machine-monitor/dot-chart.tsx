import { memo } from "react";
import Svg, { Path } from "react-native-svg";

const CELL = 6;
const GAP = 2;
const PITCH = CELL + GAP;
export const DOT_CHART_COLUMNS = 15;
export const DOT_CHART_WIDTH = DOT_CHART_COLUMNS * PITCH - GAP;

export interface DotSeries {
  /** One value per column, 0 to 100. Null is a column with no reading. */
  values: readonly (number | null)[];
  rows: number;
  /** The fill colour of a value: the level colour for a percentage, one colour for a rate. */
  colorOf: (value: number) => string;
}

interface DotChartProps {
  /** Stacked from the top, one band each. */
  series: readonly DotSeries[];
  empty: string;
}

/** A column fills from the bottom: at least one dot for a value above zero, all rows at 100. */
function filledRows(value: number | null, rows: number): number {
  if (value === null || value <= 0) return 0;
  return Math.max(1, Math.min(rows, Math.round((value / 100) * rows)));
}

const RADIUS = 1.75;

/** One rounded dot as path commands, so the dots of one colour draw as a single path. */
function dotPath(x: number, y: number): string {
  const side = CELL - 2 * RADIUS;
  return (
    `M${x + RADIUS} ${y}h${side}a${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} ${RADIUS}v${side}` +
    `a${RADIUS} ${RADIUS} 0 0 1 -${RADIUS} ${RADIUS}h-${side}a${RADIUS} ${RADIUS} 0 0 1 -${RADIUS} -${RADIUS}` +
    `v-${side}a${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} -${RADIUS}z`
  );
}

/**
 * A dot-matrix history: one column per sample, newest on the right. The dots of each colour are one
 * path in one `Svg`, so a chart that changes every second draws a few shapes instead of a hundred
 * views on an old iPhone. It does not animate and re-renders only when its series change.
 */
export const DotChart = memo(function DotChart({ series, empty }: DotChartProps) {
  const totalRows = series.reduce((sum, band) => sum + band.rows, 0);
  const bandGap = series.length > 1 ? PITCH / 2 : 0;
  const height = totalRows * PITCH - GAP + (series.length - 1) * bandGap;
  // The path of each colour, keyed by colour and opacity.
  const paths = new Map<string, { fill: string; opacity: number; d: string }>();
  let top = 0;
  for (const band of series) {
    band.values.forEach((value, column) => {
      const filled = filledRows(value, band.rows);
      for (let row = 0; row < band.rows; row += 1) {
        const on = band.rows - row <= filled && value !== null;
        const fill = on ? band.colorOf(value) : empty;
        const opacity = on ? 1 : 0.22;
        const key = `${fill}|${opacity}`;
        const path = paths.get(key) ?? { fill, opacity, d: "" };
        path.d += dotPath(column * PITCH, top + row * PITCH);
        paths.set(key, path);
      }
    });
    top += band.rows * PITCH + bandGap;
  }
  return (
    <Svg
      width={DOT_CHART_WIDTH}
      height={height}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[...paths].map(([key, path]) => (
        <Path key={key} d={path.d} fill={path.fill} fillOpacity={path.opacity} />
      ))}
    </Svg>
  );
});
