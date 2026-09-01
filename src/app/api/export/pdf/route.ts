import { NextRequest, NextResponse } from "next/server";
import {
  calculateSelfEmployment2026,
  type SelfEmployment2026Input,
} from "@/lib/calc/selfEmployment2026";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      input,
      sessionId,
      userId,
    }: {
      input: SelfEmployment2026Input;
      sessionId?: string;
      userId?: string;
    } = body;

    if (!input || typeof input.grossIncome !== "number") {
      return NextResponse.json(
        { error: "Invalid tax parameters provided." },
        { status: 400 },
      );
    }

    let isEntitled = false;

    // 1. Check server-side Supabase purchase / subscription entitlement.
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createAdminClient();

      try {
        if (userId) {
          const { data: sub, error: subErr } = await supabase
            .from("subscriptions")
            .select("status, plan")
            .eq("user_id", userId)
            .eq("status", "active")
            .single();
          // PGRST116 = "no row found" (normal) — any other code is a real failure.
          if (subErr && subErr.code !== "PGRST116") throw subErr;
          if (sub) isEntitled = true;
        }

        if (!isEntitled && sessionId) {
          const { data: purchase, error: purchaseErr } = await supabase
            .from("purchases")
            .select("status")
            .eq("id", sessionId)
            .eq("status", "completed")
            .single();
          if (purchaseErr && purchaseErr.code !== "PGRST116") throw purchaseErr;
          if (purchase) isEntitled = true;
        }
      } catch (dbErr) {
        const message = dbErr instanceof Error ? dbErr.message : "unknown database error";
        console.error("Entitlement check failed:", dbErr);
        // No silent fallback: surface the failure instead of denying a paying user.
        return NextResponse.json(
          { error: `Entitlement verification failed — please retry. (${message})` },
          { status: 500 },
        );
      }
    }

    // 2. Dev/test-only bypass — never in production, and never for real Stripe IDs.
    if (
      process.env.NODE_ENV !== "production" &&
      sessionId &&
      (sessionId.startsWith("simulated_") || sessionId.startsWith("test_"))
    ) {
      isEntitled = true;
    }

    if (!isEntitled) {
      return NextResponse.json(
        {
          error:
            "Export Gated: Active subscription or one-off audit export purchase ($9.00) required to export official PDF report.",
          gateRequired: true,
          priceUsd: 9.0,
        },
        { status: 402 },
      );
    }

    // Deterministic calculation
    const calc = calculateSelfEmployment2026(input);

    return NextResponse.json({
      success: true,
      reportTitle: "2026 Self-Employment & QBI Tax Readiness Audit Report",
      generatedAt: new Date().toISOString(),
      governingLaw: calc.governingLaw,
      complianceBadge: "OBBBA Pub. L. 119-21 & Rev. Proc. 2025-32 Certified",
      data: calc,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PDF export generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
