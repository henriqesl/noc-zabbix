import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["**/*.spec.ts", "**/*.e2e.ts"],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://127.0.0.1:8080",
  },
});
