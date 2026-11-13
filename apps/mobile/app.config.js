const { existsSync } = require("node:fs");
const { join } = require("node:path");

// Android notifications come through Firebase Cloud Messaging, which needs the Firebase file of the
// app. The file is optional, so the app builds before the Firebase project exists, and such a build
// gets no notifications on Android. The file has public identifiers only; the account service has the
// key that sends.
const GOOGLE_SERVICES_FILE = "./google-services.json";

// kongCowork fork: `KONG_IOS_LOCAL=1` makes the iOS build that a free Apple team can sign and an
// iPhone on iOS 15 can run. A free team cannot sign push, App Groups or associated domains, so the
// share extension, the widgets, the notification service extension and push are left out. The app
// signs in to the account service named by `EXPO_PUBLIC_OPENBOT_API_URL`.
const LOCAL_IOS_LEFT_OUT = new Set([
  "./plugins/with-rocketsim",
  "./plugins/with-share-target",
  "./plugins/with-notification-service",
  "expo-widgets",
  "expo-notifications",
]);

/** @param {import('expo/config').ExpoConfig} config */
function localIosConfig(config) {
  // Expo refuses a deployment target under 16.4 here, so the build script sets iOS 15.1 in the
  // generated project after `expo prebuild`.
  const plugins = (config.plugins ?? []).filter(
    (plugin) => !LOCAL_IOS_LEFT_OUT.has(Array.isArray(plugin) ? plugin[0] : plugin),
  );
  const { associatedDomains: _associatedDomains, ...ios } = config.ios ?? {};
  return {
    ...config,
    name: "kongCowork",
    plugins,
    ios: {
      ...ios,
      bundleIdentifier: process.env.KONG_IOS_BUNDLE_ID || "com.kongcowork.mobile",
    },
  };
}

/** @param {{ config: import('expo/config').ExpoConfig }} context */
module.exports = ({ config }) => {
  const withGoogle = existsSync(join(__dirname, GOOGLE_SERVICES_FILE))
    ? { ...config, android: { ...config.android, googleServicesFile: GOOGLE_SERVICES_FILE } }
    : config;
  return process.env.KONG_IOS_LOCAL === "1" ? localIosConfig(withGoogle) : withGoogle;
};
