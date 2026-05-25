import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import moves from "./moves.json" assert { type: "json" };

const MOVES = moves as { from: string; to: string }[];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const secret = Deno.env.get("ORGANIZE_SVG_SECRET") ?? "cursor-svg-organize-7397";
  const provided = new URL(req.url).searchParams.get("secret");
  if (!provided || provided !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: { from: string; to: string; ok: boolean; error?: string }[] = [];

  for (const { from, to } of MOVES) {
    const folder = to.includes("/") ? to.split("/").slice(0, -1).join("/") : "";
    const filename = to.split("/").pop()!;
    const { data: existing } = await supabase.storage.from("svg_clothes_files").list(folder, {
      search: filename,
    });
    const already = existing?.some((o) => o.name === filename);
    if (already) {
      await supabase.storage.from("svg_clothes_files").remove([from]).catch(() => {});
      results.push({ from, to, ok: true });
      continue;
    }

    const { error: copyErr } = await supabase.storage.from("svg_clothes_files").copy(from, to);
    if (copyErr) {
      results.push({ from, to, ok: false, error: copyErr.message });
      continue;
    }
    const { error: delErr } = await supabase.storage.from("svg_clothes_files").remove([from]);
    results.push({ from, to, ok: !delErr, error: delErr?.message });
  }

  const ok = results.filter((r) => r.ok).length;
  return new Response(JSON.stringify({ moved: ok, total: MOVES.length, results }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
