// supabase/functions/generate-program-events/index.ts

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { user_program_id } = await req.json();
  if (!user_program_id) return new Response("Missing user_program_id", { status: 400 });

  // Récupérer le user_program avec plantation et programme
  const { data: userProg, error: progError } = await supabase
    .from("user_programs")
    .select("*, plantation:user_plantations(user_id), program:crop_programs(*)")
    .eq("id", user_program_id)
    .single();
  if (progError || !userProg) return new Response("Program not found", { status: 404 });

  // Récupérer les étapes
  const { data: steps, error: stepsError } = await supabase
    .from("program_steps")
    .select("*")
    .eq("program_id", userProg.program_id)
    .order("step_order", { ascending: true });
  if (stepsError) return new Response("Steps error", { status: 500 });

  // Créer les événements
  const startDate = new Date(userProg.start_date);
  const events = steps.map(step => ({
    title: step.title,
    description: step.description,
    event_type: "intervention",
    start_time: new Date(startDate.getTime() + step.typical_day_offset * 86400000).toISOString(),
    end_time: new Date(startDate.getTime() + (step.typical_day_offset + step.duration_days) * 86400000).toISOString(),
    created_by: userProg.plantation.user_id,
    automated: true,
    program_step_id: step.id,
    user_program_id: user_program_id,
    status: "scheduled"
  }));

  const { error: insertError } = await supabase.from("shared_events").insert(events);
  if (insertError) return new Response("Insert events failed", { status: 500 });

  // Marquer le programme comme actif
  await supabase.from("user_programs").update({ status: "active" }).eq("id", user_program_id);

  return new Response(JSON.stringify({ success: true, events_created: events.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});