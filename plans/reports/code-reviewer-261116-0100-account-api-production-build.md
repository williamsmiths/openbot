# Review: account service production build (vite preview) on lab.codanang.com

Date: 2026-11-16. Reviewer: code-reviewer (independent, read-only). No build, restart or config change was made.

## Verdict: BLOCKED

One critical finding is live now. The `/cdn-cgi/` deny in nginx can be bypassed with a raw backslash. The Miniflare Local Explorer (raw SQL on D1, KV/R2 writes, captured logs) is reachable from the internet. The build/preview change itself is correct; the block is on the public exposure that the change says it closes.

## Scope
- `scripts/fork/account-api-production.ts` (new, untracked)
- `~/.local/share/openbot-server/run-account-stack.sh` (diff vs `.bak-before-production-build`)
- `~/.config/systemd/user/openbot-account-api.service` (diff: `ExecStart ... api-production`)
- dncloud `/etc/nginx/sites-available/lab.codanang.com.conf` + `/etc/nginx/snippets/kongcowork-account-proxy.conf`
- Reference: `node_modules/@cloudflare/vite-plugin/dist/index.mjs` (1.65.0), `node_modules/miniflare/dist/src/workers/core/entry.worker.js`, wrangler `cli.js`

## Critical

### C1. nginx `/cdn-cgi/` block bypass with a backslash: Local Explorer is public (LIVE)
Evidence (GET only, 2026-11-16 00:58:42, nginx log on dncloud shows both requests):
```
GET https://lab.codanang.com/cdn-cgi\local/explorer/api   -> 200 application/json {"openapi":"3.0.3","info":{"title":"Local Explorer API"...
GET https://lab.codanang.com/cdn-cgi/local/explorer/api   -> 404 (nginx)
```
Cause:
- nginx matches `location ~ ^/(...|cdn-cgi/)` against the normalized `$uri`. `\` is a normal character on Linux, so `/cdn-cgi\local/...` does not match `cdn-cgi/`.
- `proxy_pass http://kongcowork_account;` (no URI part) sends the raw request line unchanged.
- The plugin builds `new URL(req.url, ...)` (`index.mjs:56404`). The WHATWG parser reads `\` as `/` for `http:`, so the pathname becomes `/cdn-cgi/local/explorer/api`.
- The preview middleware sends every request to `miniflare.dispatchFetch` (`index.mjs:93940-93947`). Miniflare serves the explorer at `entry.worker.js:5307`. The Host/Origin check (`entry.worker.js:5144-5180`) did not stop the request (it returned 200).
- The explorer is on by default: `X_LOCAL_EXPLORER` defaults to `true` (`index.mjs:21997-22000`), and preview passes it in (`index.mjs:93357`). The same applies to `X_LOCAL_OBSERVABILITY` (captured request traces and console logs).

Impact: the explorer has `POST /d1/database/{database_id}/raw` (any SQL on the account DB: users, sessions, memberships), KV/R2 object writes, `/local/observability/query` (Worker logs), and `/local/scheduled`. The same bypass also reaches the trigger handlers `/cdn-cgi\local/scheduled` and `/cdn-cgi\local/email` (`entry.worker.js:5311-5322`; `unsafeTriggerHandlers: true` is hard-coded at `index.mjs:93356`, no env switch) and `/cdn-cgi\local/platform-proxy` (`entry.worker.js:5290`; not tested). Full account takeover and data loss are possible.

Probably also true before this change under `vite dev` (same dispatch path), not confirmed: dev was not running.
Retained nginx logs (access.log, .1, .2-.14.gz; log is shared with other sites) have no explorer request other than this review's two probes. Only `/cdn-cgi/trace` scanner hits (03/04/10/14 Nov).

Fix (both, defence in depth):
1. Turn off the explorer at the source. In `run-account-stack.sh`, before `case`:
   ```bash
   export X_LOCAL_EXPLORER=false X_LOCAL_OBSERVABILITY=false
   ```
   (parser accepts only `true`/`false`, `index.mjs:21686-21695`). This does not turn off trigger handlers, so step 2 is still required.
2. nginx: reject any backslash and match `cdn-cgi` case-insensitively and with no trailing slash, on the raw URI. In the `server` block (443), before the `location`s:
   ```nginx
   if ($request_uri ~ "\\\\|%5[cC]") { return 400; }
   if ($request_uri ~* "cdn-cgi|__cf_local") { return 404; }
   ```
   and keep the existing `location ~` block. Then verify with `curl --path-as-is` GET for `/cdn-cgi\local/explorer/api`, `/CDN-CGI/local/explorer/api`, `//cdn-cgi/...`, `/%63dn-cgi/...` (expect 400/404).
