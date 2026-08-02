import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.ts"],
    exclude: ["node_modules", ".next", "generated"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
