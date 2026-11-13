#!/bin/bash
# kongCowork: sign the iOS 15.1 build with your free Apple team and install it on the iPhone 6s.
# Run it in Terminal on this Mac, not over SSH: signing needs the login keychain and the Xcode account.
set -euo pipefail
cd ~/Projects/kongcowork/apps/mobile/ios
export DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer PATH=/opt/homebrew/bin:$HOME/.bun-1.4.2/bin:$PATH
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 KONG_IOS_LOCAL=1 EXPO_PUBLIC_OPENBOT_API_URL=https://lab.codanang.com NODE_BINARY=/opt/homebrew/bin/node
DEVICE=6b8313361f1897bf564d797f82c8471945f54cd1
APP="build/dd/Build/Products/Release-iphoneos/kongCowork.app"
echo "Signing for team 3QYK7RF6PB ..."
xcodebuild -workspace kongCowork.xcworkspace -scheme kongCowork -configuration Release \
  -destination "id=$DEVICE" -derivedDataPath build/dd -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=3QYK7RF6PB CODE_SIGN_STYLE=Automatic -quiet
codesign -dv "$APP" 2>&1 | grep -E "Authority=Apple Development|TeamIdentifier" || true
echo "Installing on the iPhone (keep it unlocked) ..."
ios-deploy --id "$DEVICE" --bundle "$APP" --no-wifi
echo "Done. If iOS says the developer is not trusted:"
echo "Settings > General > VPN & Device Management > trust conghuancse@gmail.com, then open kongCowork."
