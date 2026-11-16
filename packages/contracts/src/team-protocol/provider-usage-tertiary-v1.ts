// Frozen optional provider-usage-tertiary-v1 wire contract.
//
// What it grants, recorded here because freezing it makes it permanent: a member of a joined server
// can read the third window of each provider sign-in of the host. The released usage route
// (`GET /v1/agents/usage`) and the `usage-changed` event carry two windows per provider (`primary`,
// `secondary`) and leave out the third (`tertiary` in `AccountUsageLimit`): the total of a Cursor
// plan split into Cursor's own models and the others, and the long OpenCode window that `secondary`
// does not hold. No usage limit check reads that window.
//
// `list` answers the third window of each provider's own sign-in that reports one; a provider with
// none is left out, and the accounts after the first are not read here, as on the released usage
// route. The access is that of the released usage route: every member, no admin gate. A provider is
// an open bounded string: a client ignores one it does not know. No credential travels on this route.
import { adminRoute, count, empty, fields, list, nullable, type OptionalRouteCodec, string } from "./admin-wire";

export const PROVIDER_USAGE_TERTIARY_CAPABILITY = "provider-usage-tertiary-v1";

export const PROVIDER_USAGE_TERTIARY_ROUTES = {
  list: "/v1/provider-usage-tertiary/list",
} as const;

const PROVIDER_LIMIT = 64;
const provider = string(PROVIDER_LIMIT);
const finite = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid usage number.");
  return value;
};
const window = fields({ usedPercent: finite, windowDurationMins: nullable(count), resetsAt: nullable(finite) });

export const PROVIDER_USAGE_TERTIARY_CODECS: ReadonlyMap<string, OptionalRouteCodec> = new Map([
  [
    PROVIDER_USAGE_TERTIARY_ROUTES.list,
    adminRoute(empty, fields({ limits: list(fields({ id: provider, tertiary: window }), PROVIDER_LIMIT) })),
  ],
]);
