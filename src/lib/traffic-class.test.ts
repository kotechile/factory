import { describe, expect, it } from "vitest";
import {
  AUTOMATED_UA_PATTERN,
  INTERNAL_COOKIE,
  INTERNAL_HEADER,
  classifyTraffic,
  readCookie,
} from "@/lib/traffic-class";

/** A `Headers`-like object from a plain map, so the test does not depend on the fetch runtime. */
function headers(map: Record<string, string>) {
  const lower = new Map(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

describe("internal-traffic marker", () => {
  it("marks an explicit x-factory-internal: 1 header", () => {
    expect(classifyTraffic({ headers: headers({ [INTERNAL_HEADER]: "1" }) })).toBe("internal");
    expect(classifyTraffic({ headers: headers({ [INTERNAL_HEADER]: "TRUE" }) })).toBe("internal");
  });

  it("does not let a falsy or unknown header value claim internal", () => {
    for (const value of ["0", "false", "no", "maybe", ""]) {
      expect(classifyTraffic({ headers: headers({ [INTERNAL_HEADER]: value }) })).toBe("visitor");
    }
  });

  it("marks the internal cookie, alone or beside other cookies", () => {
    expect(classifyTraffic({ cookies: `${INTERNAL_COOKIE}=1` })).toBe("internal");
    expect(
      classifyTraffic({ cookies: `ql_session_id=abc; ${INTERNAL_COOKIE}=1; theme=dark` }),
    ).toBe("internal");
    expect(classifyTraffic({ headers: headers({ cookie: `${INTERNAL_COOKIE}=1` }) })).toBe(
      "internal",
    );
  });

  it("does not confuse a lookalike cookie for the marker", () => {
    expect(classifyTraffic({ cookies: `not_${INTERNAL_COOKIE}=1` })).toBe("visitor");
    expect(classifyTraffic({ cookies: `x${INTERNAL_COOKIE}=1` })).toBe("visitor");
    expect(classifyTraffic({ cookies: `${INTERNAL_COOKIE}=0` })).toBe("visitor");
  });

  it("marks an automated browser UA, which is a harness and never a reader", () => {
    for (const ua of [
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/151.0.0.0 Safari/537.36",
      "Mozilla/5.0 ... Playwright/1.49.0",
    ]) {
      expect(AUTOMATED_UA_PATTERN.test(ua)).toBe(true);
    }
    // Playwright's `devices["Desktop Chrome"]` profile sends an ORDINARY Chrome UA, which is why
    // the suite carries the explicit header (playwright.config.ts) instead of relying on sniffing.
    const desktopChromeUa =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
    expect(classifyTraffic({ headers: headers({ "user-agent": desktopChromeUa }) })).toBe("visitor");
  });

  it("keeps a real browser a visitor — the default must never hide demand", () => {
    const realUa =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
    expect(classifyTraffic({ headers: headers({ "user-agent": realUa }) })).toBe("visitor");
    expect(classifyTraffic({})).toBe("visitor");
  });

  it("reads a cookie value without a cookie parser, and survives malformed input", () => {
    expect(readCookie(`a=1; ${INTERNAL_COOKIE}=%31`, INTERNAL_COOKIE)).toBe("1");
    expect(readCookie("garbage; ; =; b=2", INTERNAL_COOKIE)).toBeNull();
    expect(readCookie(null, INTERNAL_COOKIE)).toBeNull();
  });
});
