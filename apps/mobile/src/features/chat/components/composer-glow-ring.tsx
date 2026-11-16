import { BlurMask, Canvas, Group, RoundedRect, SweepGradient, vec } from "@shopify/react-native-skia";
import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { useReducedMotion } from "@/shared/lib/motion";

// One turn of the light around the message box, as on the desktop (composer-glow.css).
const TURN_MS = 8000;
const RING_WIDTH = 1.5;
// The inner glow: a wider stroke, blurred, that the card clips to its inside.
const GLOW_WIDTH = 6;
const GLOW_BLUR = 7;

/**
 * The light that turns around the chat composer: two lights of the main color on a thin ring, with a soft
 * glow inside the edge. Decorative: it takes no touches and nothing reads it. It turns only while
 * the app is in the foreground, the chat screen is focused and motion is not reduced; otherwise the
 * ring stays still.
 * Put it first in the card, which clips it, so the field and the controls draw over it.
 */
export function ComposerGlowRing({ radius, dimmed }: { radius: number; dimmed: boolean }) {
  // The ring follows the main color, as on the desktop (AC-010).
  const [accentValue, lightValue] = useCSSVariable(["--openbot-accent", "--openbot-accent-text"]);
  const accent = String(accentValue);
  const light = String(lightValue);
  const reducedMotion = useReducedMotion();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const size = useSharedValue({ width: 0, height: 0 });
  const turn = useSharedValue(0);
  // A chat under a pushed screen stays mounted: it does not turn while it is out of sight.
  const visible = useIsFocused();
  const turning = foreground && visible && !reducedMotion && !dimmed;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!turning) {
      cancelAnimation(turn);
      return;
    }
    turn.set(withRepeat(withTiming(turn.get() + 360, { duration: TURN_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(turn);
  }, [turn, turning]);

  const width = useDerivedValue(() => Math.max(0, size.get().width - RING_WIDTH));
  const height = useDerivedValue(() => Math.max(0, size.get().height - RING_WIDTH));
  const centre = useDerivedValue(() => vec(size.get().width / 2, size.get().height / 2));
  const transform = useDerivedValue(() => [{ rotate: (turn.get() * Math.PI) / 180 }]);

  // Two lights opposite each other, with a dim run of the main color between them.
  const ringColors = [light, `${accent}38`, `${accent}38`, light, `${accent}38`, `${accent}38`, light];
  const ringPositions = [0, 0.19, 0.31, 0.5, 0.69, 0.81, 1];
  const glowColors = [light, `${accent}00`, `${accent}00`, light, `${accent}00`, `${accent}00`, light];
  const glowPositions = [0, 0.2, 0.3, 0.5, 0.7, 0.8, 1];

  return (
    <Canvas pointerEvents="none" onSize={size} style={{ position: "absolute", inset: 0 }}>
      <Group opacity={dimmed ? 0.35 : 1}>
        <RoundedRect
          x={RING_WIDTH / 2}
          y={RING_WIDTH / 2}
          width={width}
          height={height}
          r={radius - RING_WIDTH / 2}
          style="stroke"
          strokeWidth={GLOW_WIDTH}
          opacity={0.45}
        >
          <SweepGradient
            c={centre}
            origin={centre}
            transform={transform}
            colors={glowColors}
            positions={glowPositions}
          />
          <BlurMask blur={GLOW_BLUR} style="normal" />
        </RoundedRect>
        <RoundedRect
          x={RING_WIDTH / 2}
          y={RING_WIDTH / 2}
          width={width}
          height={height}
          r={radius - RING_WIDTH / 2}
          style="stroke"
          strokeWidth={RING_WIDTH}
        >
          <SweepGradient
            c={centre}
            origin={centre}
            transform={transform}
            colors={ringColors}
            positions={ringPositions}
          />
        </RoundedRect>
      </Group>
    </Canvas>
  );
}
