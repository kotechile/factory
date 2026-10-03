import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { isStripeConfigured } from "@/lib/stripe/mode";
import { activeProductSlugs, isRetiredProduct, products } from "@/products/registry";
import { agentRateRange } from "@/products/pricing";

/** The metered range for the agent plan's description — never a hardcoded per-call rate. */
const AGENT_RATE_RANGE = agentRateRange();

/**
 * Plans that belong to a product subpath. These are the ones that used to fall back to a
 * hard-coded product slug; they now require an explicit `app` instead of silently picking one.
 */
const PRODUCT_SCOPED_PLANS = ["cpa_monthly", "pdf_audit_export"];

/**
 * Server-side price catalog — the ONLY source of a checkout price.
 *
 * SECURITY (2026-10-03): this route used to read `amount`, `currency`, `lineItems`, `productName`
 * and `successUrl` straight from the request body and pass them to Stripe, so a caller could mint
 * `{plan:"factory_pro", amount:1}` — a $0.01/month subscription on a LIVE account. Prices are now
 * resolved from this table and the client cannot influence them: a client `amount` is ignored and
 * client `lineItems` are rejected (rule 5 — fail loud, never trust a caller-supplied price).
 * See context/pending_approval.md (billing v1, defect D2) and
 * context/recon_proposals/2026-10-03_factory_billing_v1.md §1.
 *
 * A plan whose price is set by `meterPriceEnv` is billed by usage (a pre-created Stripe metered
 * Price referenced by env). Stripe's Checkout does not accept an inline metered `price_data`
 * (`recurring` exposes only `interval`), so a metered tier needs the Price id; when it is absent
 * the request fails explicitly instead of silently charging a flat subscription (defect D3).
 */
interface PlanSpec {
  /** Cents. Ignored when `meterPriceEnv` is set. */
  amount: number;
  mode: "subscription" | "payment";
  name: string;
  description: string;
  taxCode: string;
  /** When set, the plan is metered and billed via the Price id in this env var. */
  meterPriceEnv?: string;
}

const PLAN_CATALOG: Record<string, PlanSpec> = {
  pdf_audit_export: {
    amount: 900,
    mode: "payment",
    name: "Report / Export",
    description: "Single export of branded report / CSV",
    taxCode: "txcd_10000000",
  },
  cpa_monthly: {
    amount: 2900,
    mode: "subscription",
    name: "Pro Subscription",
    description: "Full access to deterministic tools and export capabilities",
    taxCode: "txcd_10202000",
  },
  factory_pro: {
    amount: 2900,
    mode: "subscription",
    name: "Pro Access Pass",
    description: "Unlimited web access, exports, and priority execution across all factory tools",
    taxCode: "txcd_10202000",
  },
  agent_metered: {
    amount: 0,
    mode: "subscription",
    name: "Agent Metered Access",
    description: `Metered agent access across all WebMCP tools ($${AGENT_RATE_RANGE.min.toFixed(2)}–$${AGENT_RATE_RANGE.max.toFixed(2)} per successful call by tool, billed monthly on usage)`,
    taxCode: "txcd_10202000",
    meterPriceEnv: "STRIPE_AGENT_METER_PRICE_ID",
  },
};

/**
 * Resolves the product a checkout session is attributed to.
 *
 * Selling is always product-scoped, so a request that names no product cannot be attributed
 * honestly: the retired-product literal that used to answer it minted receipts titled with a
 * product the directory advertises as retired. Therefore:
 *  - an `app` naming a `killed` registry product is an explicit 400 — never sold, never swapped
 *    for a different product (AGENTS.md rule 5, no silent fallbacks);
 *  - an `app`-less product-scoped plan is an explicit 400 naming what is in inventory;
 *  - other `app`-less plans keep the `factory` directory sentinel they always used.
 * App names that are not registry products stay accepted for caller-supplied white-label flows.
 */
function resolveCheckoutApp(
  plan: string,
  requestedApp: unknown,
): { app: string } | { error: string } {
  if (typeof requestedApp === "string" && requestedApp.trim() !== "") {
    const app = requestedApp.trim();
    if (isRetiredProduct(app)) {
      return {
        error:
          `Product '${app}' is retired and cannot be purchased. ` +
          `Products in inventory: ${activeProductSlugs.join(", ")}.`,
      };
    }
    return { app };
  }

  if (PRODUCT_SCOPED_PLANS.includes(plan)) {
    return {
      error:
        `Plan '${plan}' is product-scoped: send an 'app' naming a product in inventory ` +
        `(${activeProductSlugs.join(", ")}). No product is assumed for this plan.`,
    };
  }

  return { app: "factory" };
}

