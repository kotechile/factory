import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" -> "./src/*" path mapping so modules that import
    // through the alias (e.g. src/lib/webmcp/*) are unit-testable.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "tests/e2e"],
    // The deploy's public origin is configuration (src/lib/site-origin.ts) and Next inlines it at
    // build time; the unit suite needs a value too, and it must be one that can never be mistaken
    // for a live host. Production sets NEXT_PUBLIC_APP_URL in the PaaS environment.
    env: { NEXT_PUBLIC_APP_URL: "https://apps.example.test" },
  },
});
