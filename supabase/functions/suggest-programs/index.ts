// supabase/functions/suggest-programs/index.ts

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { crop_id, zae_id, budget, season_id } = await req.json();
    if (!crop_id) throw new Error("crop_id required");

    let query = supabase
      .from("crop_programs")
      .select("*, crop:crops(name), zae:zae(name), season:seasons(name)")
      .eq("crop_id", crop_id)
      .eq("is_active", true);

    if (zae_id) query = query.eq("zae_id", zae_id);
    if (season_id) query = query.eq("season_id", season_id);

    const { data, error } = await query;
    if (error) throw error;

    // Filtrer par budget si fourni
    let programs = data || [];
    if (budget) {
      programs = programs.filter(p => p.min_budget_estimate <= budget && p.max_budget_estimate >= budget);
    }

    return new Response(JSON.stringify({ success: true, programs }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});