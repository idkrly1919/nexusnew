// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  console.log("image-proxy function invoked.");

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    if (req.headers.get('content-type') !== 'application/json') {
      const errorMsg = 'Invalid Content-Type. Must be application/json';
      console.error(errorMsg);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { prompt, size } = await req.json()
    console.log(`Received request with prompt: "${prompt}" and size: "${size}"`);
    
    // @ts-ignore
    const higgsfieldKey = Deno.env.get('HIGGSFIELD_API_KEY');

    if (!higgsfieldKey) {
      const errorMsg = 'CRITICAL: Secret "HIGGSFIELD_API_KEY" not found in environment variables.';
      console.error(errorMsg);
      return new Response(
        JSON.stringify({ error: 'API key secret (HIGGSFIELD_API_KEY) is not set in your Supabase project function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.log(`Successfully loaded "HIGGSFIELD_API_KEY". Key length: ${higgsfieldKey.length}. Starts with: "${higgsfieldKey.substring(0, 4)}...".`);
    }

    let aspect_ratio = '1:1';
    if (size === "1792x1024") aspect_ratio = '16:9';
    else if (size === "1024x1792") aspect_ratio = '9:16';

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

    console.log(`Sending request to Higgsfield API at: ${higgsfieldUrl}`);
    console.log("Request payload:", JSON.stringify(payload));

    const response = await fetch(higgsfieldUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    console.log(`Received response from Higgsfield API with status: ${response.status}`);

    if (!response.ok) {
        const errText = await response.text();
        console.error(`Higgsfield API Error ${response.status}:`, errText);
        return new Response(
          JSON.stringify({ error: `Higgsfield API Error ${response.status}: ${errText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const data = await response.json();
    console.log("Successfully received data from Higgsfield API.");

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