# SVG clothes: Storage + `svg_clothes` table

## Architecture

| Layer | Purpose |
|--------|---------|
| **`svg_clothes_files` bucket** | SVG file bytes (flat names, e.g. `005-tshirt.svg`) |
| **`svg_clothes` table** | Id, label, style, category, `storage_path`, sort order |
| **App** | `getSvgCatalog()` → Zustand store → `StorageSvg` public URLs |
| **`user_weather_wardrobes`** | User picks by stable catalog **id** |

Reclassify an item: update the row in Supabase (Table Editor or SQL). No app deploy required.

## Regenerate seed SQL after reclassification

```bash
node scripts/classify-svg-files.mjs --write-sql-seed
```

Apply the generated migration or run the SQL in the SQL editor.

## Optional: folder layout in Storage

The app reads `storage_path` from the table (usually the flat filename). Moving files into `{style}/{category}/` folders is optional; update `storage_path` to match if you do.

## Legacy one-time folder move

The `organize-svg-clothes` edge function is optional if you prefer folders in the dashboard. See function source under `supabase/functions/organize-svg-clothes/`.
