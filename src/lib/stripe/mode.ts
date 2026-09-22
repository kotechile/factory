/**
 * Stripe mode resolution — the single place that decides whether this deploy talks to
 * Stripe in sandbox (test) or live mode.
 *
 * Why this file exists: the mode is decided by WHICH KEY the process sends, never by the
 * Stripe dashboard toggle (`docs.stripe.com/testing-use-cases`: "Being in a sandbox in the
 * Dashboard doesn't affect your integration code"). A deploy holding a sandbox key looks
 * perfectly healthy — checkout returns a URL, webhooks arrive, rows land in Supabase — while
 * collecting no money. That is exactly how a test-mode key got counted as $161 of real
 * revenue (skills/self_improvement_eval.md, 2026-09-11).
 *
 * Contract (all values live in the deploy env — Coolify, app "Software Factory"):
 *   STRIPE_MODE=test|live                 required whenever any Stripe key is configured
 *   STRIPE_SECRET_KEY_TEST  / _LIVE       sk_test_… / sk_live_…   (mode-paired secret key)
 *   STRIPE_WEBHOOK_SECRET_TEST / _LIVE    whsec_…                 (mode-paired endpoint secret)
 *
 * Switching modes is therefore an env change, not a code change: set STRIPE_MODE=live (and
 * the two _LIVE secrets) to take real money, STRIPE_MODE=test to go back to sandbox. Both
 * key pairs stay configured, so the switch is a single write and reverting is another.
 *
 * The legacy single-slot STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are still honoured, but
 * only when the mode-specific slot is empty AND (for the secret key) the prefix agrees with
 * STRIPE_MODE. A key from the other mode is a hard error, never a warning.
 */

export type StripeMode = "test" | "live";

interface ModeSpec {
  /** Env var holding this mode's secret key (sk_…). */
  secretKeyVar: string;
  /** Env var holding this mode's webhook endpoint signing secret (whsec_…). */
  webhookSecretVar: string;
  /** Prefix every secret key of this mode carries. */
  secretKeyPrefix: string;
  /** Human-readable name used in error messages. */
  label: string;
}

const MODE_SPEC: Record<StripeMode, ModeSpec> = {
  test: {
    secretKeyVar: "STRIPE_SECRET_KEY_TEST",
    webhookSecretVar: "STRIPE_WEBHOOK_SECRET_TEST",
    secretKeyPrefix: "sk_test_",
    label: "sandbox (test) mode",
  },
  live: {
    secretKeyVar: "STRIPE_SECRET_KEY_LIVE",
    webhookSecretVar: "STRIPE_WEBHOOK_SECRET_LIVE",
    secretKeyPrefix: "sk_live_",
    label: "live (production) mode",
  },
};

/** Prefixes Stripe issues, so an error can name the key it was handed without echoing it. */
const KNOWN_KEY_PREFIXES = ["sk_test_", "sk_live_", "rk_test_", "rk_live_", "pk_test_", "pk_live_"];

function read(env: NodeJS.ProcessEnv, name: string): string {
  return (env[name] ?? "").trim();
}

function observedPrefix(key: string): string {
  const known = KNOWN_KEY_PREFIXES.find((p) => key.startsWith(p));
  return known ? `${known}…` : "unrecognised";
}

/** True when this environment is configured to talk to Stripe at all (any key or mode var). */
export function hasStripeEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    read(env, "STRIPE_MODE") ||
      read(env, "STRIPE_SECRET_KEY") ||
      read(env, "STRIPE_SECRET_KEY_TEST") ||
      read(env, "STRIPE_SECRET_KEY_LIVE"),
  );
}

/** Non-throwing peek at STRIPE_MODE — for logging and diagnostics only. */
export function peekStripeMode(env: NodeJS.ProcessEnv = process.env): StripeMode | "unset" {
  const raw = read(env, "STRIPE_MODE").toLowerCase();
  return raw === "test" || raw === "live" ? raw : "unset";
}

/**
 * The configured mode. Throws when STRIPE_MODE is missing or invalid: the mode is never
 * inferred from key prefixes, because a wrong inference is a silent wrong-mode charge.
 */
