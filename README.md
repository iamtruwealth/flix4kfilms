# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Smoke test

`scripts/smoke-test.py` walks the critical public and admin paths in a real
headless Chromium (Playwright) against the **production preview build**, and
fails on any critical assertion or unexpected browser console error.

Run it from the project root:

```bash
npm run smoke   # builds + previews + runs the test
```

Prerequisites (once):

```bash
python3 -m pip install playwright
python3 -m playwright install chromium
```

What it verifies:

1. Public homepage loads
2. GLB camera model asset loads (HTTP 200)
3. Camera / 3D experience initializes (WebGL canvas mounts)
4. LCD/photo experience renders without errors
5. Portfolio navigation is accessible
6. Public portfolio route loads
7. Videos page loads
8. Admin login page loads
9. Protected `/admin` route redirects unauthenticated visitors
10. About + Book pages load
11. Zero unexpected browser console errors

Optional authenticated admin checks run only when credentials are supplied via
the environment (never committed to the repo):

```bash
SMOKE_ADMIN_EMAIL=you@example.com SMOKE_ADMIN_PASSWORD=hunter2 npm run smoke
```

You can also point the test at a live deployment without a local preview
server: `SMOKE_BASE_URL=https://your-site.example npm run smoke`.

The test starts and terminates its own `vite preview` server, so no orphaned
processes are left behind.
