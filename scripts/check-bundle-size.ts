#!/usr/bin/env bun

import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const distAssets = join(process.cwd(), "dist", "assets");
const maxTotalJsBytes = Number(process.env.BUNDLE_MAX_TOTAL_JS_BYTES ?? 1_250_000);
const maxTotalGzipBytes = Number(process.env.BUNDLE_MAX_TOTAL_GZIP_BYTES ?? 390_000);
const maxChunkBytes = Number(process.env.BUNDLE_MAX_CHUNK_BYTES ?? 1_050_000);
const maxEntryBytes = Number(process.env.BUNDLE_MAX_ENTRY_BYTES ?? 120_000);

type BundleFile = {
  file: string;
  bytes: number;
  gzipBytes: number;
};

const jsFiles = readdirSync(distAssets)
  .filter((file) => file.endsWith(".js"))
  .sort((left, right) => left.localeCompare(right));

if (jsFiles.length === 0) {
  console.error("[bundle-size] no JavaScript assets found in dist/assets");
  process.exit(1);
}

let totalJsBytes = 0;
let totalGzipBytes = 0;
const bundles: BundleFile[] = [];

for (const file of jsFiles) {
  const path = join(distAssets, file);
  const bytes = statSync(path).size;
  const gzipBytes = gzipSync(readFileSync(path)).byteLength;
  totalJsBytes += bytes;
  totalGzipBytes += gzipBytes;
  bundles.push({ file, bytes, gzipBytes });
  console.log(`[bundle-size] ${file}: ${formatBytes(bytes)} / gzip ${formatBytes(gzipBytes)}`);
}

console.log(`[bundle-size] total JS: ${formatBytes(totalJsBytes)} / gzip ${formatBytes(totalGzipBytes)}`);
console.log(
  `[bundle-size] budget: total JS <= ${formatBytes(maxTotalJsBytes)}, total gzip <= ${formatBytes(maxTotalGzipBytes)}, ` +
    `max chunk <= ${formatBytes(maxChunkBytes)}, entry <= ${formatBytes(maxEntryBytes)}`,
);

const entry = bundles.find((bundle) => bundle.file.startsWith("index-") && bundle.file.endsWith(".js"));
const largest = bundles.reduce((current, next) => next.bytes > current.bytes ? next : current, bundles[0]);

if (!entry) {
  console.error("[bundle-size] entry chunk not found");
  process.exit(1);
}

if (
  totalJsBytes > maxTotalJsBytes ||
  totalGzipBytes > maxTotalGzipBytes ||
  largest.bytes > maxChunkBytes ||
  entry.bytes > maxEntryBytes
) {
  console.error("[bundle-size] bundle budget exceeded");
  if (totalJsBytes > maxTotalJsBytes) {
    console.error(`[bundle-size] total JS exceeded: ${formatBytes(totalJsBytes)}`);
  }
  if (totalGzipBytes > maxTotalGzipBytes) {
    console.error(`[bundle-size] total gzip exceeded: ${formatBytes(totalGzipBytes)}`);
  }
  if (largest.bytes > maxChunkBytes) {
    console.error(`[bundle-size] largest chunk exceeded: ${largest.file} ${formatBytes(largest.bytes)}`);
  }
  if (entry.bytes > maxEntryBytes) {
    console.error(`[bundle-size] entry chunk exceeded: ${entry.file} ${formatBytes(entry.bytes)}`);
  }
  process.exit(1);
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} kB`;
}
