import { serializeMcpManifest } from "@/lib/webmcp/manifest";

/**
 * `/.well-known/mcp.json` — the agent-discovery descriptor, SERVED rather than committed.
 *
 * It used to be a file in `public/`, which is why it kept advertising `apps.giniloh.com` after the
 * app moved: a static asset cannot read the deploy's origin, so the origin had to be typed into it.
 * The manifest is derived data (registry + pricing + tool summaries); this route publishes exactly
 * what `serializeMcpManifest()` builds, with `endpoint` on whichever host is serving the request's
 * build. `src/lib/webmcp/manifest.test.ts` asserts this route serves the generator's output, so the
 * published descriptor and the advertised tool list cannot diverge.
 *
 * Static rendering is correct here: the origin is inlined at build time with the rest of the
 * `NEXT_PUBLIC_*` values, and nothing in the manifest is per-request.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(serializeMcpManifest(), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
