import { NextResponse } from "next/server";
import { getLinkedInConfig, saveLinkedInConfig } from "@/lib/articles/db";

export async function GET() {
  try {
    const config = await getLinkedInConfig();
    // Return masked access token for security
    const maskedToken = config?.access_token
      ? `${config.access_token.slice(0, 6)}...${config.access_token.slice(-4)}`
      : null;

    return NextResponse.json({
      success: true,
      hasConfig: Boolean(config?.access_token && config?.author_urn),
      author_urn: config?.author_urn || "",
      masked_token: maskedToken,
      is_active: config?.is_active ?? false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load LinkedIn config";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { author_urn, access_token } = body;

    const saved = await saveLinkedInConfig({
      author_urn: author_urn?.trim(),
      access_token: access_token?.trim(),
    });

    return NextResponse.json({
      success: true,
      author_urn: saved.author_urn,
      hasToken: Boolean(saved.access_token),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save LinkedIn config";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
