import { describe, expect, it } from "vitest";

import { resolveSiteOrigin, siteHost, siteOrigin, siteUrl } from "./site-origin";

/**
 * The origin rules. These are the only place a product host may be decided, so a regression here is
 * a regression in every absolute URL the app publishes (canonical, sitemap, robots host, agent
 * descriptor, Stripe redirects).
 */
describe("site origin", () => {
  it("accepts an absolute https origin", () => {
    expect(resolveSiteOrigin("https://apps.example.test")).toBe("https://apps.example.test");
  });

  it("strips a trailing slash instead of rejecting it", () => {
    expect(resolveSiteOrigin("https://apps.example.test/")).toBe("https://apps.example.test");
  });

  it("accepts a localhost origin for development", () => {
    expect(resolveSiteOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("rejects a missing origin with an explicit message", () => {
    expect(() => resolveSiteOrigin(undefined)).toThrow(/NEXT_PUBLIC_APP_URL is not set/);
    expect(() => resolveSiteOrigin("")).toThrow(/NEXT_PUBLIC_APP_URL is not set/);
    expect(() => resolveSiteOrigin("   ")).toThrow(/NEXT_PUBLIC_APP_URL is not set/);
  });

  it("rejects anything that is not a bare origin", () => {
    expect(() => resolveSiteOrigin("http://apps.example.test")).toThrow(/absolute https origin/);
    expect(() => resolveSiteOrigin("https://apps.example.test/showcase")).toThrow(/no path/);
    expect(() => resolveSiteOrigin("apps.example.test")).toThrow(/absolute https origin/);
  });

  it("never answers from a host the app does not own", () => {
    // The regression: a literal host that outlives a domain move. In the test run the value is
    // pinned by vitest.config.ts, so this asserts the resolver is the only gate.
    expect(siteOrigin()).toBe(process.env.NEXT_PUBLIC_APP_URL);
  });

  it("derives the host and site-relative URLs from the same origin", () => {
    expect(siteHost()).toBe(siteOrigin().replace(/^https?:\/\//, ""));
    expect(siteUrl("/showcase")).toBe(`${siteOrigin()}/showcase`);
  });

  it("refuses an absolute URL where a site-relative path belongs", () => {
    expect(() => siteUrl("https://elsewhere.test/x")).toThrow(/site-relative/);
    expect(() => siteUrl("//elsewhere.test/x")).toThrow(/site-relative/);
  });
});
