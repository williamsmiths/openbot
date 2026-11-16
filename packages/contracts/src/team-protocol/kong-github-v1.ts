// Optional kong-github-v1 wire contract (kongCowork build, not released).
//
// What it grants: an owner or admin of a server reads GitHub Trending and the AI analysis of a GitHub
// repository from the KongCowork companion that runs on the host machine (`127.0.0.1:8787/kc/github/*`,
// `docs/repo-ai-contract.md` of kongcowork-mobile). The host adds the companion token itself, so the
// token never leaves the host. The host passes the companion's own field names through; the codecs keep
// only the fields below. `requireAdmin` on the host is the only gate. A host without the companion does
// not serve the capability.
import { type DynamicRecord, isDynamicRecord, isString } from "../runtime-values";
import {
  adminRoute,
  boolean,
  count,
  empty,
  fields,
  list,
  nullable,
  type OptionalRouteCodec,
  oneOf,
  string,
} from "./admin-wire";

export const KONG_GITHUB_CAPABILITY = "kong-github-v1";

export const KONG_GITHUB_ROUTES = {
  /** A page of trending or new repositories. */
  discover: "/v1/admin/kong/github/discover",
  /** The latest analyses, newest first. */
  analyses: "/v1/admin/kong/github/analyses",
  /** The analysis of one repository; `start` starts it (again with `force`). */
  analysis: "/v1/admin/kong/github/analysis",
  /** A question about an analysed repository. */
  ask: "/v1/admin/kong/github/ask",
} as const;

export type KongTrendKind = "trending" | "new";
export type KongTrendSince = "daily" | "weekly" | "monthly";

export interface KongTrendRepo {
  full_name: string;
  owner: string;
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  /** The stars in the period, on the trending list. */
  period_stars: number;
  url: string;
  avatar: string;
  /** One Vietnamese sentence that the companion writes in the background. Empty until it is written. */
  summary_vi: string;
  /** The overall score, for an analysed repository. */
  score: number | null;
}

export interface KongTrendList {
  kind: string;
  since: string;
  lang: string;
  fetched_at: string;
  /** True while the companion still writes some summaries: read the list again. */
  translating: boolean;
  page: number;
  has_more: boolean;
  repos: KongTrendRepo[];
}

export interface KongAnalysisRow {
  repo: string;
  status: string;
  generated_at: string;
  overall: number | null;
  summary: string;
}

export interface KongNamedNote {
  name: string;
  note: string;
}
export interface KongQuickstartStep {
  step: string;
  cmd: string;
  note: string;
}
export interface KongQuestion {
  id: string;
  question: string;
  answer: string;
  status: string;
  error: string;
}

export interface KongRepoAnalysis {
  repo: string;
  /** none | running | done | error */
  status: string;
  /** While running: queued | fetch | ai */
  stage: string;
  error: string;
  started_at: string;
  generated_at: string;
  facts: {
    full_name: string;
    description: string;
    url: string;
    homepage: string;
    stars: number;
    forks: number;
    open_issues: number;
    language: string;
    license: string;
    pushed_at: string;
    latest_release: string;
  } | null;
  score: {
    overall: number;
    popularity: number;
    freshness: number;
    community: number;
    docs: number;
    releases: number;
  } | null;
  ai: {
    summary: string;
    highlights: string[];
    caveats: string[];
    tech_stack: string[];
    quickstart: KongQuickstartStep[];
    use_cases: string[];
    what_is: string;
    problem_before: string;
    problem_solution: string;
    fit_for: string[];
    not_for: string[];
    how_it_works: string[];
    risks: string[];
    alternatives: KongNamedNote[];
  } | null;
  qa: KongQuestion[];
}

// ---- Wire codecs (host request and client response) ----

const TEXT = 20_000;
const text = nullable(string(TEXT));
const texts = nullable(list(string(TEXT), 50));
const optional = (maximum: number) => nullable(string(maximum));
const looseCount = nullable(count);

const trendRepo = fields(
  { full_name: string(300), owner: string(200), name: string(200) },
  {
    description: text,
    language: optional(200),
    stars: looseCount,
    forks: looseCount,
    period_stars: looseCount,
    url: optional(500),
    avatar: optional(500),
    summary_vi: text,
    score: looseCount,
  },
);
const trendList = fields(
  { repos: list(trendRepo, 100) },
  {
    kind: optional(32),
    since: optional(32),
    lang: optional(64),
    fetched_at: optional(64),
    translating: nullable(boolean),
    page: looseCount,
    has_more: nullable(boolean),
  },
);
const analysisRow = fields(
  { repo: string(300), status: string(32) },
  { generated_at: optional(64), overall: looseCount, summary: text },
);
const facts = fields(
  {},
  {
    full_name: optional(300),
    description: text,
    url: optional(500),
    homepage: optional(500),
    stars: looseCount,
    forks: looseCount,
    open_issues: looseCount,
    language: optional(200),
    license: optional(200),
    pushed_at: optional(64),
    latest_release: optional(200),
  },
);
const score = fields(
  {},
  {
    overall: looseCount,
    popularity: looseCount,
    freshness: looseCount,
    community: looseCount,
    docs: looseCount,
    releases: looseCount,
  },
);
const ai = fields(
  {},
  {
    summary: text,
    highlights: texts,
    caveats: texts,
    tech_stack: texts,
    quickstart: nullable(list(fields({}, { step: text, cmd: text, note: text }), 30)),
    use_cases: texts,
    what_is: text,
    problem_before: text,
    problem_solution: text,
    fit_for: texts,
    not_for: texts,
    how_it_works: texts,
    risks: texts,
    alternatives: nullable(list(fields({}, { name: text, note: text }), 30)),
  },
);
const question = fields({ id: string(200), question: text }, { answer: text, status: optional(32), error: text });
const analysis = fields(
  { repo: string(300), status: string(32) },
  {
    stage: optional(32),
    error: text,
    started_at: optional(64),
    generated_at: optional(64),
    facts: nullable(facts),
    score: nullable(score),
    ai: nullable(ai),
    qa: nullable(list(question, 50)),
  },
);

