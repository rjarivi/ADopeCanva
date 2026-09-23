# Contributing to AdopeCanva

AdopeCanva is a 100% client-side tool suite. Contributions come in **two lanes** —
pick the lightest one that solves your problem.

## Lane 1 — Recipes (merge fast, no component code)

Most "new tool" requests are presets, not apps: an FFmpeg command, an image
conversion setting, a resize profile. Those belong in `recipes/` as **JSON only**.

1. Copy an existing file in `recipes/` (see `recipes/README.md` for the schema).
2. Validate: `npm run audit:permissions` (also validates recipes).
3. Open a PR with the `tool-request` template. If CI is green, these merge quickly.

Prefer recipes. If your idea needs custom UI or a new engine, use Lane 2.

## Lane 2 — Code tools (SDK + CI + human review)

New components live in `tools/<tool-id>/` — never in `views/`:

```
tools/<tool-id>/
  manifest.json   # id, title, category, faqs, specs, permissions (see schema below)
  index.tsx       # default-exported component (lazy-loaded by the shell)
  README.md       # what it does, limits, sample files (optional but loved)
```

**Do not edit the shell.** `views/Dashboard.tsx`, `App.tsx`, `index.html`,
`vite.config.ts`, `package.json`, analytics, and CSP are maintainer-only.
CI (`scripts/scope-guard.mjs`) fails PRs that touch them — split shell changes
into a separate proposal and discuss it in an issue first.

### Workflow

```bash
npm install
npm run new:tool -- --id=my-tool --title="My Tool" --category=image
# fill in tools/my-tool/manifest.json + index.tsx
npm run registry:build   # regenerate registry + sitemap (also runs on prebuild)
npm run audit:permissions
npm run audit:tools      # typecheck + static checks
npm run build
```

Then open a PR **from a fork**, sign off your commits (`git commit -s` — DCO),
and fill in the PR template checklist.

### Tool rules (enforced by CI where possible)

- Build the upload state with `<ToolShell>` (standard header + uploader +
  4-feature grid) and file state with `useToolFile()` (handles URL cleanup).
- Declare capabilities in `manifest.json → permissions`:
  `file`, `canvas`, `download`, `ffmpeg` are routine.
  **`network` (any `fetch`/`WebSocket`) and any new npm dependency are a
  separate review tier** — expect questions, and the host allowlist must match
  the CSP. Undeclared network calls fail `audit:permissions`.
- No `eval`, `new Function`, `document.write`, or remote `<script>` injection.
- Every tool gets a stable `toolId` and reports failures via `logToolFailure`
  so breakage shows up on `/health` before users report it.
- `sandbox: true` (manifest) renders the tool in the opaque-origin iframe
  (`/sandbox.html`). New community tools should opt in; graduation to
  first-party rendering is a maintainer decision, never automatic.
- No secrets, keys, or tracking endpoints. Ever. See `SECURITY.md`.
- Changelog entries are generated from manifests at release — don't hand-edit
  `components/Changelog.tsx` in tool PRs.

### What happens after you open a PR

1. CI runs on your fork (untrusted): registry build, typecheck, permission lint,
   scope guard, static audit, production build, bundle budget.
   First-time contributors: a maintainer must approve the workflow run — this
   is normal GitHub protection, not suspicion.
2. You get a **preview deploy** link — reviewers will *use* the tool, not just
   read the diff. Test the error paths (empty file, wrong type, huge file).
3. A maintainer reviews **the diff, not the description**. Tool PRs that edit
   the shell, lockfile, or CSP are out of scope and will be asked to split.
4. Merged tools ship as **first-party code** on adopecanva.com (there is no
   sandbox boundary yet — see `SECURITY.md` for what that implies).

## Maintainer setup checklist (do once, in repo Settings)

- Branch protection on `main`: require PR, require CODEOWNERS review, no direct pushes.
- Require approval for first-time-contributor workflow runs (default on public repos).
- Production deploy (Cloudflare Pages) pinned to `main` only; preview deploys per PR.
- Enable private vulnerability reporting; add deploy keys/tokens as GitHub Secrets only.
- Environment variables (`GEMINI_API_KEY`, `INDEXNOW_KEY`, …) live in the
  Cloudflare dashboard — never in the repo (`.env` is gitignored).

## Code of conduct

Be kind, assume good intent, review code not people. Maintainers may close
PRs that ignore the lanes above after one redirect — it's about throughput,
not gatekeeping.

## License & brand

By contributing you agree your work is licensed under AGPL-3.0 (see
`LICENSE`) — forks and hosted copies must share their source. Keep copyright
notices intact. The AdopeCanva name and logo are trademarks, not covered by
the code license — see `TRADEMARKS.md`.
