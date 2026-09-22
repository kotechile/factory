import { describe, it, expect, vi, afterEach } from "vitest";
import {
  describeStripeConfig,
  getStripeMode,
  hasStripeEnv,
  isStripeConfigured,
  peekStripeMode,
  resolveStripeMode,
  stripeSecretKey,
  stripeWebhookSecret,
  type StripeMode,
} from "./mode";

// Known-answer vectors for the mode contract. These are the failures that cost real money:
// a deploy that holds a sandbox key in live mode looks healthy while collecting nothing
// (skills/self_improvement_eval.md, 2026-09-11), and a live key on a dev box charges real cards.
const env = (values: Record<string, string>): NodeJS.ProcessEnv => values as NodeJS.ProcessEnv;

const SK_TEST = "sk_test_" + "a".repeat(40);
const SK_LIVE = "sk_live_" + "a".repeat(40);

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.STRIPE_MODE;
  delete process.env.STRIPE_SECRET_KEY_TEST;
  delete process.env.STRIPE_SECRET_KEY_LIVE;
  delete process.env.STRIPE_SECRET_KEY;
});

describe("resolveStripeMode", () => {
  it("accepts test and live", () => {
    expect(resolveStripeMode(env({ STRIPE_MODE: "test" }))).toBe("test");
    expect(resolveStripeMode(env({ STRIPE_MODE: "live" }))).toBe("live");
  });

  it("is case/whitespace tolerant", () => {
    expect(resolveStripeMode(env({ STRIPE_MODE: " LIVE " }))).toBe("live");
  });

  it("throws when unset rather than inferring a mode", () => {
    expect(() => resolveStripeMode(env({}))).toThrow(/STRIPE_MODE is not set/);
  });

  it("throws on an unknown mode", () => {
    expect(() => resolveStripeMode(env({ STRIPE_MODE: "sandbox" }))).toThrow(/invalid/);
  });
});

describe("stripeSecretKey", () => {
  it("returns the mode's own slot", () => {
    expect(stripeSecretKey(env({ STRIPE_MODE: "test", STRIPE_SECRET_KEY_TEST: SK_TEST }))).toBe(SK_TEST);
    expect(stripeSecretKey(env({ STRIPE_MODE: "live", STRIPE_SECRET_KEY_LIVE: SK_LIVE }))).toBe(SK_LIVE);
  });

  it("prefers the mode slot over the legacy slot", () => {
    const key = stripeSecretKey(
      env({ STRIPE_MODE: "live", STRIPE_SECRET_KEY_LIVE: SK_LIVE, STRIPE_SECRET_KEY: SK_TEST }),
    );
    expect(key).toBe(SK_LIVE);
  });

  it("falls back to a prefix-matching legacy key with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(stripeSecretKey(env({ STRIPE_MODE: "test", STRIPE_SECRET_KEY: SK_TEST }))).toBe(SK_TEST);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("legacy STRIPE_SECRET_KEY"));
  });

  it("refuses a sandbox legacy key in live mode", () => {
    expect(() => stripeSecretKey(env({ STRIPE_MODE: "live", STRIPE_SECRET_KEY: SK_TEST }))).toThrow(
      /sk_test_… key — expected sk_live_…/,
    );
  });

  it("refuses a live key in the test slot", () => {
    expect(() => stripeSecretKey(env({ STRIPE_MODE: "test", STRIPE_SECRET_KEY_TEST: SK_LIVE }))).toThrow(
      /STRIPE_SECRET_KEY_TEST/,
    );
  });

  it("throws when the mode's slot is empty", () => {
    expect(() => stripeSecretKey(env({ STRIPE_MODE: "live" }))).toThrow(/STRIPE_SECRET_KEY_LIVE is empty/);
  });

  it("does not echo an unrecognised key", () => {
    const bogus = "not-a-stripe-key-1234567890";
    expect(() => stripeSecretKey(env({ STRIPE_MODE: "live", STRIPE_SECRET_KEY_LIVE: bogus }))).toThrow(
      /unrecognised/,
    );
    try {
      stripeSecretKey(env({ STRIPE_MODE: "live", STRIPE_SECRET_KEY_LIVE: bogus }));
    } catch (err) {
      expect((err as Error).message).not.toContain(bogus);
    }
  });
});

describe("stripeWebhookSecret", () => {
  it("returns the mode-paired secret", () => {
    expect(
      stripeWebhookSecret(env({ STRIPE_MODE: "live", STRIPE_WEBHOOK_SECRET_LIVE: "whsec_live" })),
    ).toBe("whsec_live");
  });

  it("is undefined when nothing is configured", () => {
    expect(stripeWebhookSecret(env({ STRIPE_MODE: "test" }))).toBeUndefined();
  });

  it("warns when it has to use the legacy secret", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(stripeWebhookSecret(env({ STRIPE_MODE: "test", STRIPE_WEBHOOK_SECRET: "whsec_legacy" }))).toBe(
      "whsec_legacy",
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("STRIPE_WEBHOOK_SECRET_TEST"));
  });
});

describe("isStripeConfigured / hasStripeEnv", () => {
  it("reports unconfigured when the environment has no Stripe env at all", () => {
    expect(hasStripeEnv(env({}))).toBe(false);
    expect(isStripeConfigured(env({}))).toBe(false);
  });

  it("is true only for a usable mode + key pair", () => {
    expect(isStripeConfigured(env({ STRIPE_MODE: "test", STRIPE_SECRET_KEY_TEST: SK_TEST }))).toBe(true);
  });

  it("reports false (loudly, without throwing) when the mode is unset but keys exist", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(isStripeConfigured(env({ STRIPE_SECRET_KEY: SK_TEST }))).toBe(false);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("STRIPE_MODE is not set"));
  });

  it("reports false when mode and key disagree", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(isStripeConfigured(env({ STRIPE_MODE: "live", STRIPE_SECRET_KEY_LIVE: SK_TEST }))).toBe(false);
  });
});

describe("getStripeMode / peekStripeMode / describeStripeConfig", () => {
  it("getStripeMode reads the live process env", () => {
    process.env.STRIPE_MODE = "live";
    expect(getStripeMode()).toBe("live" satisfies StripeMode);
  });

  it("peekStripeMode never throws", () => {
    expect(peekStripeMode(env({}))).toBe("unset");
    expect(peekStripeMode(env({ STRIPE_MODE: "nonsense" }))).toBe("unset");
  });

  it("describeStripeConfig reports provenance without key material", () => {
    const described = describeStripeConfig(
      env({ STRIPE_MODE: "live", STRIPE_SECRET_KEY_LIVE: SK_LIVE, STRIPE_WEBHOOK_SECRET: "whsec_legacy" }),
    );
    expect(described).toEqual({
      mode: "live",
      secretKey: "mode-specific",
      webhookSecret: "legacy",
    });
    expect(JSON.stringify(described)).not.toContain("sk_live");
  });
});
