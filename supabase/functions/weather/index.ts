const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Condition mappings ────────────────────────────────────────────────────────

const WK_TO_APP: Record<string, string> = {
  Clear: "clear", MostlyClear: "clear", PartlyCloudy: "partly_cloudy",
  MostlyCloudy: "partly_cloudy", Cloudy: "cloudy", Overcast: "cloudy",
  Foggy: "foggy", Haze: "foggy", Smoke: "foggy", BlowingDust: "foggy",
  Drizzle: "drizzle", ScatteredShowers: "drizzle", FreezingDrizzle: "drizzle",
  Rain: "rain", Showers: "rain", FreezingRain: "rain",
  HeavyRain: "heavy_rain",
  Snow: "snow", Flurries: "snow", HeavySnow: "snow", SnowShowers: "snow",
  ScatteredSnowShowers: "snow", MixedRainAndSnow: "snow", Sleet: "snow",
  HeavySleet: "snow", BlowingSnow: "snow", Blizzard: "snow", WinterMix: "snow",
  Thunderstorms: "thunderstorm", ScatteredThunderstorms: "thunderstorm",
  StrongStorms: "thunderstorm", Hurricane: "thunderstorm", TropicalStorm: "thunderstorm",
  Breezy: "partly_cloudy", Windy: "cloudy", Hot: "clear", Frigid: "clear", Hail: "heavy_rain",
};

const APP_TO_WMO: Record<string, number> = {
  clear: 0, partly_cloudy: 2, cloudy: 3, foggy: 45,
  drizzle: 51, rain: 61, heavy_rain: 65, snow: 71, thunderstorm: 95,
};

function appCondition(wkCode: string): string {
  return WK_TO_APP[wkCode] ?? "cloudy";
}

function wmoCode(wkCode: string): number {
  return APP_TO_WMO[appCondition(wkCode)] ?? 0;
}

// ── Daytime (8 AM–8 PM) condition helper ─────────────────────────────────────

const CONDITION_SEVERITY: Record<string, number> = {
  thunderstorm: 8, heavy_rain: 7, snow: 6, rain: 5,
  drizzle: 4, foggy: 3, cloudy: 2, partly_cloudy: 1, clear: 0,
};

function daytimeStats(
  hours: Record<string, unknown>[],
  dayStart: string,
  timezone: string,
): { condition: string; precipProb: number } {
  const dayKey = new Date(dayStart).toLocaleDateString("en-CA", { timeZone: timezone });

  const window = hours.filter((h) => {
    const t = new Date(h.forecastStart as string);
    if (t.toLocaleDateString("en-CA", { timeZone: timezone }) !== dayKey) return false;
    const hour = parseInt(
      new Intl.DateTimeFormat("en-CA", { timeZone: timezone, hour: "2-digit", hour12: false })
        .formatToParts(t)
        .find((p) => p.type === "hour")?.value ?? "0",
    ) % 24;
    return hour >= 8 && hour < 20;
  });

  if (window.length === 0) return { condition: "cloudy", precipProb: 0 };

  const counts: Record<string, number> = {};
  let maxPrecip = 0;
  for (const h of window) {
    const c = appCondition(h.conditionCode as string ?? "Cloudy");
    counts[c] = (counts[c] ?? 0) + 1;
    const p = Math.round(((h.precipitationChance as number) ?? 0) * 100);
    if (p > maxPrecip) maxPrecip = p;
  }

  // Most frequent condition; severity breaks ties
  const dominant = Object.entries(counts).sort((a, b) =>
    b[1] !== a[1]
      ? b[1] - a[1]
      : (CONDITION_SEVERITY[b[0]] ?? 0) - (CONDITION_SEVERITY[a[0]] ?? 0),
  )[0][0];

  return { condition: dominant, precipProb: maxPrecip };
}

// ── Unit conversions ──────────────────────────────────────────────────────────

const cToF = (c: number) => Math.round((c * 9) / 5 + 32);
const kmhToMph = (k: number) => Math.round(k * 0.621371);

// ── JWT generation ────────────────────────────────────────────────────────────

