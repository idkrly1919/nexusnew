// This comment tells the TypeScript compiler where to find the types for Deno's standard library.
// @deno-types="https://deno.land/std@0.190.0/http/server.ts"
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// FIX 2: Added the 'Request' type to the 'req' parameter.
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()
    // @ts-ignore
    const infipKey = Deno.env.get('INFIP_API_KEY') // Corrected from INFLIP_API_KEY

    if (!infipKey) {
      return new Response(
        JSON.stringify({ error: 'INFIP_API_KEY is not set in function secrets.' }),
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
        size: "1024x1024"
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
    // FIX 3: Safely handle the 'unknown' type of the error object.
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})