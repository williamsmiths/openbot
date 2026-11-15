#!/bin/bash
# kongCowork: sign the iOS 15.1 build with your free Apple team and install it on the iPhone 6s.
# Run it in Terminal on this Mac, not over SSH: signing needs the login keychain and the Xcode account.
set -euo pipefail
cd ~/Projects/kongcowork/apps/mobile/ios
export DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer PATH=/opt/homebrew/bin:$HOME/.bun-1.4.2/bin:$PATH
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 KONG_IOS_LOCAL=1 EXPO_PUBLIC_OPENBOT_API_URL=https://lab.codanang.com EXPO_PUBLIC_KONG_DEFAULT_SERVER_NAME=kong-lab EXPO_PUBLIC_KONG_LITE=1 NODE_BINARY=/opt/homebrew/bin/node
DEVICE=6b8313361f1897bf564d797f82c8471945f54cd1
APP="build/dd/Build/Products/Release-iphoneos/kongCowork.app"
# The Team ID is the OU of the "Apple Development" certificate (MAM2NH6X27), not the code in its name.
TEAM="${KONG_TEAM_ID:-MAM2NH6X27}"
# Another xcodebuild on the same derived data locks build.db: wait for it.
while pgrep -f "xcodebuild -workspace kongCowork" >/dev/null; do echo "Waiting for another build ..."; sleep 10; done
echo "Signing for team $TEAM ..."
xcodebuild -workspace kongCowork.xcworkspace -scheme kongCowork -configuration Release \
  -destination "id=$DEVICE" -derivedDataPath build/dd -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic -quiet
codesign -dv "$APP" 2>&1 | grep -E "Authority=Apple Development|TeamIdentifier" || true
echo "Installing on the iPhone (keep it unlocked) ..."
ios-deploy --id "$DEVICE" --bundle "$APP" --no-wifi
echo "Done. If iOS says the developer is not trusted:"
echo "Settings > General > VPN & Device Management > trust conghuancse@gmail.com, then open kongCowork."