function getOrigin(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost && !forwardedHost.includes("0.0.0.0") && !forwardedHost.includes("127.0.0.1")) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = req.headers.get("host");
  if (host && !host.includes("0.0.0.0")) {
    const proto = host.includes("localhost") ? "http" : "https";
    return `${proto}://${host}`;
  }

  const reqOrigin = req.nextUrl.origin;
  if (reqOrigin && !reqOrigin.includes("0.0.0.0")) {
    return reqOrigin;
  }

  return "https://apps.giniloh.com";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      plan = "pdf_audit_export",
      userId = "guest_user",
      email,
      app: requestedApp,
      successUrl: customSuccessUrl,
      cancelUrl: customCancelUrl,
      metadata: customMetadata = {},
    } = body;

    // A caller may not hand us its own price (D2). Rejecting `lineItems` outright — rather than
    // ignoring it — is the loud failure the factory rule asks for; nothing in the repo sends it.
    if (body.lineItems !== undefined) {
      return NextResponse.json(
        { error: "Client-supplied 'lineItems' are not accepted. Prices come from the server catalog." },
        { status: 400 },
      );
    }

    const spec = PLAN_CATALOG[plan];
    if (!spec) {
      return NextResponse.json(
        {
          error:
            `Unknown plan '${plan}'. Prices are server-defined; add the plan to PLAN_CATALOG ` +
            `in src/app/api/checkout/route.ts.`,
          plans: Object.keys(PLAN_CATALOG),
        },
        { status: 400 },
      );
    }

    if (body.amount !== undefined) {
      // The client's number is ignored — log it so a stale client is visible without breaking it.
      console.warn(
        `[checkout] ignoring client-supplied amount ${JSON.stringify(body.amount)} for plan '${plan}'; using the server catalog price.`,
      );
    }

    const origin = getOrigin(req);

    // Product attribution is resolved from the registry, never from a literal in this route:
    // a retired product must not be sold, and no product may be silently substituted for it.
    const resolvedApp = resolveCheckoutApp(plan, requestedApp);
    if ("error" in resolvedApp) {
      return NextResponse.json(
        { error: resolvedApp.error, productsInInventory: activeProductSlugs },
        { status: 400 },
      );
    }
    const app = resolvedApp.app;
    const registeredProduct = products.find((p) => p.slug === app);
    const productPrefix = registeredProduct ? `${registeredProduct.name} — ` : "";
    const appDisplayName = registeredProduct?.name || spec.name;

    const mode = spec.mode;

    let lineItems;
    if (spec.meterPriceEnv) {
      // Metered tier: the price (and its Billing Meter) is created in Stripe and referenced here.
      // No inline price_data is possible for a metered price, and no flat fallback is offered —
      // an unconfigured meter is an explicit failure, not a silent flat charge (D3).
      const meterPriceId = process.env[spec.meterPriceEnv];
      if (!meterPriceId) {
        console.error(
          `[checkout] plan '${plan}' needs ${spec.meterPriceEnv} (a Stripe metered Price id).`,
        );
        return NextResponse.json(
          {
            error:
              `Agent metered billing is not configured: set ${spec.meterPriceEnv} to a Stripe ` +
              `metered Price id (create a Billing Meter + a metered Price). No flat fallback is offered.`,
          },
          { status: 500 },
        );
      }
      lineItems = [{ price: meterPriceId }];
    } else if (mode === "subscription") {
      lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${productPrefix}${spec.name}`,
              description: spec.description,
              tax_code: spec.taxCode,
            },
            unit_amount: spec.amount,
            recurring: {
              interval: "month" as const,
            },
          },
          quantity: 1,
        },
      ];
    } else {
      lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${productPrefix}${spec.name}`,
              description: spec.description,
              tax_code: spec.taxCode,
            },
            unit_amount: spec.amount,
          },
          quantity: 1,
        },
      ];
    }

    const appPath = app === "factory" ? "" : app;
    const resolvedSuccessUrl =
      customSuccessUrl ||
      `${origin}/${appPath}${appPath ? "" : ""}?session_id={CHECKOUT_SESSION_ID}&plan=${plan}&status=success`.replace(
        /\/{2,}\?/g,
        "/?",
      );
    const resolvedCancelUrl =
      customCancelUrl ||
      `${origin}/${appPath}${appPath ? "" : ""}?canceled=true`.replace(/\/{2,}\?/g, "/?");

    const sessionMetadata = {
      plan,
      app,
      appName: appDisplayName,
      ...customMetadata,
    };

    // Mode-aware gate (src/lib/stripe/mode.ts): real session when STRIPE_MODE is set and its
    // key pair is present. A live deploy that has no usable Stripe config must NOT hand back a
    // simulated success — see the production guard below the call.
    if (isStripeConfigured()) {
      const session = await createCheckoutSession({
        userId,
        userEmail: email,
        mode,
        lineItems,
        successUrl: resolvedSuccessUrl,
        cancelUrl: resolvedCancelUrl,
        metadata: sessionMetadata,
      });

      return NextResponse.json({
        url: session.url,
        sessionId: session.id,
      });
    }

    // Production must never answer a real buyer with a pretend receipt: if a live deploy has no
    // usable Stripe configuration the request fails loudly instead of redirecting to a
    // simulated session that grants nothing (AGENTS.md rule 5 — no silent fallbacks).
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[checkout] Stripe is not configured for this deploy (STRIPE_MODE + its key pair). " +
          "Refusing to issue a simulated checkout in production.",
      );
      return NextResponse.json(
        { error: "Payments are not configured on this deploy. Please contact support." },
        { status: 500 },
      );
    }

    // Local dev without Stripe keys: immediate simulated checkout link.
    const simulatedSessionId = `simulated_${plan}_${Date.now()}`;
    const simulatedUrl = resolvedSuccessUrl.replace("{CHECKOUT_SESSION_ID}", simulatedSessionId);

    return NextResponse.json({
      url: simulatedUrl,
      sessionId: simulatedSessionId,
      simulated: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
