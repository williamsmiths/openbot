import { KONG_GITHUB_CAPABILITY, KONG_GITHUB_ROUTES } from "@openbot/contracts/team-protocol/kong-github-v1";
import { sourceText } from "@openbot/i18n/source";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { KongCompanionCall } from "../kong-companion";
import type { TeamApiKongGithub } from "./dependencies";
import { HttpError } from "./http-error";
import type { RouteOutcome, TeamApiRequestContext } from "./request-context";
import { readJson, requireAdmin } from "./request-helpers";

const ROUTES: ReadonlySet<string> = new Set(Object.values(KONG_GITHUB_ROUTES));

/**
 * `kong-github-v1`: GitHub Trending and the AI analysis of a repository, read through the KongCowork
 * companion on this machine. Admin-only. The body was decoded by the route's codec; the companion
 * answer goes back unchanged and the response codec trims it.
 */
export async function routeKongGithub(
  context: TeamApiRequestContext,
  kongGithub: TeamApiKongGithub | undefined,
): Promise<RouteOutcome> {
  const { method, url, capabilities, member, request, json } = context;
  const path = url.pathname;
  if (method !== "POST" || !ROUTES.has(path)) return "unmatched";
  if (!kongGithub?.available() || !capabilities.has(KONG_GITHUB_CAPABILITY))
    throw new HttpError(400, sourceText("error.team.machineResourcesUnsupported"));
  requireAdmin(member);
  const body = await readJson(request);
  let call: KongCompanionCall;
  if (path === KONG_GITHUB_ROUTES.discover)
    call = {
      op: "discover",
      kind: String(body.kind),
      since: String(body.since),
      ...(typeof body.lang === "string" ? { lang: body.lang } : {}),
      ...(typeof body.page === "number" ? { page: body.page } : {}),
    };
  else if (path === KONG_GITHUB_ROUTES.analyses) call = { op: "analyses" };
  else if (path === KONG_GITHUB_ROUTES.analysis)
    call = { op: "analysis", repo: String(body.repo), start: body.start === true, force: body.force === true };
  else call = { op: "ask", repo: String(body.repo), question: String(body.question) };
  return json(200, await runCauseEffect(kongGithub.call(call)));
}
