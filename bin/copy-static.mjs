#!/usr/bin/env node

/**
 * Copy static assets into the standalone directory so the self-contained
 * server can serve them without needing the full .next/ tree.
 *
 * Run after `next build` when output: "standalone" is enabled.
 */

import { cpSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const staticSrc = join(root, ".next", "static");
const staticDest = join(root, ".next", "standalone", ".next", "static");

if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log("  [ok] Static assets copied into standalone directory");
} else {
  console.log("  [!!] No .next/static found — skipping copy");
}

// Copy public/ if it exists
const publicSrc = join(root, "public");
const publicDest = join(root, ".next", "standalone", "public");

if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log("  [ok] Public assets copied into standalone directory");
}
