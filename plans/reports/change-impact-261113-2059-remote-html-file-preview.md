# CR-001 — Render HTML files in the file panel on a joined server

Type: bug fix (joined-server parity). Classification: UI + IPC payload, no schema, no wire change.

## Problem
Local shared/workspace `.html` files render as a sandboxed page (#1630). On a joined server they show
only source:
- Desktop remote branch (`src/main/ipc/attachment-handlers.ts` previewSharedFile/previewWorkspaceFile
  `remote`) uses `filePreviewFromBytes`: MIME `text/plain`, no `pageUrl`.
- Web client (`web-attachments.ts` previewShared/previewWorkspace) maps `.html` to `text/plain`, and
  `ConversationPanels` sends `pageHtml` only for chat attachments.

## Change
- AC-001: Desktop with a joined server opens a shared or workspace `.html`/`.htm` file ≤ 8 MB → panel
  shows the page in the existing `openbot-visual://preview/…` sandbox, with the raw HTML toggle.
- AC-002: Web client, same file → panel shows the page in the existing sandboxed `srcdoc` frame.
- AC-003: Non-HTML files, files > 8 MB, local path: behavior unchanged.

- AC-004: Mobile opens a shared or workspace `.html` file from a message → existing HTML preview screen.

## Impact
- Trust boundary: no new protocol, no new sandbox rule. Remote bytes reach the same
  `chatVisualResponse` sandbox that remote HTML chat attachments already use. Page store keeps
  generation check, capacity (8) and release on replace/close.
- Team API / contracts: no wire change. New pure helper `filePreviewMimeTypeForName` in contracts.
- Host capability: none needed; host already serves the bytes.
- Mobile: `chat-file-actions.tsx` used `attachmentMimeTypeForName` → `.html` workspace/shared file
  showed source. Now uses `filePreviewMimeTypeForName` → existing `html` preview screen (AC-004).
- Migrations, secrets, i18n: N/A.

## Out of scope
- `features/files/ServerLibrary.tsx` passes no page props (attachment library). Separate follow-up.

## Verification
Focused: `typecheck:node`, `typecheck:renderer`, biome on changed files. Not run: E2E against a real
joined server (needs a second machine/session).

## Review
REV-001 (independent `code-reviewer` agent): PASS_WITH_CONDITIONS. Trust boundary unchanged (same
`chatVisualResponse` sandbox as remote HTML attachments), pages released on every path. Conditions:
(1) Biome `noMisleadingReturnType` at `filePreviewMimeTypeForName` — fixed; (2) mobile parity — fixed.
Open: no E2E artifact for a remote `.html` preview; mobile typecheck not run (repo rule).
