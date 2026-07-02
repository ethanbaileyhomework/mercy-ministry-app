#!/usr/bin/env node
// Runs as a postbuild hook in Vercel CI only.
// Detects which project is building via VERCEL_URL and copies the
// correct app's dist/ to the root dist/ so Vercel can find the output.
const { cpSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

if (!process.env.VERCEL) process.exit(0);

const root = process.cwd();
const url = (process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '').toLowerCase();
const isKiosk = url.includes('kiosk');
const srcDir = join(root, isKiosk ? 'apps/kiosk/dist' : 'apps/admin/dist');
const destDir = join(root, 'dist');

if (!existsSync(srcDir)) {
  console.error(`[copy-vercel-dist] Source not found: ${srcDir}`);
  console.error(`[copy-vercel-dist] VERCEL_URL=${process.env.VERCEL_URL}`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
cpSync(srcDir, destDir, { recursive: true });
console.log(`[copy-vercel-dist] ${srcDir} → ${destDir} (${isKiosk ? 'kiosk' : 'admin'})`);
