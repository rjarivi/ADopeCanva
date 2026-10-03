# tools/_template

Scaffold for a new code tool. Don't copy by hand — run:

```bash
npm run new:tool -- --id=my-tool --title="My Tool" --category=image
```

Then fill in `manifest.json` (validated by `npm run registry:build` and
`npm run audit:permissions`) and replace the workspace in `index.tsx`.
`index.tsx` must default-export the component — the shell lazy-loads it.
