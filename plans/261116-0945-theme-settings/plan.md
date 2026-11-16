# Appearance settings page — plan

Owner approved the mockup (`mockup.html`, 2026-11-16) with "Yes, build it". Desktop app and web
client renderer. Mobile is out of scope, except that the iPhone composer ring follows the accent.

## Context
- Built-in palettes already exist (uncommitted owner work): `src/main/built-in-theme-palettes.ts`,
  merged by `AppearanceService.preference`. Palette tokens: `src/renderer/src/theme-palette.ts`.
- Appearance preference flow: `packages/contracts/src/app-appearance.ts` → `src/main/appearance-service.ts`
  → `src/main/ipc/app-inputs.ts` / `app-handlers.ts` → `src/preload/app-decoding.ts` → `src/renderer/src/appearance-choice.ts`
  (+ `chat-background.ts`, `theme-palette.ts`) → `src/renderer/src/preview/mock-openbot.ts`.
- Composer glow: `packages/ui/src/features/conversation/styles/composer-glow.css`, iPhone
  `apps/mobile/src/features/chat/components/composer-glow-ring.tsx`.

## Permission matrix
N/A — a per-computer appearance preference of the local user. No roles, no host data, no Team API.
Joined servers: not a server feature; each client keeps its own look (as theme and fonts today).

## State
Preference fields (all optional on read; a missing or invalid value reads as the default):

| Field | Values | Default |
|---|---|---|
| `accentColor` | `#rrggbb` or null (theme accent) | null |
| `chatWallpaper` | none, glow, glyphs, dots, photo | none |
| `chatWallpaperStrength` | integer 10–100 | 80 |
| `chatWallpaperBlur` | integer 0–30 (px) | 0 |
| `chatGlass` | boolean | false |
| `composerGlow` | turn, still, off | turn |
| `chatWallpaperPhotoVersion` | integer or null (no photo saved) | null |
| `composerGlowGradient` | sunset, ocean, aurora, neon, fire, mint, or null (main colour) | null |
| `transparentWindowLevel` | integer 10–90 (% transparency; 50 = the look before this field) | 50 |

`photo` with no saved photo shows as none.

## API (IPC, app group)
- existing `setAppAppearancePreference` takes the new fields.
- new `pickChatWallpaperPhoto()`: main opens the OS image dialog, resizes to ≤2560 px, saves
  `<userData>/chat-wallpaper.jpg`, sets `chatWallpaper: "photo"`, bumps the version. Cancel = no change.
- new `getChatWallpaperPhoto()`: `data:image/jpeg;base64,…` or null. Preload checks the prefix.

## Acceptance criteria
- AC-001 Settings has an Appearance tab: mode filter, theme cards (System, Dark, Light, every palette), main colour, chat wallpaper, composer glow. The theme select and chat background rows move there from General.
- AC-002 A theme card click changes the whole app at once (existing palette path).
- AC-003 New built-in palettes: Midnight, Deep Teal, Abyss, Slate, Forest, Sky (mockup colours). Ids are permanent.
- AC-004 Main colour: Theme + 6 presets + custom colour (existing colour picker). It overrides the accent tokens over any palette or base theme.
- AC-005 Chat wallpaper None/Glow/Glyphs/Dots/Photo in conversations only, strength and blur sliders, glass switch (bubbles and composer translucent with backdrop blur). Colours follow the accent.
- AC-006 Composer glow Turn/Still/Off. The glow uses only the accent colour (four-colour tokens go). Reduced motion stays still.
- AC-007 The choices survive a restart and show on first paint (localStorage cache as today).
- AC-008 The photo stays on this computer; only main reads the file; the renderer gets a checked data URL.
- AC-009 All new text is i18n keys (English + translations or `untranslated.json`).
- AC-010 iPhone composer ring uses the accent colour only.

## Change 2026-11-16 (owner: "Yes, add them")
- CR-001 Wallpaper sliders did not save: Kobalte never called `onChangeEnd` under Solid 2. Fixed in
  `packages/ui/src/slider.tsx` (the wrapper ends a pointer drag itself). Also fixes MachineResources.
- AC-011 Composer glow colours: "Main colour" (default) + 6 preset gradients. A gradient gives the ring
  its two lights (start at 0°, end at 180°) and the left/right halo. Send keeps the main colour.
  Ids are permanent; an unknown id reads as the main colour.
- AC-012 Transparency slider under "Transparent window" (macOS, only while the switch is on). 10–90 %;
  higher = more of the blurred desktop shows. 50 keeps today's tints. Saves on release (AC-007 cache too).
- AC-013 Both fields: per computer, local only (N/A joined servers / mobile: Mac-only glass, iPhone ring
  keeps AC-010). Old preference files read the defaults. Text through i18n keys (AC-009).

## Spec review
Gate: owner approved the mockup; independent code review after implementation.
- REV-002 (2026-11-16, code-reviewer agent) on CR-001 + AC-011..013: PASS_WITH_CONDITIONS, no high
  findings. Closed: Transparency preview re-syncs after a failed save; coloured bubbles scale with the
  level; a page closed mid-drag drops the drag; a press with no change does not save; SeekSlider ends
  on pointercancel. Verified in the Linux dev app: drag and track click save, press-only does not write,
  gradient click saves, tint 50/90/10 → 40/8/72 % alpha. Preload decoding test 148/148.
