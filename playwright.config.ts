import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["**/*.spec.ts", "**/*.e2e.ts"],
  use: {
    baseURL: "http://localhost:8080",
  },
});
