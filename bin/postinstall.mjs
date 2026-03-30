#!/usr/bin/env node

/**
 * Post-install script for Claude Pulse.
 *
 * When installed from npm: standalone build is already shipped — just print instructions.
 * When installed from GitHub (git clone + npm install): build if devDeps are available.
 */

import { existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const standaloneServer = join(root, ".next", "standalone", "server.js");

if (existsSync(standaloneServer)) {
  // Pre-built (npm install from registry) — ready to go
  console.log("\n  Claude Pulse installed. Run: claude-pulse init\n");
  process.exit(0);
}

// Not pre-built — try to build (GitHub clone scenario)
const nextBin = join(root, "node_modules", ".bin", "next");

if (!existsSync(nextBin)) {
  console.log("\n  Claude Pulse installed (dashboard not yet built).");
  console.log("  To build the dashboard: cd into the project and run:");
  console.log("    npm install && npm run build && node bin/copy-static.mjs");
  console.log("  Then: claude-pulse init\n");
  process.exit(0);
}

console.log("\n  Building Claude Pulse dashboard (first time only)...\n");
try {
  execSync("npm run build", { cwd: root, stdio: "inherit" });
  execSync("node bin/copy-static.mjs", { cwd: root, stdio: "inherit" });
  console.log("\n  Claude Pulse installed and built. Run: claude-pulse init\n");
} catch {
  console.log("\n  Dashboard build failed — you can build later with: npm run build");
  console.log("  The CLI (claude-pulse init/status/doctor) will work without the dashboard.\n");
}
