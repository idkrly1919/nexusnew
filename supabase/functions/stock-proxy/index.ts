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
    const { symbol, range, interval } = await req.json()
    
    if (!symbol) {
        return new Response(JSON.stringify({ error: "Symbol is required" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Default to 1 day if not specified
    const r = range || '1d';
    const i = interval || '5m';

    console.log(`Fetching stock data for ${symbol} with range ${r} and interval ${i}`);

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${i}&range=${r}`;
    
    const response = await fetch(yahooUrl);
    
    if (!response.ok) {
        const text = await response.text();
        console.error("Yahoo API Error:", text);
        throw new Error(`Failed to fetch stock data: ${response.statusText}`);
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