# Supabase Edge Function deploy (GitHub Actions)

The workflow [`.github/workflows/deploy-functions.yml`](../.github/workflows/deploy-functions.yml) deploys `weather` and `weather-alerts` when `supabase/functions/**` changes on `main`.

## Required GitHub secret

| Secret | Required | How to get it |
|--------|----------|----------------|
| `SUPABASE_ACCESS_TOKEN` | **Yes** | [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens) — create a token with access to your org/project |

## Project reference (one of these)

The secret name must match **exactly** (GitHub is case-sensitive):

| Secret name | Required | Value |
|-------------|----------|--------|
| `SUPABASE_PROJECT_ID` | **Preferred** | Reference ID only, e.g. `abcdefghijklmnop` from [Settings → General](https://supabase.com/dashboard/project/_/settings/general) |
| `SUPABASE_PROJECT_REF` | Alternate | Same reference ID if you used this name by mistake |
| `VITE_SUPABASE_URL` | Fallback | Full URL `https://<ref>.supabase.co` — workflow extracts `<ref>` |

**Common mistake:** naming the secret `SUPABASE_PROJECT_REF` while the workflow only read `SUPABASE_PROJECT_ID` — both are now supported.

**Do not** use the anon key, service role key, or full dashboard URL as the project ref (unless it is `VITE_SUPABASE_URL`, which is parsed automatically).

## Add secrets in GitHub

1. Open **https://github.com/otherken-pixel/weartoday/settings/secrets/actions**
2. Click **New repository secret**
3. Add `SUPABASE_ACCESS_TOKEN` with your personal access token
4. Add `SUPABASE_PROJECT_ID` with your project reference ID (or ensure `VITE_SUPABASE_URL` is set)

## Re-run deploy

After saving secrets:

1. **Actions** → **Deploy Edge Functions** → **Run workflow**, or  
2. Push any commit that touches `supabase/functions/`

## Verify locally (optional)

```bash
export SUPABASE_ACCESS_TOKEN="your-token"
export PROJECT_REF="your-project-ref"
npx supabase functions deploy weather --project-ref "$PROJECT_REF" --no-verify-jwt --use-api
```
