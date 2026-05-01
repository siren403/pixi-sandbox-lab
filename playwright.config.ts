import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 960, height: 540 },
  },
  projects: [
    {
      name: "desktop-portrait",
      use: { browserName: "chromium", viewport: { width: 540, height: 960 } },
    },
    {
      name: "mobile-portrait",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        viewport: { width: 412, height: 915 },
      },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  },
});
