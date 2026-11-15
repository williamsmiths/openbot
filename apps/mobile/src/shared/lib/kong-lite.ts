/**
 * kongCowork fork: the light build for old iPhones (`EXPO_PUBLIC_KONG_LITE=1`). It turns off the parts
 * that an A9 phone on iOS 15 cannot draw smoothly, such as the stacked live blurs under the bars.
 */
export const KONG_LITE = process.env.EXPO_PUBLIC_KONG_LITE === "1";
