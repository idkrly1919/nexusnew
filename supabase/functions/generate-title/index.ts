// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
// @ts-ignore
import { OpenAI } from "https://esm.sh/openai@4.33.0";

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
    const { message } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // @ts-ignore
    const apiKey = Deno.env.get('HIGGSFIELD_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key secret (e.g., HIGGSFIELD_API_KEY) is not set.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const textClient = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
    });

    const systemPrompt = "You are a title generation expert. Based on the user's first message, create a concise and relevant title for the conversation. The title must be 4 words or less. Respond ONLY with the generated title, nothing else.";

    const response = await textClient.chat.completions.create({
        model: 'x-ai/grok-4.1-fast',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
        ],
        max_tokens: 20,
        temperature: 0.5,
    });

    const title = response.choices[0].message.content?.trim().replace(/["']/g, "") || "New Chat";

    return new Response(
      JSON.stringify({ title }),
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