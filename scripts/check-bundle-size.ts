#!/usr/bin/env bun

import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const distAssets = join(process.cwd(), "dist", "assets");
const maxJsBytes = Number(process.env.BUNDLE_MAX_JS_BYTES ?? 1_200_000);
const maxGzipBytes = Number(process.env.BUNDLE_MAX_GZIP_BYTES ?? 380_000);

const jsFiles = readdirSync(distAssets).filter((file) => file.endsWith(".js"));

if (jsFiles.length === 0) {
  console.error("[bundle-size] no JavaScript assets found in dist/assets");
  process.exit(1);
}

let totalJsBytes = 0;
let totalGzipBytes = 0;

for (const file of jsFiles) {
  const path = join(distAssets, file);
  const bytes = statSync(path).size;
  const gzipBytes = gzipSync(readFileSync(path)).byteLength;
  totalJsBytes += bytes;
  totalGzipBytes += gzipBytes;
  console.log(`[bundle-size] ${file}: ${formatBytes(bytes)} / gzip ${formatBytes(gzipBytes)}`);
}

console.log(`[bundle-size] total JS: ${formatBytes(totalJsBytes)} / gzip ${formatBytes(totalGzipBytes)}`);
console.log(`[bundle-size] budget: JS <= ${formatBytes(maxJsBytes)}, gzip <= ${formatBytes(maxGzipBytes)}`);

if (totalJsBytes > maxJsBytes || totalGzipBytes > maxGzipBytes) {
  console.error("[bundle-size] bundle budget exceeded");
  process.exit(1);
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} kB`;
}
