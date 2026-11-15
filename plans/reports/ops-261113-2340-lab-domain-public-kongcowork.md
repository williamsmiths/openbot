# OPS-001 — lab.codanang.com now serves the kongCowork account service + Signal (2026-11-13 ~23:45)

Decision: user (2026-11-13): turn off the old lab.codanang.com site, use the domain publicly for kongCowork,
Gmail SMTP for sign-in codes, VPS changes allowed.

## Changes
| Where | Change | Rollback |
|---|---|---|
| VPS dncloud | coturn `docker kongcowork-turn` (coturn/coturn:4.6.3, host net, 3478 tcp/udp, relay 49160-49200/udp, private peers denied), conf `/etc/kongcowork-turn/` (0600, shared secret = kong-lab TURN_SHARED_SECRET) | `docker rm -f kongcowork-turn; rm -r /etc/kongcowork-turn` |
| VPS ufw | allow 3478/tcp, 3478/udp, 49160:49200/udp (comment kongCowork TURN) | `ufw delete allow ...` |
| VPS nginx | `sites-available/lab.codanang.com.conf` → account 10.77.77.2:3110, `/v1/signal` → 10.77.77.2:3111 over WireGuard; blocks `/@*`, `/src/`, `/node_modules/`, `/__vite*`, dot paths, `/app`; email sign-in rate limited. New snippet `snippets/kongcowork-account-proxy.conf` | `cp /root/lab.codanang.com.conf.bak-before-kongcowork-openbot /etc/nginx/sites-available/lab.codanang.com.conf && nginx -t && systemctl reload nginx` |
| kong-lab | `run-account-stack.sh`: public URLs (https/wss lab.codanang.com, TURN lab.codanang.com), `AUTH_EXPOSE_DEVELOPMENT_CODE=false`, Gmail SMTP from `~/.config/openbot-server/smtp.env` | `run-account-stack.sh.bak-wireguard`, restart `openbot-account-api/signal` |
| kong-lab | `lab-vps-tunnel.service` (VPS 13100 → :3100 old site) disabled + stopped | `systemctl --user enable --now lab-vps-tunnel` |

## Evidence
- Public: `/v1/me` 401 JSON; `/v1/signal` WebSocket 101; `/src/...`, `/@vite/client`, `/.env`, `/app` 404.
- `POST /v1/auth/email/start` → `email_delivery_not_configured`, no `developmentCode`.
- TURN tcp 3478 reachable from kong-lab on 103.116.38.43.

## Open
- Gmail App Password not set yet → email sign-in off until `smtp.env` exists + `openbot-account-api` restart.
- Not checked: Mac app reconnect after restart (user confirms); a real TURN allocation end-to-end.
- cloudflared still lists stale `lab.codanang.com` ingress rules (DNS points to the VPS, so unused).
- Vite dev server is still what serves the API behind nginx (denylist, not a production build).

## Fixed sign-in codes (CR-003, ~23:55)
- User decision: password-style sign-in, as a fixed 8-char code per email (existing 8-box UI, no app rebuild).
- Code: `AUTH_STATIC_SIGN_IN_CODES` (`email:base64url-sha256`) in apps/auth-api (auth-service, request-auth,
  types, runtime-env). Listed email → challenge holds the fixed hash, no email; unlisted → 503. Any fixed code
  forces `AUTH_EXPOSE_DEVELOPMENT_CODE` off. Malformed entries logged by count only.
- `~/.local/share/openbot-server/set-sign-in-code.sh`: random code by default (shown once), `--choose` optional;
  stores hash only (`sign-in-codes.env` 0600).
- Test (public domain, test email fixed-code-test@example.com, entry removed after): start → no code; wrong →
  invalid_sign_in_code; right → session; other email → 503. A test account now exists in local D1.
- REV-004 (code-reviewer, security): PASS_WITH_CONDITIONS → closed: F1 random code; F2 nginx sets
  `CF-Connecting-IP $remote_addr` + rate limit on /v1/auth/email, /api/browser/email, /v1/mobile-auth/email
  (verified 429 after burst). Also F6 warn, F7 script fixes, F8 dev-code guard. Open (accepted): F3 email
  enumeration via 503 (single-user), F4 lockout by request spam (sessions + QR still work), F5 unsalted hash.
- `bun run typecheck` (apps/auth-api) exit 0; biome clean.

## 2026-11-14 fixes (iPhone could not reach kong-lab)

- coturn on the VPS ignored its config: `/etc/kongcowork-turn/turnserver.conf` was 600 root, the container
  runs as uid 65534 ("Cannot find config file"). Relay ports, realm, auth secret and `denied-peer-ip` did
  not apply. Fix: `chown root:65534`, `chmod 640` the file, `chmod 750` + group 65534 on the folder,
  `docker restart kongcowork-turn`. Checked: relay ports now 49160-49200, relay-to-relay works.
- The server process on kong-lab could not resolve `lab.codanang.com` in WebRTC (error -105), so its
  TURN failed. `run-account-stack.sh` now sets `TURN_HOST=103.116.38.43` (override `OPENBOT_TURN_HOST`).
- Desktop `OPENBOT_REMOTE_SIGNAL_URL` only feeds the CSP; tickets name `wss://lab.codanang.com/v1/signal`.
  The Mac app (LSEnvironment) and `run-server.sh` now use that URL (the server picks it up at next restart).
- Rollback: `chmod 600` the conf restores the old (broken) state; `TURN_HOST=$PUBLIC_HOST` in the script.
- 2026-11-15: coturn ran out of relay ports ("no available ports"): 41 ports (49160-49200) with failed
  attempts holding theirs. Now `max-port=51999` and ufw allows 49160:51999/udp (backup
  `turnserver.conf.bak-ports`). Paperclip (`paperclip.service`) is stopped: its agents filled the
  kong-lab disk with `/tmp/paperclip-ai-*` folders.
