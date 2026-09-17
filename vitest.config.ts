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
  },
});
