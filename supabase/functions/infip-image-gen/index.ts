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
    const imageApiKey = Deno.env.get('IMAGE_API');
    if (!imageApiKey) {
      console.error("IMAGE_API missing");
      return new Response(
        JSON.stringify({ error: 'Server configuration error: API key missing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating image with prompt: "${prompt}", model: ${model || 'flux'}`);

    // Pollinations API endpoint - encode the prompt for URL
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsModel = model === 'nano-banana' || model === 'img3' ? 'flux' : 'flux';
    const pollinationsUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${pollinationsModel}`;
    
    const response = await fetch(pollinationsUrl, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${imageApiKey}`
        }
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`Pollinations API Error ${response.status}:`, errText);
        return new Response(
          JSON.stringify({ error: `Image Service Error (${response.status}): ${errText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Pollinations returns the image directly, not JSON with a URL
    // We need to convert this to match the expected format (similar to OpenAI's response)
    const imageBlob = await response.blob();
    
    // Convert blob to base64 data URL
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${imageBlob.type};base64,${base64}`;
    
    // Return in the same format as the old API (with a data array containing url)
    const data = {
      data: [{
        url: dataUrl
      }]
    };
    
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