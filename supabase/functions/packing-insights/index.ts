import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Cost-efficient model; 2.0-flash-lite is unavailable for new API keys. */
const MODEL = "gemini-2.5-flash-lite";
const MAX_TRIP_DAYS = 21;
const VALID_CATEGORIES = new Set(["tops", "bottoms", "outerwear", "footwear", "accessories"]);

interface PackingItem {
  category: string;
  name: string;
  quantity: number;
  reason?: string;
}

interface DailyForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  feelsLikeMin: number;
  feelsLikeMax: number;
  precipProb: number;
  condition: string;
}

interface RequestBody {
  destination: string;
  departure_date: string;
  return_date: string;
  daily_forecasts: DailyForecast[];
  calibration: {
    thermal_sensitivity: number;
    shorts_min_temp: number;
    pants_max_temp: number;
    light_jacket_max_temp: number;
    heavy_coat_max_temp: number;
    rain_tolerance: string;
  };
  temp_unit?: "F" | "C";
  baseline_packing_list?: PackingItem[];
  wardrobe_items?: { name: string; category: string }[];
}

function tripDayCount(dep: string, ret: string): number {
  const d1 = new Date(dep + "T00:00:00");
  const d2 = new Date(ret + "T00:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

function buildPrompt(body: RequestBody): string {
  const unit = body.temp_unit ?? "F";
  const days = body.daily_forecasts.length;
  const wardrobe = body.wardrobe_items?.length
    ? `\nUser wardrobe (items they may already own): ${JSON.stringify(body.wardrobe_items)}`
    : "";
  const baseline = body.baseline_packing_list?.length
    ? `\nBaseline rule-based packing list to refine (keep sensible items, adjust quantities/reasons, add missing essentials):\n${JSON.stringify(body.baseline_packing_list)}`
    : "";

  return `You are a travel packing assistant. Use ONLY the forecast data below — do not invent temperatures or conditions.

Trip: ${body.destination}
Dates: ${body.departure_date} to ${body.return_date} (${tripDayCount(body.departure_date, body.return_date)} calendar days, ${days} forecast days)
Temperature unit: °${unit}
User runs ${body.calibration.thermal_sensitivity < 0 ? "cold" : body.calibration.thermal_sensitivity > 0 ? "hot" : "neutral"} (${body.calibration.thermal_sensitivity}), rain tolerance: ${body.calibration.rain_tolerance}
Thresholds (°${unit}): shorts from ${body.calibration.shorts_min_temp}, light jacket below ${body.calibration.light_jacket_max_temp}, heavy coat below ${body.calibration.heavy_coat_max_temp}

Daily forecasts:
${JSON.stringify(body.daily_forecasts)}
${baseline}${wardrobe}

Respond with ONLY valid JSON (no markdown) matching this shape:
{
  "weather_summary": "string",
  "daily_highlights": [{"date":"YYYY-MM-DD","summary":"string"}],
  "packing_recommendations": [{"category":"tops|bottoms|outerwear|footwear|accessories","name":"string","quantity":number,"reason":"string"}],
  "packing_notes": "string"
}`;
}

function normalizeCategory(raw: unknown): string {
  const c = String(raw ?? "").toLowerCase().trim();
  if (VALID_CATEGORIES.has(c)) return c;
  if (/jacket|coat|rain|outer|fleece|parka/i.test(c)) return "outerwear";
  if (/shirt|tee|top|blouse/i.test(c)) return "tops";
  if (/pant|jean|short|skirt|bottom/i.test(c)) return "bottoms";
  if (/shoe|boot|sandal|sneaker|foot/i.test(c)) return "footwear";
  return "accessories";
}

function parseGeminiJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim()) as Record<string, unknown>;
    throw new Error("Gemini returned invalid JSON");
  }
}

function normalizePackingItems(raw: unknown): PackingItem[] {
  if (!Array.isArray(raw)) return [];
  const items: PackingItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const name = String(o.name ?? "").trim();
    if (!name) continue;
    const qty = Math.max(1, Math.round(Number(o.quantity) || 1));
    items.push({
      category: normalizeCategory(o.category),
      name,
      quantity: qty,
      reason: o.reason != null ? String(o.reason) : undefined,
    });
  }
  return items;
}

async function callGemini(apiKey: string, prompt: string): Promise<Record<string, unknown>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let detail = errText.slice(0, 400);
    try {
      const parsed = JSON.parse(errText) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch { /* keep raw */ }
    if (res.status === 400 && /API key/i.test(detail)) {
      throw new Error("Gemini API key is invalid. Check GEMINI_API_KEY in Supabase Edge Function secrets.");
    }
    throw new Error(`Gemini API error (${res.status}): ${detail}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    const blockReason = json?.candidates?.[0]?.finishReason ?? json?.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Gemini blocked response: ${blockReason}` : "Empty Gemini response");
  }
  return parseGeminiJson(text);
}

function validateInsights(raw: Record<string, unknown>): Record<string, unknown> {
  const packing = normalizePackingItems(raw.packing_recommendations);
  if (!packing.length) throw new Error("AI returned an empty packing list");

  const highlights = Array.isArray(raw.daily_highlights)
    ? raw.daily_highlights
        .filter((h) => h && typeof h === "object")
        .map((h) => {
          const row = h as Record<string, unknown>;
          return { date: String(row.date ?? ""), summary: String(row.summary ?? "") };
        })
        .filter((h) => h.date && h.summary)
    : [];

  return {
    weather_summary: typeof raw.weather_summary === "string" ? raw.weather_summary : "Weather summary unavailable.",
    daily_highlights: highlights,
    packing_recommendations: packing,
    packing_notes: typeof raw.packing_notes === "string" ? raw.packing_notes : "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 503,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!body.destination || !body.departure_date || !body.return_date) {
      return new Response(JSON.stringify({ error: "Missing trip fields" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (!body.daily_forecasts?.length) {
      return new Response(JSON.stringify({ error: "Forecast data required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (tripDayCount(body.departure_date, body.return_date) > MAX_TRIP_DAYS) {
      return new Response(JSON.stringify({ error: `Trips longer than ${MAX_TRIP_DAYS} days are not supported` }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(body);
    const raw = await callGemini(apiKey, prompt);
    const insights = validateInsights(raw);

    return new Response(JSON.stringify(insights), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("packing-insights:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
