---
name: BloxPVP Vite proxy routing
description: Vite proxy rules that conflict with React Router SPA routes, and the admin rank-based access pattern
---

# Vite Proxy vs React Router conflict

**Rule:** Never add a top-level frontend route (e.g. `/admin`) to the Vite proxy in `Frontend/vite.config.js`. The proxy intercepts the browser GET request before Vite can serve `index.html`, so the backend receives the request and returns a JSON error instead of the React page.

**Why:** Vite's dev-server proxy does prefix matching. `/admin` matches `/admin`, `/admin/stats`, `/admin/users`, etc. If `/admin` is proxied, navigating to `/admin` in the browser hits the backend, not React Router.

**How to apply:** Only proxy specific API sub-paths, never the SPA page path:
- ✅ `/admin/stats`, `/admin/users`, `/admin/set-balance`, `/admin/set-rank`
- ❌ `/admin` (conflicts with the React Router page at `/admin`)

# Admin access check pattern

The admin button/page uses `userData.rank === "ADMIN"` (not username comparison). The username stored from Roblox API has proper casing (e.g. "Ceezyxyt") while the check might be lowercase — rank comparison is case-safe and scales to multiple admins.
