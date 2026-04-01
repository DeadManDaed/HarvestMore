// momo-payment-status/index.ts
const MOMO_BASE_URL = "https://sandbox.momodeveloper.mtn.com";

const MOMO_SUBSCRIPTION_KEY = Deno.env.get("MOMO_SUBSCRIPTION_KEY");
const MOMO_API_USER = Deno.env.get("MOMO_API_USER");
const MOMO_API_KEY = Deno.env.get("MOMO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!MOMO_SUBSCRIPTION_KEY || !MOMO_API_USER || !MOMO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Variables d'environnement MOMO manquantes" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { referenceId } = await req.json();

    if (!referenceId) {
      return new Response(
        JSON.stringify({ error: "referenceId requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Obtenir token
    const authHeaderMomo = btoa(`${MOMO_API_USER}:${MOMO_API_KEY}`);
    const tokenRes = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeaderMomo}`,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
    });

    if (!tokenRes.ok) {
      throw new Error(`Échec auth MOMO: ${tokenRes.status}`);
    }

    const { access_token } = await tokenRes.json();

    // Vérifier statut
    const statusRes = await fetch(
      `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "X-Target-Environment": "sandbox",
          "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
        },
      }
    );

    if (!statusRes.ok) {
      const t = await statusRes.text();
      throw new Error(`Échec statut MOMO: ${statusRes.status} - ${t}`);
    }

    const statusData = await statusRes.json();

    return new Response(
      JSON.stringify({
        status: statusData.status,
        referenceId,
        amount: statusData.amount,
        currency: statusData.currency,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erreur:", message);

    return new Response(
      JSON.stringify({ error: message, status: "ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
