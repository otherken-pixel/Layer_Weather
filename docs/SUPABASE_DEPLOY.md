# Supabase Edge Function deploy (GitHub Actions)

The workflow [`.github/workflows/deploy-functions.yml`](../.github/workflows/deploy-functions.yml) deploys edge functions when `supabase/functions/**` changes on `main`, including subscription handlers `validate-apple-receipt` and `apple-notifications`.

## Required GitHub secrets

| Secret | Required | How to get it |
|--------|----------|----------------|
| `SUPABASE_ACCESS_TOKEN` | **Yes** | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) — must start with **`sbp_`** (not the anon key, not `service_role`, not the project ref) |
| `GEMINI_API_KEY` | **For AI packing** | [Google AI Studio](https://aistudio.google.com/apikey) — synced to Supabase on deploy when set |

## Supabase Edge Function secrets (Dashboard)

Set these under **Project Settings → Edge Functions** (or let the deploy workflow sync `GEMINI_API_KEY` from GitHub):

| Secret | Function | Purpose |
|--------|----------|---------|
| `GEMINI_API_KEY` | `packing-insights` | Gemini `gemini-2.5-flash-lite` for on-demand trip packing advice |
| `WEATHERKIT_*` | `weather` | Apple WeatherKit JWT (existing) |
| `SUPABASE_SERVICE_ROLE_KEY` | `weather-alerts` | Cron alerts (existing) |
| `FCM_SERVER_KEY` | `weather-alerts` | Push notifications (existing) |

### Database migration for AI insights

Apply migration `supabase/migrations/009_packing_ai_insights.sql` (adds `ai_insights`, `ai_generated_at` to `packing_trips`):

```bash
npx supabase db push --project-ref "$PROJECT_REF"
```

Or run the SQL in the Supabase SQL editor.

## Project reference (one of these)

The secret name must match **exactly** (GitHub is case-sensitive):

| Secret name | Required | Value |
|-------------|----------|--------|
| `SUPABASE_PROJECT_ID` | **Preferred** | Reference ID only, e.g. `abcdefghijklmnop` from [Settings → General](https://supabase.com/dashboard/project/_/settings/general) |
| `SUPABASE_PROJECT_REF` | Alternate | Same reference ID if you used this name by mistake |
| `VITE_SUPABASE_URL` | Fallback | Full URL `https://<ref>.supabase.co` — workflow extracts `<ref>` |

**Common mistake:** naming the secret `SUPABASE_PROJECT_REF` while the workflow only read `SUPABASE_PROJECT_ID` — both are now supported.

**Do not** use the anon key, service role key, or full dashboard URL as the project ref (unless it is `VITE_SUPABASE_URL`, which is parsed automatically).

**Swapped secrets?** If deploy says `Invalid access token format`, your `SUPABASE_ACCESS_TOKEN` is not an `sbp_` token — often the project ref and token were entered in the wrong fields.

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
npx supabase functions deploy validate-apple-receipt --project-ref "$PROJECT_REF" --use-api
npx supabase functions deploy apple-notifications --project-ref "$PROJECT_REF" --no-verify-jwt --use-api
```

### In-app subscriptions (`validate-apple-receipt`)

Purchases call `validate-apple-receipt` after StoreKit returns a signed transaction. If this function is not deployed, the paywall shows a generic purchase failure even when Apple accepts payment.

After merging subscription changes, run **Actions → Deploy Edge Functions** (or deploy the commands above). In App Store Connect, set **App Store Server Notifications** (Version 2) to:

`https://<project-ref>.supabase.co/functions/v1/apple-notifications`

Subscription product IDs in the app (`src/lib/storekit.ts`):

- `com.layerweather.app.pro.monthly.v2`
- `com.layerweather.app.pro.annual.v2`

### Complimentary (free) Pro access

To grant Pro to specific users without an Apple purchase (press, beta, VIPs,
support make-goods), use the helpers from migration `024_complimentary_access.sql`.
Run these in the **Supabase SQL editor** (they're blocked for app users):

```sql
-- Lifetime free Pro
select grant_comp_access('user@example.com');

-- Time-limited (auto-expires on the client when the date passes)
select grant_comp_access('user@example.com', now() + interval '1 year', 'beta cohort');

-- Revoke
select revoke_comp_access('user@example.com');
```

Access reads `profiles.comp_access` / `comp_access_until` and unlocks Pro on the
user's next launch. These columns are protected by a trigger so clients cannot
set them — only the service role / SQL editor can.


## Web subscriptions (RevenueCat)

Web checkout uses RevenueCat Web Billing (`@revenuecat/purchases-js`). iOS continues to use StoreKit only.

### Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_REVENUECAT_API_KEY` | Web build (GitHub secret / `.env`) | RevenueCat Web Billing public API key |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | Supabase Edge secrets | Must match Authorization header configured in RevenueCat webhook settings |
| `REVENUECAT_ENTITLEMENT_ID` | Supabase Edge secrets (optional) | Defaults to `pro` |

### RevenueCat dashboard

1. Web Billing app with Stripe connected.
2. Offering packages named **`monthly`** and **`annual`** (package identifiers).
3. Entitlement (default **`pro`**) linked to both products.
4. Webhook URL: `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
5. Set the same Authorization header value as `REVENUECAT_WEBHOOK_AUTHORIZATION` in Supabase.
6. Use the Supabase user UUID as **App User ID** (the app calls `Purchases.configure` with `profiles.id`).

### Database

Migration `025_web_subscription.sql` adds `web_subscription_*` columns on `profiles`. Premium is granted when either Apple (`subscription_*`) or web (`web_subscription_*`) is active/trialing, or `comp_access` is set.
