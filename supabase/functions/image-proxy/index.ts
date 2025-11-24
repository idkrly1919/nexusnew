// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    if (req.headers.get('content-type') !== 'application/json') {
      return new Response(
        JSON.stringify({ error: 'Invalid Content-Type. Must be application/json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { prompt, size } = await req.json()
    
    // @ts-ignore
    const higgsfieldKey = Deno.env.get('HIGGSFIELD_API_KEY');

    if (!higgsfieldKey) {
      return new Response(
        JSON.stringify({ error: 'API key secret (HIGGSFIELD_API_KEY) is not set in your Supabase project function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- NEW LOGIC BASED ON YOUR INSTRUCTIONS ---

    // 1. Determine aspect_ratio from the incoming 'size' parameter
    let aspect_ratio = '1:1'; // Default to square
    if (size === "1792x1024") {
        aspect_ratio = '16:9'; // Landscape
    } else if (size === "1024x1792") {
        aspect_ratio = '9:16'; // Portrait
    }

    // 2. Construct the new API endpoint and payload
    const higgsfieldUrl = "https://platform.higgsfield.ai/nano-banana-pro";
    const headers = {
        "Authorization": `Bearer ${higgsfieldKey}`,
        "Content-Type": "application/json"
    };
    const payload = {
        prompt: prompt,
        num_images: 1,
        resolution: '2k',
        aspect_ratio: aspect_ratio,
        output_format: 'png'
    };

    // 3. Make the request to the new endpoint
    const response = await fetch(higgsfieldUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        return new Response(
          JSON.stringify({ error: `Higgsfield API Error ${response.status}: ${errText}` }),
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