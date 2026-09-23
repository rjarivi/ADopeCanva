## Lane (pick one — see CONTRIBUTING.md)

- [ ] Recipe (`recipes/*.json` — preset only, no component code)
- [ ] Code tool (`tools/<id>/` — manifest + component)

## Contributor checklist

- [ ] I did **not** edit the shell: `App.tsx`, `views/Dashboard.tsx`, `index.html`,
      `vite.config.ts`, `package.json`/`package-lock.json`, analytics, or CSP.
      (CI scope-guard enforces this — shell changes need a separate proposal.)
- [ ] `manifest.json` declares all permissions (`file`, `canvas`, `download`,
      `ffmpeg`, plus `network` hosts if the tool makes **any** request).
- [ ] No new npm dependencies — or I justified them below (why / size / license).
- [ ] No secrets, keys, tokens, or tracking endpoints anywhere in the diff.
- [ ] Upload state uses `<ToolShell>` (header + uploader + 4-feature grid);
      file state uses `useToolFile()` (no object-URL leaks).
- [ ] Error paths tested on the preview deploy: empty file, wrong type,
      oversized file. Failures log via `logToolFailure` with a stable `toolId`.
- [ ] Commits are signed off (`git commit -s`, DCO).
- [ ] I tested the **preview deploy link**, not just `localhost`.

## New dependencies (Lane 2 only, delete if none)

| package | why | approx. size | license |
|---|---|---|---|
| | | | |

## Network hosts (delete if none)

| host | why |
|---|---|
| | |

## Screenshots / sample files

<!-- Before/after screenshots and a sample input file reviewers can try. -->
