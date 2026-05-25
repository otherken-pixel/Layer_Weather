# Organize `svg_clothes_files` bucket

Files start at the bucket root (e.g. `005-tshirt.svg`). The app expects:

`{style}/{category}/{filename}` — e.g. `neutral/tops/005-tshirt.svg`

## One-time migration (recommended)

Deploy and invoke the `organize-svg-clothes` edge function (service role copies each file, then removes the root copy):

```bash
curl -s "https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/organize-svg-clothes?secret=<ORGANIZE_SVG_SECRET_VALUE>" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Set `ORGANIZE_SVG_SECRET` in the function's secrets to a strong random value, then invoke with that same value as the `secret` query parameter.

## Regenerate catalog after reclassification

```bash
node scripts/classify-svg-files.mjs > /tmp/svg-catalog.json
# then regenerate src/data/svgCatalog.ts (see classify script header in repo)
```

## Adjust classifications

Edit heuristics in `scripts/classify-svg-files.mjs`, regenerate `src/data/svgCatalog.ts`, and re-run the organizer if paths change.
