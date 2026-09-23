# Recipes (Lane 1 — the default ask)

Most "new tool" requests are **presets, not apps**: an FFmpeg command, a
conversion setting, a resize profile. Those are JSON files here — no component
code, no review bottleneck, merge-safe by construction.

## Schema

```jsonc
{
  "id": "video-720p-h264",      // must match filename
  "title": "720p H.264 video",
  "kind": "ffmpeg | image | audio | document",
  "engine": "ffmpeg",           // informational: what runs it
  "description": "…",
  "params": { /* engine-specific, plain data only */ }
}
```

Full schema: `recipes/schema.json`. Validated by `npm run audit:permissions`.

## Execution semantics (what the runner does)

- **ffmpeg / audio**: `params.args` (string array) + `params.ext` (output
  extension) are required. Use `{input}` / `{output}` tokens for full
  control; otherwise the runner wraps as `ffmpeg -i {input} …args… {output}`.
- **image**: `params.format` (`webp`|`png`|`jpeg`) + optional `params.quality`
  (1–100, default 80). Converted via canvas (metadata dropped).
- **document**: validated but needs a code tool (Lane 2) — the runner
  explains this instead of failing obscurely.

## Requesting vs contributing

- **Request**: open a `tool-request` issue; a maintainer or contributor turns it
  into a recipe PR.
- **Contribute**: copy the closest example, adjust `params`, open a PR.
  If CI is green and the preset does what it claims on the preview deploy,
  it merges fast.

## When a recipe is NOT enough

Custom UI, new engines, or multi-step interactive flows → Lane 2
(`tools/<id>/`, see `CONTRIBUTING.md`).
