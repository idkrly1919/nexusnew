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
    const { type, targetEmail, firstName, lastName, email, category, message } = await req.json();

    // In a real production environment with an email provider (like Resend, SendGrid, AWS SES),
    // you would make an API call here to send the actual email.
    // Since we don't have those keys configured, we will log the email details to the console.
    // You can view these logs in the Supabase Dashboard -> Edge Functions -> Logs.

    console.log(`--- NEW ${type.toUpperCase()} REQUEST ---`);
    console.log(`To: ${targetEmail}`);
    console.log(`From: ${firstName} ${lastName} <${email}>`);
    console.log(`Category: ${category}`);
    console.log(`Message: ${message}`);
    console.log(`-------------------------------------`);

    return new Response(
      JSON.stringify({ success: true, message: "Support request received" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error processing support request:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})