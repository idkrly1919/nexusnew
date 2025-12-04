// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { prompt, model, size } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // @ts-ignore
    const infipApiKey = Deno.env.get('INFIP_API_KEY');
    if (!infipApiKey) {
      console.error("INFIP_API_KEY missing");
      return new Response(
        JSON.stringify({ error: 'Server configuration error: API key missing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating image with prompt: "${prompt}", model: ${model || 'default'}`);

    const infipUrl = "https://api.infip.pro/v1/images/generations";
    
    const payload = {
        prompt: prompt,
        model: model || 'nano-banana',
        n: 1,
        size: size || '1024x1792'
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
          JSON.stringify({ error: `Image Service Error (${response.status}): ${errText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const data = await response.json();
    console.log("Image generation successful");

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})