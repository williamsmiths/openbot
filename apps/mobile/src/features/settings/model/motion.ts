import { create } from "zustand";
import { KONG_LITE } from "@/shared/lib/kong-lite";

/** Animation choices for this device. Each value is true when the animation plays. */
export interface MotionPreferences {
  /** Off reduces motion in the whole app, as the system Reduce Motion setting does. */
  allAnimations: boolean;
  /** The faces that agent avatars make while they work and rest. */
  agentFaces: boolean;
  /** The message field shrinks to a small bar while the keyboard is closed. */
  composerResize: boolean;
  /** A reply types out and its new words fade in. */
  textReveal: boolean;
  /** Search results and search messages fade in and out with a short blur when they change. */
  searchTransitions: boolean;
}

export type MotionPreference = keyof MotionPreferences;

// kongCowork fork: the light build for old iPhones (`EXPO_PUBLIC_KONG_LITE=1`) starts with every
// animation off except the reply that types out, which plays without the others. Settings >
// Animations turns them on again.
const ANIMATIONS_ON = !KONG_LITE;
const DEFAULTS: MotionPreferences = {
  allAnimations: ANIMATIONS_ON,
  agentFaces: ANIMATIONS_ON,
  composerResize: ANIMATIONS_ON,
  textReveal: true,
  searchTransitions: ANIMATIONS_ON,
};

/** True when the animation stops while `allAnimations` is off. In the light build, the reply still types out. */
export function followsAllAnimations(name: Exclude<MotionPreference, "allAnimations">): boolean {
  return !(KONG_LITE && name === "textReveal");
}
export const MOTION_PREFERENCE_NAMES: readonly MotionPreference[] = [
  "allAnimations",
  "agentFaces",
  "composerResize",
  "textReveal",
  "searchTransitions",
];

export const useMotionPreferences = create<MotionPreferences & { ready: boolean }>(() => ({
  ...DEFAULTS,
  ready: false,
}));

/** Reads the stored value. A missing, damaged or older value keeps the default for each field it lacks. */
export function decodeMotionPreferences(stored: string | null): MotionPreferences {
  let value: unknown = null;
  try {
    value = stored === null ? null : JSON.parse(stored);
  } catch {
    value = null;
  }
  const fields = new Map<string, unknown>(typeof value === "object" && value !== null ? Object.entries(value) : []);
  const preferences = { ...DEFAULTS };
  for (const name of MOTION_PREFERENCE_NAMES) {
    const field = fields.get(name);
    if (typeof field === "boolean") preferences[name] = field;
  }
  return preferences;
}
