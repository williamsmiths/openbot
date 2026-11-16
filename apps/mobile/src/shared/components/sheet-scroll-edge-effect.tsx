import MaskedView from "@react-native-masked-view/masked-view";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { ProgressiveSheetBlur } from "@/shared/components/progressive-sheet-blur";
import { KONG_LITE } from "@/shared/lib/kong-lite";
import { isIOS } from "@/shared/lib/platform";

interface SheetScrollEdgeEffectProps {
  style: StyleProp<ViewStyle>;
  edge?: "top" | "bottom";
  /** The color under the content: a sheet, or the canvas of a full screen. */
  surface?: "canvas" | "sheet";
  /** In the light build, the surface color covers the whole bar: for a bar that floats over the content. */
  solidBar?: boolean;
}

/** The fade: strong at the edge, gone at the far side. Each entry is an offset and an opacity. */
const FADE_STOPS = [
  [0, 1],
  [0.24, 0.85],
  [0.5, 0.5],
  [0.72, 0.19],
  [0.9, 0.028],
  [1, 0],
] as const;
/**
 * The light build has no blur, so a fade alone leaves the content readable under the bar buttons.
 * The surface color covers the bar fully and fades out only below it.
 */
const SOLID_BAR_STOPS = [
  [0, 1],
  [0.72, 1],
  [0.86, 0.45],
  [1, 0],
] as const;

/**
 * The edge where content scrolls under a bar. Sheets and full screens have the same effect: a
 * progressive blur on iOS, and on Android, which has no cheap blur, a fade into the surface color.
 */
export function SheetScrollEdgeEffect({
  style,
  edge = "top",
  surface = "canvas",
  solidBar = false,
}: SheetScrollEdgeEffectProps) {
  // The light build fades into the surface color, as Android does: six live blurs over a scrolling
  // list cost an A9 phone a frame each time the content moves.
  if (isIOS && !KONG_LITE) return <ProgressiveSheetBlur style={style} edge={edge} surface={surface} />;

  return (
    <View pointerEvents="none" style={style}>
      <MaskedView
        style={{ flex: 1 }}
        maskElement={
          <Svg height="100%" width="100%">
            <Defs>
              <LinearGradient
                id="sheet-scroll-edge-mask"
                x1="0"
                x2="0"
                y1={edge === "top" ? "0" : "1"}
                y2={edge === "top" ? "1" : "0"}
              >
                {(KONG_LITE && solidBar ? SOLID_BAR_STOPS : FADE_STOPS).map(([offset, opacity]) => (
                  <Stop key={offset} offset={offset} stopColor="#000000" stopOpacity={opacity} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect fill="url(#sheet-scroll-edge-mask)" height="100%" width="100%" />
          </Svg>
        }
      >
        <View className={surface === "sheet" ? "flex-1 bg-sheet" : "flex-1 bg-background"} />
      </MaskedView>
    </View>
  );
}
