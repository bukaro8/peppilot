import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tests/mocks/server-only.ts", import.meta.url)),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    clearMocks: true,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    sequence: {
      concurrent: false,
    },
  },
});
