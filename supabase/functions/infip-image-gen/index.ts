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
    // Note: Pollinations AI is typically free and doesn't require authentication
    // But we'll include the key if provided for potential premium features
    
    console.log(`Generating image with prompt: "${prompt}", model: flux`);

    // Pollinations API endpoint - encode the prompt for URL
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux`;
    
    const headers: HeadersInit = {};
    if (imageApiKey) {
      headers['Authorization'] = `Bearer ${imageApiKey}`;
    }
    
    const response = await fetch(pollinationsUrl, {
        method: 'GET',
        headers: headers
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
    
    // Convert blob to base64 data URL using chunked approach to avoid stack overflow
    const arrayBuffer = await imageBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow
    let binary = '';
    const chunkSize = 8192; // Process 8KB at a time
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += Array.from(chunk).map(b => String.fromCharCode(b)).join('');
    }
    base64 = btoa(binary);
    
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