function b64url(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function makeJWT(): Promise<string> {
  const teamId = Deno.env.get("WEATHERKIT_TEAM_ID")!;
  const keyId = Deno.env.get("WEATHERKIT_KEY_ID")!;
  const serviceId = Deno.env.get("WEATHERKIT_SERVICE_ID")!;
  const pem = Deno.env.get("WEATHERKIT_PRIVATE_KEY")!;

  const header = { alg: "ES256", kid: keyId, id: `${teamId}.${serviceId}` };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: teamId, iat: now, exp: now + 3600, sub: serviceId };

  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sigInput = `${h}.${p}`;

  // Supabase dashboard stores multiline secrets with literal \n sequences.
  // Convert those to real newlines before stripping all whitespace for base64.
  const pemBody = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN (?:EC )?PRIVATE KEY-----/, "")
    .replace(/-----END (?:EC )?PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(sigInput),
  );

  return `${sigInput}.${b64url(new Uint8Array(sig))}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    let lat: number, lon: number, timezone: string, countryCode: string;
    if (req.method === "POST") {
      const b = await req.json();
      lat = parseFloat(b.lat);
      lon = parseFloat(b.lon);
      timezone = b.timezone ?? "UTC";
      countryCode = b.countryCode ?? "US";
    } else {
      const u = new URL(req.url);
      lat = parseFloat(u.searchParams.get("lat") ?? "0");
      lon = parseFloat(u.searchParams.get("lon") ?? "0");
      timezone = u.searchParams.get("timezone") ?? "UTC";
      countryCode = u.searchParams.get("countryCode") ?? "US";
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response(JSON.stringify({ error: "lat and lon required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const jwt = await makeJWT();
    const wkUrl =
      `https://weatherkit.apple.com/api/v1/weather/en/${lat}/${lon}` +
      `?dataSets=currentWeather,forecastHourly,forecastDaily,forecastNextHour` +
      `&timezone=${encodeURIComponent(timezone)}` +
      `&countryCode=${encodeURIComponent(countryCode)}`;

    const WEATHERKIT_TIMEOUT_MS = 10_000;
    const wkRes = await fetch(wkUrl, {
      headers: { Authorization: `Bearer ${jwt}` },
      signal: AbortSignal.timeout(WEATHERKIT_TIMEOUT_MS),
    });

    if (!wkRes.ok) {
      const txt = await wkRes.text();
      return new Response(
        JSON.stringify({ error: `WeatherKit ${wkRes.status}: ${txt}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const wk = await wkRes.json();
    const cur = wk.currentWeather ?? {};
    const hours: Record<string, unknown>[] = wk.forecastHourly?.hours ?? [];
    const days: Record<string, unknown>[] = wk.forecastDaily?.days ?? [];
    const nextHour = wk.forecastNextHour ?? null;

    const nowMs = Date.now();
    const currentHourEntry = hours.find(h => {
      const t = new Date(h.forecastStart as string).getTime();
      return t <= nowMs && nowMs < t + 3_600_000;
    }) ?? hours[0];
    const curPrecipProb = currentHourEntry
      ? Math.round(((currentHourEntry.precipitationChance as number) ?? 0) * 100)
      : 0;

    const out = {
      _source: "weatherkit",
      current: {
        temp: cToF(cur.temperature ?? 0),
        feelsLike: cToF(cur.temperatureApparent ?? cur.temperature ?? 0),
        humidity: Math.round((cur.humidity ?? 0) * 100),
        windSpeed: kmhToMph(cur.windSpeed ?? 0),
        windDirection: Math.round(cur.windDirection ?? 0),
        precipProb: curPrecipProb,
        condition: appCondition(cur.conditionCode ?? "Cloudy"),
        weatherCode: wmoCode(cur.conditionCode ?? "Cloudy"),
        isDay: cur.daylight ?? true,
        uvIndex: cur.uvIndex ?? 0,
        location: "",
        updatedAt: new Date().toISOString(),
      },
      hourly: hours.slice(0, 168).map((h) => ({
        time: h.forecastStart,
        temp: cToF(h.temperature as number ?? 0),
        feelsLike: cToF(h.temperatureApparent as number ?? h.temperature as number ?? 0),
        precipProb: Math.round(((h.precipitationChance as number) ?? 0) * 100),
        condition: appCondition(h.conditionCode as string ?? "Cloudy"),
        weatherCode: wmoCode(h.conditionCode as string ?? "Cloudy"),
        windSpeed: kmhToMph(h.windSpeed as number ?? 0),
        isDay: h.daylight as boolean ?? true,
      })),
      daily: days.slice(0, 7).map((d) => {
        const day = (d.daytimeForecast ?? {}) as Record<string, unknown>;
        const night = (d.overnightForecast ?? {}) as Record<string, unknown>;
        const daytime = daytimeStats(hours, d.forecastStart as string, timezone);
        return {
          date: d.forecastStart,
          tempMin: cToF(d.temperatureMin as number ?? 0),
          tempMax: cToF(d.temperatureMax as number ?? 0),
          feelsLikeMin: cToF(
            night.temperatureApparent as number ?? d.temperatureMin as number ?? 0,
          ),
          feelsLikeMax: cToF(
            day.temperatureApparent as number ?? d.temperatureMax as number ?? 0,
          ),
          precipProb: daytime.precipProb,
          condition: daytime.condition,
          weatherCode: APP_TO_WMO[daytime.condition] ?? 0,
          sunrise: d.sunrise,
          sunset: d.sunset,
        };
      }),
      nextHourPrecip:
        nextHour?.minutes?.length > 0
          ? {
              startTime: nextHour.minutes[0].startTime,
              minutes: (nextHour.minutes as Record<string, unknown>[]).map((m) => ({
                precipIntensity: (m.precipitationIntensity as number) ?? 0,
                precipProbability: Math.round(
                  ((m.precipitationChance as number) ?? 0) * 100,
                ),
              })),
            }
          : null,
    };

    return new Response(JSON.stringify(out), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