3. Restart the account service after step 1 and confirm a local GET `http://127.0.0.1:3110/cdn-cgi/local/explorer/api` returns 404.
4. Because the exposure window cannot be proven closed before log retention, consider: revoke all sessions in D1, and review D1 for unexpected users/memberships.

## High
None in the script itself.

## Medium

### M1. Backslash also bypasses the dotfile block: build manifest is public
`GET https://lab.codanang.com/x\..\.vite/manifest.json -> 200 application/json 296281` (same root cause; `.vite` is in `dist/client`, not in `.assetsignore`). It holds source module paths only, no secrets. The C1 nginx fix closes it. Also remove `dist/client/.vite` after build, or append `.vite` to `apps/auth-api/public/.assetsignore` (the plugin merges it, `index.mjs:93766-93771`).

### M2. Rebuild while the service runs breaks the site
`vite build` empties `dist/` under a running preview. The in-memory Worker refers to the old hashed `/assets/` names; the new build has other names. Pages break until restart. If the build fails half way, each restart (`Restart=always`, `RestartSec=5`) exits 1 at `account-api-production.ts:101/105` and loops with no alert. Procedure: `systemctl --user stop openbot-account-api; run-account-stack.sh api-build; systemctl --user start openbot-account-api`. Write it in the script header or make `api-build` refuse while port `$API_PORT` is in use.

### M3. APNS proxy is lost in preview (latent)
`vite.config.ts:18-20` sets `APNS_ORIGIN` to `/__dev/apns` and `dev-apns-proxy.ts:35` serves it with `configureServer` only. Preview has neither. Now no effect: `APNS_PRIVATE_KEY` is not in the env (not in live `vars`, not in `.dev.vars`). If it is set later, Live Activity updates go straight from workerd to Apple (HTTP/2). Write a guard: fail the preview start when `APNS_PRIVATE_KEY` is set, or port the proxy with `configurePreviewServer`.

## Low

- L1. `developmentLanGuard` (`vite.config.ts:93-107`) is dev only. No regression: with bind `127.0.0.1` + socat, `remoteAddress` was always loopback, so the guard let every public request through before too. It matters only if `OPENBOT_API_HOST=0.0.0.0` is set; then preview has no LAN path filter.
- L2. File modes depend on `umask 077` of the wrapper. The build itself emits `dist/server/.dev.vars` with secrets (`index.mjs:93757-93762`) using the process umask, and `copyFileSync` keeps the source mode until `chmodSync` (`account-api-production.ts:146-147`). Run outside the wrapper, files are 0664 for a short window. `writeFileSync(..., {mode: 0o600})` sets the mode only when the `.tmp` file is new; a stale `.tmp` keeps its old mode. Add `process.umask(0o077)` at the start of `main()`, and `rmSync(tmp, {force:true})` before each write. Current files: all 0600, dirs 0700 (checked).
- L3. Error output: `main().catch` prints `error.message` (`:159`). A `JSON.parse` error on a damaged `wrangler.build.json` can quote a fragment of the file, which holds secret values (`COMPANY_SIGN_IN_SECRET` is a plain var). Print a fixed message for the parse step.
- L4. `.dev.vars` is not stale: each start writes it again or removes it (`:63-74`). When removed, wrangler falls back to `process.env` for declared secrets (`cli.js:191798-191808`), which is the same source. OK.

