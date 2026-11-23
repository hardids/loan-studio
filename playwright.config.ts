import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: "http://127.0.0.1:4187",
    channel: process.env.CHROME_CHANNEL || undefined,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1340, height: 900 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4187 --strictPort",
    url: "http://127.0.0.1:4187",
    reuseExistingServer: !process.env.CI,
  },
});
