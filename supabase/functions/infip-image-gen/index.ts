// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { prompt, model, size } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // @ts-ignore
    const infipApiKey = Deno.env.get('INFIP_API_KEY');
    if (!infipApiKey) {
      const errorMsg = 'CRITICAL: Secret "INFIP_API_KEY" not found in environment variables.';
      console.error(errorMsg);
      return new Response(
        JSON.stringify({ error: 'API key secret (INFIP_API_KEY) is not set in your Supabase project function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const infipUrl = "https://api.infip.pro/v1/images/generations";
    
    const payload = {
        prompt: prompt,
        model: model || 'img3', // Use the provided model, or default to img3
        n: 1,
        size: size || '1024x1792' // Use provided size, or default to 9:16
    };

    const response = await fetch(infipUrl, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${infipApiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`Infip API Error ${response.status}:`, errText);
        return new Response(
          JSON.stringify({ error: `Infip API Error ${response.status}: ${errText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Caught an unexpected error in the function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})