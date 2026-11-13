kongCowork fork: iOS 15.1 build for an iPhone 6s (iOS 15.8.8), free Apple team, on the Mac (kong@10.77.77.3).
Run on the Mac copy ~/Projects/kongcowork (synced with rsync, without node_modules/.git/secrets):
  1. bun install --frozen-lockfile --filter ./apps/mobile        (bun 1.4.2: ~/.bun-1.4.2)
  2. cd apps/mobile && KONG_IOS_LOCAL=1 EXPO_PUBLIC_OPENBOT_API_URL=https://lab.codanang.com expo prebuild -p ios --no-install
  3. python3 lower-deployment-target.py ~/Projects/kongcowork     (Podfile props, pbxproj, podspecs -> 15.1)
  4. cd ios && pod install
  5. python3 patch-ios16-apis.py ~/Projects/kongcowork            (iOS 16 APIs -> #available fallbacks; idempotent)
  6. sign-and-install-on-iphone.sh  (Terminal on the Mac, Xcode 26.6 signed in; Xcode 27 Swift crashes at 15.1)
Steps 1, 2 and 4 undo the patches; run 3 and 5 again after them. Free team: the app expires after 7 days.
