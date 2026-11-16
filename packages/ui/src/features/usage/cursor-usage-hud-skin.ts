/**
 * The geometry of the HUD skin: the image that GPT drew from the owner's reference, with every gauge
 * lit (`hud-skin-lit.webp`) and the same image dimmed (`hud-skin-dark.webp`). The HUD draws the lit
 * image and covers each part that is not filled with the dim one, so the shapes are the image's own.
 * Every number here is a pixel of the 1650 × 624 source, measured from it.
 */
export const SKIN = { width: 1650, height: 624 } as const;

/** The 22 cells of the HP bar: the first starts at 640, the last at 1507, each 27 wide. */
const HP_CELL = { firstX: 640, lastX: 1507, width: 27, top: 174, bottom: 273 } as const;

/** The two slanted pool bars: the lit fill runs from x 649 to 1579. */
const POOL_BAR = { startX: 646, endX: 1586, slant: 10 } as const;
export const POOL_BAR_Y = { auto: { top: 327, bottom: 361 }, api: { top: 444, bottom: 478 } } as const;

/** The reactor: its centre, the tick band and the outer arc. */
const RING = { cx: 296, cy: 288, tickInner: 125, tickOuter: 158 } as const;

/** The rectangle of HP cell `index`, from the left. */
export function hpCellRect(index: number, cells: number) {
  const step = (HP_CELL.lastX - HP_CELL.firstX) / (cells - 1);
  return {
    x: HP_CELL.firstX + index * step - 6,
    y: HP_CELL.top,
    width: HP_CELL.width + 12,
    height: HP_CELL.bottom - HP_CELL.top,
  };
}

/** The part of a pool bar from `percent` to its right end, as a polygon that follows the slant. */
export function poolRestPoints(percent: number, bar: { top: number; bottom: number }): string {
  const x = POOL_BAR.startX + ((POOL_BAR.endX - POOL_BAR.startX) * Math.max(0, Math.min(100, percent))) / 100;
  const s = POOL_BAR.slant;
  return `${x + s},${bar.top} ${POOL_BAR.endX + s},${bar.top} ${POOL_BAR.endX - s},${bar.bottom} ${x - s},${bar.bottom}`;
}

/** The part of a pool bar from its left end to `percent`. */
export function poolFillPoints(percent: number, bar: { top: number; bottom: number }): string {
  const x = POOL_BAR.startX + ((POOL_BAR.endX - POOL_BAR.startX) * Math.max(0, Math.min(100, percent))) / 100;
  const s = POOL_BAR.slant;
  return `${POOL_BAR.startX + s},${bar.top} ${x + s},${bar.top} ${x - s},${bar.bottom} ${POOL_BAR.startX - s},${bar.bottom}`;
}

/** A point at `degrees` clockwise from the top of the ring, `radius` from its centre. */
function ringPoint(degrees: number, radius: number): string {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return `${RING.cx + Math.cos(radians) * radius},${RING.cy + Math.sin(radians) * radius}`;
}

/**
 * The tick band from `from` to `to` degrees, clockwise from the top. A half ring is at most 180°, and
 * an empty one is a hair-thin sector, so every path has the same commands and CSS can move between
 * two readings smoothly.
 */
export function tickSectorPath(from: number, rawTo: number): string {
  const to = Math.max(rawTo, from + 0.01);
  const large = to - from > 180 ? 1 : 0;
  const { tickInner: inner, tickOuter: outer } = RING;
  return [
    `M ${ringPoint(from, outer)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${ringPoint(to, outer)}`,
    `L ${ringPoint(to, inner)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${ringPoint(from, inner)}`,
    "Z",
  ].join(" ");
}

/**
 * The unlit part of each half of the tick band. The left half (red to yellow in the image) climbs
 * from the bottom on the left, the right half (green) from the bottom on the right, as level gauges.
 * A half with no reading is all unlit.
 */
export function unlitTickPaths(left: number | null, right: number | null): string {
  const clamp = (percent: number) => Math.max(0, Math.min(100, percent)) / 100;
  const leftLit = left === null ? 0 : clamp(left);
  const rightLit = right === null ? 0 : clamp(right);
  return `${tickSectorPath(180 + 180 * leftLit, 360)} ${tickSectorPath(0, 180 - 180 * rightLit)}`;
}

/** The reactor's outer arc as a box in percent of the skin, for the sweep that turns over it. */
export const RING_BOX = {
  left: ((RING.cx - 180) / SKIN.width) * 100,
  top: ((RING.cy - 180) / SKIN.height) * 100,
  width: (360 / SKIN.width) * 100,
  height: (360 / SKIN.height) * 100,
} as const;

/** Where the HTML text sits on the skin, in percent of its box. */
export const SKIN_TEXT = {
  hp: { left: 37.6, top: 16 },
  reset: { right: 21.5, top: 16 },
  auto: { left: 38.8, top: 62.5 },
  api: { left: 38.8, top: 81.5 },
  core: { left: 17.9, top: 46 },
} as const;
