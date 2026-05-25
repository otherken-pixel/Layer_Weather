import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gemini-2.0-flash-lite";
const MAX_TRIP_DAYS = 21;

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

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    weather_summary: { type: "string" },
    daily_highlights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          summary: { type: "string" },
        },
        required: ["date", "summary"],
      },
    },
    packing_recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["tops", "bottoms", "outerwear", "footwear", "accessories"],
          },
          name: { type: "string" },
          quantity: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["category", "name", "quantity"],
      },
    },
    packing_notes: { type: "string" },
  },
  required: ["weather_summary", "daily_highlights", "packing_recommendations", "packing_notes"],
};

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

Return JSON with:
- weather_summary: 2-4 sentences about the trip weather pattern
- daily_highlights: one short line per forecast day (date as YYYY-MM-DD)
- packing_recommendations: complete packing list with category, name, quantity, reason
- packing_notes: 1-2 sentences of practical tips (layering, laundry, etc.)`;
}

async function callGemini(apiKey: string, prompt: string): Promise<Record<string, unknown>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    throw new Error("Empty Gemini response");
  }
  return JSON.parse(text) as Record<string, unknown>;
}

function validateInsights(raw: Record<string, unknown>): Record<string, unknown> {
  if (typeof raw.weather_summary !== "string") throw new Error("Invalid weather_summary");
  if (!Array.isArray(raw.daily_highlights)) throw new Error("Invalid daily_highlights");
  if (!Array.isArray(raw.packing_recommendations)) throw new Error("Invalid packing_recommendations");
  if (typeof raw.packing_notes !== "string") throw new Error("Invalid packing_notes");
  return raw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
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
