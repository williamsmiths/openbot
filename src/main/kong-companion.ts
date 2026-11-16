// The thin proxy behind `kong-github-v1`: the Team API to the KongCowork companion on this machine.
//
// The companion listens on 127.0.0.1 and wants a bearer token. The host reads the token from
// `~/.config/kc-companion/env` (key `KC_APP_TOKEN`) and adds it itself. The token never goes in a log,
// an error message or an answer. Without the file or the key, the host does not serve the capability.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Effect, Schema } from "effect";
import { causeHelpers } from "../backend/effect-boundary";
import { HttpError } from "./team-api/http-error";

class KongCompanionFailure extends Schema.TaggedError<KongCompanionFailure>()("KongCompanionFailure", {
  cause: Schema.Defect(),
}) {}

const { io } = causeHelpers(KongCompanionFailure);

export const KONG_COMPANION_URL = "http://127.0.0.1:8787";
const TOKEN_KEY = "KC_APP_TOKEN";
const TOKEN_CACHE_MS = 5_000;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_BODY_BYTES = 4 * 1024 * 1024;
/** Statuses of the companion that the caller can act on. Any other failure is a 502. */
const PASSED_STATUSES: ReadonlySet<number> = new Set([400, 404, 409]);

export type KongCompanionCall =
  | { op: "discover"; kind: string; since: string; lang?: string | undefined; page?: number | undefined }
  | { op: "analyses" }
  | { op: "analysis"; repo: string; start?: boolean | undefined; force?: boolean | undefined }
  | { op: "ask"; repo: string; question: string };

/** The value of `key` in a dotenv-style text: `KEY=VALUE` lines, `#` comments, optional quotes. */
export function readDotenvValue(text: string, key: string): string | null {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || match[1] !== key) continue;
    let value = (match[2] ?? "").trim();
    const quote = value[0];
    if (value.length >= 2 && (quote === '"' || quote === "'") && value.endsWith(quote)) value = value.slice(1, -1);
    return value === "" ? null : value;
  }
  return null;
}

function buildRequest(call: KongCompanionCall): { method: "GET" | "POST"; path: string; body?: string } {
  switch (call.op) {
    case "discover": {
      const query = new URLSearchParams({ since: call.since });
      if (call.lang) query.set("lang", call.lang);
      if (call.page !== undefined) query.set("page", String(call.page));
      return { method: "GET", path: `/kc/github/${encodeURIComponent(call.kind)}?${query}` };
    }
    case "analyses":
      return { method: "GET", path: "/kc/github/analyses" };
    case "analysis":
      if (call.start === true)
        return {
          method: "POST",
          path: "/kc/github/analysis",
          body: JSON.stringify({ repo: call.repo, force: call.force === true }),
        };
      return { method: "GET", path: `/kc/github/analysis?${new URLSearchParams({ repo: call.repo })}` };
    case "ask":
      return {
        method: "POST",
        path: "/kc/github/analysis/ask",
        body: JSON.stringify({ repo: call.repo, question: call.question }),
      };
  }
}

export class KongCompanion {
  readonly #envPath: string;
  readonly #baseUrl: string;
  #cached: { token: string | null; at: number } | null = null;

  constructor(envPath: string = join(homedir(), ".config", "kc-companion", "env"), baseUrl = KONG_COMPANION_URL) {
    this.#envPath = envPath;
    this.#baseUrl = baseUrl;
  }

  /** True while the token file holds the key. This is what `#protocolSupport` advertises `kong-github-v1` on. */
  available(): boolean {
    return this.#token() !== null;
  }

  /** The answer of the companion, unchanged. It fails with an `HttpError` that holds no token. */
  call(call: KongCompanionCall): Effect.Effect<object | null, KongCompanionFailure> {
    return this.#call(call);
  }

  #token(): string | null {
    const now = Date.now();
    if (this.#cached && now - this.#cached.at < TOKEN_CACHE_MS) return this.#cached.token;
    let token: string | null = null;
    try {
      token = readDotenvValue(readFileSync(this.#envPath, "utf8"), TOKEN_KEY);
    } catch {
      token = null;
    }
    this.#cached = { token, at: now };
    return token;
  }

  readonly #call = Effect.fn("KongCompanion.call")(function* (this: KongCompanion, call: KongCompanionCall) {
    const token = this.#token();
    if (token === null) return yield* Effect.fail(new KongCompanionFailure({ cause: unavailable() }));
    const request = buildRequest(call);
    return yield* io(async (signal) => {
      let response: Response;
      try {
        response = await fetch(`${this.#baseUrl}${request.path}`, {
          method: request.method,
          redirect: "manual",
          signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
          headers: {
            authorization: `Bearer ${token}`,
            accept: "application/json",
            ...(request.body === undefined ? {} : { "content-type": "application/json" }),
          },
          ...(request.body === undefined ? {} : { body: request.body }),
        });
      } catch {
        // The cause is dropped on purpose: a fetch error can carry the request headers.
        throw new HttpError(502, "The KongCowork companion did not answer.");
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        if (PASSED_STATUSES.has(response.status))
          throw new HttpError(response.status, "The KongCowork companion refused the request.");
        throw new HttpError(502, "The KongCowork companion failed.");
      }
      try {
        const text = await response.text();
        if (text.length > MAX_BODY_BYTES) throw new Error("too large");
        const parsed = JSON.parse(text);
        if (typeof parsed !== "object") throw new Error("not an object");
        return parsed;
      } catch {
        throw new HttpError(502, "The KongCowork companion sent an invalid answer.");
      }
    });
  });
}

function unavailable(): HttpError {
  return new HttpError(502, "The KongCowork companion is not set up on this server.");
}
