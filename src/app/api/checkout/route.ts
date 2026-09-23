import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { isStripeConfigured } from "@/lib/stripe/mode";
import { activeProductSlugs, isRetiredProduct, products } from "@/products/registry";

/**
 * Plans that belong to a product subpath. These are the ones that used to fall back to a
 * hard-coded product slug; they now require an explicit `app` instead of silently picking one.
 */
const PRODUCT_SCOPED_PLANS = ["cpa_monthly", "pdf_audit_export"];

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
      productName: customProductName,
      productDescription: customProductDescription,
      amount,
      currency = "usd",
      successUrl: customSuccessUrl,
      cancelUrl: customCancelUrl,
      metadata: customMetadata = {},
      lineItems: customLineItems,
    } = body;

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
    const appDisplayName = customProductName || registeredProduct?.name || "Factory Pro";

    const isSubscription = body.mode === "subscription" || plan.includes("monthly") || plan.includes("sub");
    const mode = isSubscription ? "subscription" : "payment";

    let lineItems = customLineItems;
    if (!lineItems) {
      if (isSubscription) {
        lineItems = [
          {
            price_data: {
              currency,
              product_data: {
                name: customProductName || `${appDisplayName} Pro Subscription`,
                description:
                  customProductDescription ||
                  registeredProduct?.description ||
                  "Full access to deterministic tools and export capabilities",
                tax_code: "txcd_10202000",
              },
              unit_amount: amount ?? 2900, // $29/month default
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
              currency,
              product_data: {
                name: customProductName || `${appDisplayName} Report / Export`,
                description:
                  customProductDescription ||
                  registeredProduct?.description ||
                  "Single export of branded report / CSV",
                tax_code: "txcd_10000000",
              },
              unit_amount: amount ?? 900, // $9 one-off default
            },
            quantity: 1,
          },
        ];
      }
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
