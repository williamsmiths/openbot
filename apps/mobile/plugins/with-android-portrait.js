const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

// Keeps the Android app upright by default. `orientation` in app.json is "default" so that the iOS
// Info.plist allows landscape for Control computer, which unlocks the orientation at run time with
// expo-screen-orientation. The `initialOrientation` of that module's plugin writes only the iOS
// default, so Android gets its portrait default here. `ScreenOrientation.lockAsync` still overrides it.

/** @type {import('expo/config-plugins').ConfigPlugin} */
module.exports = (config) =>
  withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    activity.$["android:screenOrientation"] = "portrait";
    return config;
  });
