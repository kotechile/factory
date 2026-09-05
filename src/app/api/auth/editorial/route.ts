import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const EDITORIAL_COOKIE_NAME = "pressflow_auth";
const DEFAULT_SECRET = "factory_editorial_2026";

function getExpectedSecret(): string {
  return process.env.EDITORIAL_SECRET || DEFAULT_SECRET;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(EDITORIAL_COOKIE_NAME)?.value;
  const expected = getExpectedSecret();

  const isAuthenticated = Boolean(token && token === expected);
  return NextResponse.json({ authenticated: isAuthenticated });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { passcode } = body;
    const expected = getExpectedSecret();

    if (!passcode || passcode.trim() !== expected.trim()) {
      return NextResponse.json(
        { success: false, error: "Invalid passcode. Access denied." },
        { status: 401 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(EDITORIAL_COOKIE_NAME, expected, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({ success: true, message: "Authenticated successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(EDITORIAL_COOKIE_NAME);
  return NextResponse.json({ success: true, message: "Logged out." });
}
