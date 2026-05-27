const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const lat = parseFloat(String(body.lat ?? ""));
    const lng = parseFloat(String(body.lng ?? ""));

    if (isNaN(lat) || isNaN(lng)) {
      return new Response(JSON.stringify({ error: "lat and lng are required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 31);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const archiveUrl =
      `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=${lat}&longitude=${lng}` +
      `&start_date=${fmt(startDate)}&end_date=${fmt(yesterday)}` +
      `&daily=precipitation_sum&timezone=UTC`;

    const res = await fetch(archiveUrl);
    if (!res.ok) {
      throw new Error(`Open-Meteo archive error: ${res.status}`);
    }

    const json = await res.json() as {
      daily?: { time: string[]; precipitation_sum: (number | null)[] };
    };

    const daily = json.daily;
    if (!daily?.time?.length) {
      return new Response(JSON.stringify({ last24h: 0, last3d: 0, last7d: 0, last30d: 0 }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const pairs = daily.time.map((t, i) => ({
      date: new Date(t + "T00:00:00Z"),
      mm: daily.precipitation_sum[i] ?? 0,
    })).sort((a, b) => b.date.getTime() - a.date.getTime());

    const sumDays = (n: number): number =>
      pairs.slice(0, n).reduce((acc, p) => acc + p.mm, 0);

    const result = {
      last24h: Math.round(sumDays(1) * 10) / 10,
      last3d: Math.round(sumDays(3) * 10) / 10,
      last7d: Math.round(sumDays(7) * 10) / 10,
      last30d: Math.round(sumDays(30) * 10) / 10,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "max-age=3600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
