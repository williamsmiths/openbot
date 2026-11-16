// kongCowork fork: builds and serves the account service (apps/auth-api) as a production bundle.
//
// `vite dev` makes the page load its CSS and JS from source paths (`/@fs`, `/@id`, `/src`). The
// public proxy (lab.codanang.com) blocks those paths so that it does not expose the source tree, and
// the site showed bare HTML. A build serves hashed files from `/assets/` instead.
//
// The build copies the production `vars` of wrangler.jsonc into `dist/<worker>/wrangler.json`, and
// `vite preview` reads only that file. So each `preview` start writes the same local values that
// vite.config.ts gives `vite dev` (readLocalRuntimeVars), and removes the EMAIL_RELAY service, which
// only production has. The D1, KV and Durable Object state stay in `.wrangler/state`, as with `vite dev`.
//
// Usage (with the environment of run-account-stack.sh): bun scripts/fork/account-api-production.ts build | preview
import { spawn } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readLocalRuntimeVars } from "../../apps/auth-api/src/server/runtime-env";
import {
  developmentChildEnvironment,
  developmentSettingsForService,
  loadDevelopmentEnvironment,
} from "../development-environment";
import { resolvePackageBin } from "../package-bin";

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const apiRoot = join(projectRoot, "apps/auth-api");
const distRoot = join(apiRoot, "dist");
/** The untouched output config of the last build. Each start patches a copy of it. */
const BUILD_CONFIG = "wrangler.build.json";

type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
type JsonObject = { [key: string]: JsonValue };

function readObject(value: JsonValue | undefined): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

/** The names that wrangler.jsonc declares in `secrets.required`. */
function declaredSecrets(config: JsonObject): string[] {
  const required = readObject(config.secrets)?.required;
  return Array.isArray(required) ? required.filter((key): key is string => typeof key === "string") : [];
}

/** The quoting of the Cloudflare plugin for `.dev.vars`: the first quote that the value does not hold. */
function quoteForDotenv(key: string, value: string): string {
  for (const quote of ["'", "`", '"']) if (!value.includes(quote)) return `${quote}${value}${quote}`;
  throw new Error(`Cannot write ${key} to .dev.vars: the value holds every quote character.`);
}

/**
 * `vite dev` reads the declared secrets from the environment at each start. The build writes them to
 * `.dev.vars` only once, so each start writes that file again from the current environment.
 */
function writeLocalSecrets(directory: string, secrets: string[], environment: NodeJS.ProcessEnv): void {
  const lines = secrets
    .filter((key) => environment[key] !== undefined && !environment[key]?.startsWith("encrypted:"))
    .map((key) => `${key}=${quoteForDotenv(key, environment[key] ?? "")}\n`);
  const target = join(directory, ".dev.vars");
  if (lines.length === 0) {
    rmSync(target, { force: true });
    return;
  }
  writeFileSync(`${target}.tmp`, lines.join(""), { mode: 0o600 });
  renameSync(`${target}.tmp`, target);
}

function workerConfigDirectories(): string[] {
  if (!existsSync(distRoot)) return [];
  return readdirSync(distRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(distRoot, entry.name, "wrangler.json")))
    .map((entry) => join(distRoot, entry.name));
}

function run(args: string[], environment: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(resolvePackageBin(projectRoot, "vite"), args, {
      cwd: apiRoot,
      env: environment,
      stdio: "inherit",
    });
    const terminate = () => child.kill("SIGTERM");
    process.once("SIGINT", terminate);
    process.once("SIGTERM", terminate);
    child.once("error", () => resolve(1));
    child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

/** Writes the local runtime values into each output config, from the copy that the build made. */
function writeLocalConfig(environment: NodeJS.ProcessEnv): void {
  const directories = workerConfigDirectories();
  if (directories.length === 0) throw new Error("No build output in apps/auth-api/dist. Run the build first.");
  const localVars = readLocalRuntimeVars(environment);
  for (const directory of directories) {
    const buildConfigPath = join(directory, BUILD_CONFIG);
    if (!existsSync(buildConfigPath)) throw new Error(`Missing ${BUILD_CONFIG} in ${directory}. Run the build again.`);
    const parsed: JsonValue = JSON.parse(readFileSync(buildConfigPath, "utf8"));
    const config = readObject(parsed);
    if (!config) throw new Error(`${buildConfigPath} is not a JSON object. Run the build again.`);
    const secrets = declaredSecrets(config);
    const vars: JsonObject = { ...readObject(config.vars), ...localVars };
    // Wrangler refuses a name that is both a var and a declared secret. Secrets go to `.dev.vars` only.
    for (const key of secrets) delete vars[key];
    config.vars = vars;
    // The same filter as vite.config.ts applies for `vite dev`: no relay Worker runs locally.
    if (Array.isArray(config.services)) {
      config.services = config.services.filter((service) => readObject(service)?.binding !== "EMAIL_RELAY");
    }
    // The file holds secrets (ticket key, SMTP password, sign-in code hashes): owner only.
    const target = join(directory, "wrangler.json");
    const temporary = `${target}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, target);
    writeLocalSecrets(directory, secrets, environment);
  }
  process.stderr.write(
    `Wrote ${Object.keys(localVars).length} local values into ${directories.length} Worker config(s).\n`,
  );
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode !== "build" && mode !== "preview") throw new Error("Choose build or preview.");
  // The build output holds secrets (`.dev.vars`, `wrangler.json`): files and folders for the owner only.
  process.umask(0o077);
  const loaded = await loadDevelopmentEnvironment(projectRoot);
  const environment = developmentChildEnvironment(
    { ...developmentSettingsForService(loaded, "api"), ...process.env },
    "api",
  );
  if (mode === "build") {
    const code = await run(["build"], { ...environment, NODE_OPTIONS: "--max-old-space-size=6144" });
    if (code !== 0) {
      process.exitCode = code;
      return;
    }
    for (const directory of workerConfigDirectories()) {
      const buildConfigPath = join(directory, BUILD_CONFIG);
      copyFileSync(join(directory, "wrangler.json"), buildConfigPath);
      chmodSync(buildConfigPath, 0o600);
    }
    writeLocalConfig(environment);
    return;
  }
  writeLocalConfig(environment);
  const port = environment.OPENBOT_API_PORT ?? "3100";
  process.exitCode = await run(["preview", "--port", port, "--strictPort"], environment);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    // A JSON parse error quotes part of the file, and the config files hold secrets: print only our own errors.
    const message =
      error instanceof Error && !(error instanceof SyntaxError) ? error.message : "Account service command failed.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