export function resolveStripeMode(env: NodeJS.ProcessEnv = process.env): StripeMode {
  const raw = read(env, "STRIPE_MODE").toLowerCase();
  if (!raw) {
    throw new Error(
      'STRIPE_MODE is not set. Set STRIPE_MODE="test" (sandbox keys) or "live" (production keys) ' +
        "in this environment — the mode is deliberately never inferred from the keys present.",
    );
  }
  if (raw !== "test" && raw !== "live") {
    throw new Error(`STRIPE_MODE="${raw}" is invalid. Use "test" or "live".`);
  }
  return raw;
}

/** Convenience wrapper over {@link resolveStripeMode} for the current process env. */
export function getStripeMode(): StripeMode {
  return resolveStripeMode(process.env);
}

/**
 * This mode's secret key, prefix-validated. Throws if it is missing or belongs to the other
 * mode — the failure the mode split exists to prevent.
 */
export function stripeSecretKey(env: NodeJS.ProcessEnv = process.env): string {
  const mode = resolveStripeMode(env);
  const spec = MODE_SPEC[mode];
  const specific = read(env, spec.secretKeyVar);
  const legacy = read(env, "STRIPE_SECRET_KEY");
  const key = specific || legacy;

  if (!key) {
    throw new Error(
      `STRIPE_MODE=${mode} but ${spec.secretKeyVar} is empty. Add the ${spec.label} secret key ` +
        "to this environment (Coolify → app → Environment Variables).",
    );
  }

  if (!key.startsWith(spec.secretKeyPrefix)) {
    const source = specific ? spec.secretKeyVar : "STRIPE_SECRET_KEY (legacy slot)";
    throw new Error(
      `STRIPE_MODE=${mode} but ${source} holds a ${observedPrefix(key)} key — expected ` +
        `${spec.secretKeyPrefix}…. Refusing to run ${spec.label} against a key from the other mode.`,
    );
  }

  if (!specific && legacy) {
    console.warn(
      `[stripe] STRIPE_MODE=${mode} is running off the legacy STRIPE_SECRET_KEY. ` +
        `Move it to ${spec.secretKeyVar} and delete the legacy slot.`,
    );
  }

  return key;
}

/**
 * This mode's webhook endpoint signing secret, or undefined when unset.
 *
 * Webhook secrets carry no test/live marker in their prefix, so they cannot be validated the
 * way secret keys are — which is precisely why the pair is keyed to STRIPE_MODE. A wrong-mode
 * secret surfaces as a signature-verification failure on inbound events, logged with the mode.
 */
export function stripeWebhookSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const mode = resolveStripeMode(env);
  const spec = MODE_SPEC[mode];
  const specific = read(env, spec.webhookSecretVar);
  const legacy = read(env, "STRIPE_WEBHOOK_SECRET");
  const secret = specific || legacy;

  if (!secret) return undefined;

  if (!specific && legacy) {
    console.warn(
      `[stripe] STRIPE_MODE=${mode} is running off the legacy STRIPE_WEBHOOK_SECRET. Move it to ` +
        `${spec.webhookSecretVar} — a secret registered on the ${mode} events endpoint.`,
    );
  }

  return secret;
}

/**
 * Whether Stripe is usable in this process. Never throws: a misconfiguration is logged
 * explicitly and reported as false, so callers can decide (production refuses to simulate —
 * see /api/checkout) instead of crashing a deterministic calculation that has nothing to do
 * with billing.
 */
export function isStripeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!hasStripeEnv(env)) return false;
  try {
    stripeSecretKey(env);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[stripe] NOT configured for this deploy: ${message}`);
    return false;
  }
}

/** Mode + key provenance, safe to log or return (no key material). */
export function describeStripeConfig(env: NodeJS.ProcessEnv = process.env): {
  mode: StripeMode | "unset";
  secretKey: "mode-specific" | "legacy" | "missing";
  webhookSecret: "mode-specific" | "legacy" | "missing";
} {
  const mode = peekStripeMode(env);
  if (mode === "unset") return { mode, secretKey: "missing", webhookSecret: "missing" };
  const spec = MODE_SPEC[mode];
  const secretKey = read(env, spec.secretKeyVar) ? "mode-specific" : read(env, "STRIPE_SECRET_KEY") ? "legacy" : "missing";
  const webhookSecret = read(env, spec.webhookSecretVar)
    ? "mode-specific"
    : read(env, "STRIPE_WEBHOOK_SECRET")
      ? "legacy"
      : "missing";
  return { mode, secretKey, webhookSecret };
}
