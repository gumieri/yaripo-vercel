import { config } from "dotenv"
config({ path: ".env.local", override: true })

import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    testTimeout: 15_000,
    hookTimeout: 10_000,
    fileParallelism: false,
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
