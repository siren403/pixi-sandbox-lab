#!/usr/bin/env bun

import { $ } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.env.MISE_PROJECT_ROOT ?? process.cwd();
const localBrowsers = join(root, "node_modules", "playwright-core", ".local-browsers");
const playwrightBin = join(root, "node_modules", ".bin", "playwright");

function usage(exitCode = 1): never {
  const text = `Usage:
  mise run setup-browser
  mise run check-browser

Direct script usage:
  bun scripts/harness/browser-env.ts setup
  bun scripts/harness/browser-env.ts check`;

  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${text}\n`);
  process.exit(exitCode);
}

function info(message: string): void {
  console.log(`[browser-env] ${message}`);
}

async function run(command: string): Promise<void> {
  info(`$ ${command}`);
  const result = await $`bash -lc ${command}`.nothrow();
  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

async function setup(): Promise<void> {
  await run("bun install");
  await run("PLAYWRIGHT_BROWSERS_PATH=0 bunx playwright install chromium");

  if (!existsSync(playwrightBin)) {
    console.error(`[browser-env] missing Playwright binary: ${playwrightBin}`);
    process.exit(1);
  }

  await run("sudo ./node_modules/.bin/playwright install-deps chromium");
  await check();
}

async function check(): Promise<void> {
  if (!existsSync(join(root, "node_modules"))) {
    console.error("[browser-env] node_modules missing; run mise run setup-browser");
    process.exit(1);
  }

  if (!existsSync(playwrightBin)) {
    console.error("[browser-env] @playwright/test is not installed; run bun install");
    process.exit(1);
  }

  if (!existsSync(localBrowsers)) {
    console.error("[browser-env] project-local Playwright browsers missing; run bun run pw:install");
    process.exit(1);
  }

  await run(
    "PLAYWRIGHT_BROWSERS_PATH=0 bunx playwright --version && " +
      "PLAYWRIGHT_BROWSERS_PATH=0 bun -e \"const { chromium } = require('playwright'); const browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); await page.goto('about:blank'); await browser.close(); console.log('headless chromium launch ok');\"",
  );
}

const command = process.argv[2];

switch (command) {
  case "setup":
    await setup();
    break;
  case "check":
    await check();
    break;
  case "-h":
  case "--help":
    usage(0);
    break;
  default:
    usage(1);
}
