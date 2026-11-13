# CR-002 — Rename visible product name to kongCowork, remove the help menu

Type: UI-only change (user text + one rail control). Requested by user 2026-11-13 for their fork.

## Decisions (user)
- Rename **all user-visible text** "OpenBot" → "kongCowork", all 15 catalog languages.
- Remove the help menu button (What's new, Changelog, Guides, Discord, Report a problem, Send feedback).

## Kept unchanged (data, security, released contracts)
- `app.setName("OpenBot")`, `productName`, `appId app.openbot.desktop`: Electron derives userData dir and
  the macOS keychain item "OpenBot Safe Storage" (encrypts sign-in + provider keys) from them. Changing
  them = lost sign-in and API keys on every machine.
- Paths `~/OpenBot/...`, runtime dirs, CLI `openbot`, env `OPENBOT_*`, `openbot-*` schemes, Team API.
- `@OpenBot` (Slack/Discord bot user name, set by the Slack/Discord app) and `OpenBot\` (Windows path).
- External ids: `User-Agent`, 1Password `integrationName`, link client hint.
- Mobile `app.json` name, auth-api landing/email text: not built by user → not in scope.

## Change
- AC-001: no help menu button in the desktop rail and the web client rail.
- AC-002: catalog values show "kongCowork" in place of "OpenBot", except `@OpenBot` and `OpenBot\`.
- AC-003: window titles, notification titles, server default name, app info fallback show kongCowork.
- AC-004: Mac bundle shows kongCowork in Dock / Finder (`CFBundleDisplayName`, bundle file `kongCowork.app`
  in the local build). `CFBundleName` stays OpenBot: Mac test 23:20 crashed `FATAL Unable to find helper app`
  (Electron finds "<CFBundleName> Helper.app"). Menu bar title stays OpenBot. Data folder and keychain unchanged.

## Risks
- Turkish suffixes (`OpenBot'u`) keep their form → minor grammar drift. Polish/Russian may decline; checked.
- Every upstream merge conflicts in catalogs: rename is a script, re-run after merge.
- Not changed: Electron role labels "Hide OpenBot" (Electron fills `app.name`).

## Review
- REV-002 (code-reviewer #1): NEEDS_REVISION. H1 "Shared with OpenBot" renamed (Bitwarden folder / 1Password,
  Proton vault looked up by name) → broke connect; H2 verify-macos-package expected display name OpenBot;
  M1/M2 sign-in wordmark + Settings > Updates literals; M3 fr/it/en grammar; M4 third-party names.
- Fixes: catalogs rebuilt from original (in-place reverse, verified 0 added lines vs HEAD), script rewritten
  (entry keep list, grammar pass), code literals → `PRODUCT_NAME`, verify script expects kongCowork.
- REV-003 (code-reviewer #2): PASS_WITH_CONDITIONS. Kept entries byte-identical, idempotent. Conditions:
  narrow keep list (protect only "Shared with OpenBot" in-pattern), fr cet/nouvel/de le, ko particles,
  `--check` counts changed files. All fixed; `--check` = 0 files; i18n-check exit 0.
- Known, accepted: "Hide OpenBot" (Electron role label from app.name), Linux autostart Name, Windows/Linux
  shortcuts (productName), bot-entry texts keep "OpenBot", cross-version English error text (source matcher).
- Not verified on a Mac yet: Finder / Privacy lists may show bundle file name.
