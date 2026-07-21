# Daily Bread — Public Website (stjohnsdailybread.org.au)

This folder contains the Daily Bread public website, recovered from the live
Vercel deployment. The original source code was deployed via CLI from an
uncommitted working tree and was never pushed to git — these are the built
production files, preserved here so the site can always be redeployed.

## Contents
- `index.html` — app shell
- `assets/` — the production JS bundle (React SPA) and CSS
- `vercel.json` — routing + caching config. This config fixes the white-screen
  bug: missing assets now 404 instead of returning the SPA HTML fallback,
  hashed assets are cached immutably for a year, and HTML is never cached
  stale.

## Data
The site reads from the shared Supabase project:
- `website_content` table — all page text (editable in the admin app's
  Website Editor tab)
- `get_public_stats()` RPC — live totals (services, people, meals, packs,
  volunteers) shown in the stats section

## TODO
Reconstruct proper source (Vite + React + Tailwind) from the bundle so the
site can be edited again. Until then, treat `assets/` as the source of truth.
