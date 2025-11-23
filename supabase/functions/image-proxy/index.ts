// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ensure the request has a body
    if (req.headers.get('content-type') !== 'application/json') {
      return new Response(
        JSON.stringify({ error: 'Invalid Content-Type. Must be application/json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { prompt, size } = await req.json()
    
    // @ts-ignore
    const infipKey = Deno.env.get('INFIP_API_KEY') || Deno.env.get('VITE_INFIP_API_KEY');

    if (!infipKey) {
      return new Response(
        JSON.stringify({ error: 'API key secret (INFIP_API_KEY or VITE_INFIP_API_KEY) is not set in function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const infipUrl = "https://api.infip.pro/v1/images/generations";
    const headers = {
        "Authorization": `Bearer ${infipKey}`,
        "Content-Type": "application/json"
    };
    const payload = {
        model: "img4",
        prompt: prompt,
        n: 1,
        size: size || "1024x1024"
    };

    // Make the request from the server-side function
    const response = await fetch(infipUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        // Return a structured error
        return new Response(
          JSON.stringify({ error: `InfiP API Error ${response.status}: ${errText}` }),
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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})