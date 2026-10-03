# Security Policy

## The model in one paragraph

AdopeCanva runs **entirely in the browser** — there is no backend, no user
accounts, no file storage. The flip side, stated plainly per our open-source
plan: **a single React bundle cannot be made safe by policy alone — any merged
JavaScript runs on the origin.** Until a sandboxed-iframe boundary exists for
community tools, every merged tool is reviewed and shipped as **first-party
code**. That is why tool PRs go through manifest permissions, CI linting, and
human diff review (see `CONTRIBUTING.md`).

## Phase 2 sandbox (experimental, opt-in per tool)

Tools with `"sandbox": true` in `tools/<id>/manifest.json` render inside
`/sandbox.html?tool=<id>` in an `<iframe sandbox="allow-scripts
allow-downloads">` **without** `allow-same-origin`:

- **opaque origin**: no parent DOM, cookies, storage, or parent JS access;
- **narrower CSP** than the main app (no analytics, ads, or secret endpoints);
- **all failure signals** return via `postMessage` and still land in `/health`.

What this does and doesn't mean: the frame contains a tool from a malicious
PR to *its own* origin — it cannot touch adopecanva.com state or other tools.
It does **not** make review optional: exfiltration to a *declared* host is
still possible, so `permissions.network` review and diff review still apply.
Sandboxed tools graduate to first-party rendering only by maintainer decision.

## Reporting a vulnerability

- **Do not open a public issue** for anything security-sensitive.
- Use **GitHub → Security → Report a vulnerability** (private vulnerability
  reporting). You will get a response within 7 days.
- Include: affected URL/tool, steps to reproduce, and what you expected to
  happen. Proof-of-concept code is welcome; please do not exfiltrate other
  users' data or hammer the site.

We credit reporters in the release notes unless you ask otherwise.

## Rules for contributors (hard requirements)

1. **No secrets in the repo.** No API keys, tokens, passwords, or private URLs
   in code, manifests, recipes, docs, or screenshots. Service credentials live
   in the Cloudflare dashboard / GitHub Secrets and are injected at build or
   runtime. `.env` is gitignored. CI runs a secret scan on every PR.
2. **AI features are bring-your-own-key.** The app never ships with a shared
   model key; users supply their own via the in-app key input. PRs that embed
   a shared key will be closed.
3. **Network allowlist.** Tools must declare every external host in
   `manifest.json → permissions.network`. The build CSP is generated from
   declared hosts — undeclared calls are blocked at runtime *and* fail CI.
4. **No new tracking.** Analytics endpoints are maintainer-owned. A tool PR
   that adds beacons, pixels, or fingerprinting will be closed.
5. **Dependencies are a trust decision.** New npm packages need justification
   in the PR (why, size, license, maintenance). Prefer what's already installed.

## If you suspect a leak

Rotate the credential at the provider **first**, then tell us so we can purge
history if needed. History rewrites are a last resort and will be coordinated
publicly.

## Supported versions

`main` only. There are no LTS branches — fixes ship forward.