const repoName = string(300);
const discoverRequest = fields(
  { kind: oneOf("trending", "new"), since: oneOf("daily", "weekly", "monthly") },
  { lang: string(64), page: count },
);
const analysisRequest = fields({ repo: repoName }, { start: boolean, force: boolean });
const askRequest = fields({ repo: repoName, question: string(500) });

export const KONG_GITHUB_CODECS: ReadonlyMap<string, OptionalRouteCodec> = new Map([
  [KONG_GITHUB_ROUTES.discover, adminRoute(discoverRequest, trendList)],
  [KONG_GITHUB_ROUTES.analyses, adminRoute(empty, fields({ analyses: list(analysisRow, 100) }))],
  [KONG_GITHUB_ROUTES.analysis, adminRoute(analysisRequest, analysis)],
  [KONG_GITHUB_ROUTES.ask, adminRoute(askRequest, analysis)],
]);

// ---- Client decoders: they fill an absent field with its empty value ----

type Loose = DynamicRecord;
const recordOf = (value: unknown): Loose => (isDynamicRecord(value) ? value : {});
const str = (value: unknown): string => (isString(value) ? value : "");
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const numOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const strs = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isString) : []);
const records = (value: unknown): Loose[] => (Array.isArray(value) ? value.filter(isDynamicRecord) : []);

function decodeTrendRepo(value: Loose): KongTrendRepo {
  return {
    full_name: str(value.full_name),
    owner: str(value.owner),
    name: str(value.name),
    description: str(value.description),
    language: str(value.language),
    stars: num(value.stars),
    forks: num(value.forks),
    period_stars: num(value.period_stars),
    url: str(value.url),
    avatar: str(value.avatar),
    summary_vi: str(value.summary_vi),
    score: numOrNull(value.score),
  };
}

export function decodeKongTrendList(value: unknown): KongTrendList {
  const list = trendList(value);
  const body = recordOf(list);
  return {
    kind: str(body.kind),
    since: str(body.since),
    lang: str(body.lang),
    fetched_at: str(body.fetched_at),
    translating: body.translating === true,
    page: num(body.page) || 1,
    has_more: body.has_more === true,
    repos: records(body.repos).map(decodeTrendRepo),
  };
}

export function decodeKongAnalysisRows(value: unknown): KongAnalysisRow[] {
  const body = recordOf(fields({ analyses: list(analysisRow, 100) })(value));
  return records(body.analyses).map((row) => ({
    repo: str(row.repo),
    status: str(row.status),
    generated_at: str(row.generated_at),
    overall: numOrNull(row.overall),
    summary: str(row.summary),
  }));
}

export function decodeKongRepoAnalysis(value: unknown): KongRepoAnalysis {
  const body = recordOf(analysis(value));
  const factsValue = isDynamicRecord(body.facts) ? body.facts : null;
  const scoreValue = isDynamicRecord(body.score) ? body.score : null;
  const aiValue = isDynamicRecord(body.ai) ? body.ai : null;
  return {
    repo: str(body.repo),
    status: str(body.status),
    stage: str(body.stage),
    error: str(body.error),
    started_at: str(body.started_at),
    generated_at: str(body.generated_at),
    facts: factsValue
      ? {
          full_name: str(factsValue.full_name),
          description: str(factsValue.description),
          url: str(factsValue.url),
          homepage: str(factsValue.homepage),
          stars: num(factsValue.stars),
          forks: num(factsValue.forks),
          open_issues: num(factsValue.open_issues),
          language: str(factsValue.language),
          license: str(factsValue.license),
          pushed_at: str(factsValue.pushed_at),
          latest_release: str(factsValue.latest_release),
        }
      : null,
    score: scoreValue
      ? {
          overall: num(scoreValue.overall),
          popularity: num(scoreValue.popularity),
          freshness: num(scoreValue.freshness),
          community: num(scoreValue.community),
          docs: num(scoreValue.docs),
          releases: num(scoreValue.releases),
        }
      : null,
    ai: aiValue
      ? {
          summary: str(aiValue.summary),
          highlights: strs(aiValue.highlights),
          caveats: strs(aiValue.caveats),
          tech_stack: strs(aiValue.tech_stack),
          quickstart: records(aiValue.quickstart).map((step) => ({
            step: str(step.step),
            cmd: str(step.cmd),
            note: str(step.note),
          })),
          use_cases: strs(aiValue.use_cases),
          what_is: str(aiValue.what_is),
          problem_before: str(aiValue.problem_before),
          problem_solution: str(aiValue.problem_solution),
          fit_for: strs(aiValue.fit_for),
          not_for: strs(aiValue.not_for),
          how_it_works: strs(aiValue.how_it_works),
          risks: strs(aiValue.risks),
          alternatives: records(aiValue.alternatives).map((item) => ({ name: str(item.name), note: str(item.note) })),
        }
      : null,
    qa: records(body.qa).map((item) => ({
      id: str(item.id),
      question: str(item.question),
      answer: str(item.answer),
      status: str(item.status),
      error: str(item.error),
    })),
  };
}
