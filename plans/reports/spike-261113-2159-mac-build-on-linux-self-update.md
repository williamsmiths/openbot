# Spike — build the Mac app on kong-lab (Linux), update on the Mac

Goal: build on kong-lab, Mac app gets it with the Update button. Arch assumed: arm64 (not confirmed by user).

## Result on Linux: works, with workarounds
| Step | Result | Workaround |
|---|---|---|
| Remote desktop runtime darwin-arm64 | OK | `prepare-remote-desktop-runtime.ts darwin arm64` |
| cua-driver darwin-arm64 | OK | `install-cua-driver.ts darwin arm64` |
| Voice runtime darwin-arm64 | OK | `prepare-voice.ts` uses host platform only → npm tarball fetched by hand, SHA-512 matches pin |
| `bun run build` | exit 0 | — |
| `electron-builder --dir --mac --arm64` | exit 0 | (1) `@koromix/koffi-darwin-arm64@3.3.5` not installed by bun on Linux → npm pack, sha512 = bun.lock, extracted to node_modules; (2) fuse step calls `codesign` → `resetAdHocDarwinSignature=false` |
| Bundle | main binary Mach-O arm64; Mac voice/koffi present | also carries Linux extras (remote-desktop linux/x64, koffi-linux-x64) → filter in real script |
| Sign (rcodesign 0.29.0, self-signed cert, hardened runtime) | OK, `verify` no problems | cua-driver excluded (keeps Cua AI signature, same as official `signIgnore`) |
| Entitlements | — | removed `associated-domains` (applinks:openbot.run) + `team-identifier`: need Apple profile, AMFI would kill launch. Cost: openbot.run links open in browser |

Linux state restored after: voice runtime, `build/*/darwin` removed. `node_modules/@koromix/koffi-darwin-arm64` kept (harmless). `out/` rebuilt from working tree.

Test artifact: `~/openbot-mac-test/OpenBot-0.68.0-arm64-local-test.zip` (sha256 77f4f960…). Contains today's uncommitted HTML preview fix.

## Not verified (needs the Mac)
1. App launches (self-signed, Gatekeeper; quarantine must be removed once).
2. Keychain / safeStorage data from the current app: new signer → macOS may ask for keychain access once, or the app may not read old secrets.
3. Squirrel.Mac accepts an update signed by the same self-signed cert (implicit DR = identifier + leaf hash).
4. No `app-update.yml` in a `--dir` build → real setup needs `zip` target + `generic` publish URL on WireGuard.

## Next if launch OK
Script on kong-lab: prepare darwin parts → build → package zip → sign → version bump → `latest-mac.yml` → static feed on 10.77.77.2 (WireGuard only). One manual install, then Update.

## Mac test 1 (22:19) — crash at launch
`DYLD Library missing ... mapping process and mapped file (non-platform) have different Team IDs`.
Cause: hardened runtime → library validation needs one Apple Team ID; self-signed cert has none.
Fix: sign without hardened runtime (fresh bundle; rcodesign keeps old flags on re-sign).

## Build script (22:24)
`~/.local/share/openbot-server/build-mac-local.sh` → `~/openbot-mac-local/OpenBot-<v>-arm64-local.zip`.
Stable cert in `~/.config/openbot-mac-signing/` (0700). Green "preview" icon (Finder icns, no Assets.car,
no CFBundleIconName; Dock image replaced). Linux extras removed. Linux build state restored on exit.
Checked in zip: main + framework flags 0x0, Assets.car absent, dock icon = preview, only koffi-darwin.

## Mac install (22:4x) — launches
- Mac 10.77.77.3, macOS 27.2.1 arm64. Daily app: `~/OpenBot-kong-lab/OpenBot.app` (Nov 12 ad-hoc 0.68.0 build
  from `~/Projects/openbot-mac-build`, already had LSEnvironment → kong-lab). `/Applications/OpenBot.app` = 0.63.0.
- Both Mac DBs at schema_migrations 61 = LATEST in source → this build runs no migration.
- Script now sets LSEnvironment (auth 10.77.77.2:3110, signal :3111). Installed over the daily app; old kept as
  `OpenBot.previous.app`. macOS `codesign --verify --deep --strict` OK. App up (main + 3 helpers), no new crash
  report, TCP to 10.77.77.2:3110 established.
- Still open: sign-in/keychain state on screen, HTML page check, icon look, the Update feed.