## Parity: preview vs dev (answers)

| Item | Result | Evidence |
|---|---|---|
| Env construction | Same | `account-api-production.ts:133-137` = `run-development.ts:44-46` |
| Vars | Same values: build `vars` (top-level wrangler.jsonc) + `readLocalRuntimeVars` | script `:110`; dev `vite.config.ts:67` |
| Secrets | Same names/values; via `dist/server/.dev.vars` (6 keys = `secrets.required`). Script skips `encrypted:` values; dev would pass ciphertext | script `:63-74`, `cli.js:191780-191816` |
| EMAIL_RELAY | Dropped, same as dev; `EMAIL_FALLBACK` send_email kept in both | live `services: []` |
| Persistence | Same `apps/auth-api/.wrangler/state/v3` | `index.mjs:92991-92993`, dev `:93243`, preview `:93355` |
| D1/R2 bindings | Same (`DB` openbot-auth, `AVATARS/SKILLS/SITES`) | dist `wrangler.json` |
| Bind | `127.0.0.1:3110` (preview.host defaults to server.host) | vite `node.js:35761`; `ss` shows 127.0.0.1:3110, inspector 127.0.0.1:9229 |
| Host allow-list | Same (`preview.allowedHosts ?? server.allowedHosts`); nginx sends IP Host `10.77.77.2:3110`, Vite allows IPs | vite `node.js:35762`, snippet |
| X-Forwarded-Proto | Same request handler | `index.mjs:56371-56377` |
| Build-time env | None baked; only `import.meta.env.PROD` (analytics, gated to `openbot.run`) | `src/lib/analytics.ts:299-301,314` |
| Lost dev plugins | LAN guard (L1), APNS proxy (M3), dev `/cdn-cgi/local/` middleware (preview dispatches all paths to Miniflare instead) | above |
| Secret files public | No: `wrangler.json`, `wrangler.build.json`, `.dev.vars`, `index.js` are in `dist/server` (not the asset dir) and all returned app 404; `.dev.vars`/`.vite` blocked by nginx except M1 | curl probes |
| Other debug routes | `/__cf_local/stream`, `/__cf_local/imagedelivery` -> app 404 (no bindings). `/CDN-CGI/...` -> app 404 (Miniflare compares case-sensitively). `%5C` -> app 404. Only raw `\` bypasses | curl probes |

## AGENTS.md
- "Redact secrets on every log, export, and send path": the script logs counts only (`:125-127`); see L3. C1 lets anyone read Worker console logs through `/local/observability/query`, which is an unredacted export path.
- Trust boundary rule (Electron sandbox, IPC): not touched.
- "Migrations are irreversible / preserve user data": C1 allows arbitrary SQL on the account DB.
- Effect/test rules: not applicable to an untracked fork ops script.

## Positive
- Atomic tmp + rename for config and `.dev.vars`; `0o600`; dirs 0700.
- Untouched `wrangler.build.json` copy, so each start patches from a clean base (idempotent).
- Secrets removed from `vars` and kept only in `.dev.vars`; same quoting as the plugin (`index.mjs:73541-73560`).
- Signal forward to the child and exit-code pass-through, same as `run-development.ts`.

## Not verified
- Whether `vite dev` had the same bypass (dev not running).
- Whether `/cdn-cgi\local/platform-proxy`, `/local/workers` expose binding values (no POST sent).
- Why the Miniflare Host check passed for Host `10.77.77.2:3110` (result observed, path not traced).

**Status:** DONE_WITH_CONCERNS
**Summary:** Preview keeps parity with dev for vars, secrets, persistence, bind and host checks. A raw-backslash bypass of the nginx `/cdn-cgi/` block makes the Miniflare Local Explorer (raw D1 SQL) public now.
**Concerns/Blockers:** C1 is live: set `X_LOCAL_EXPLORER=false X_LOCAL_OBSERVABILITY=false` and harden nginx against `\` before more public traffic.
