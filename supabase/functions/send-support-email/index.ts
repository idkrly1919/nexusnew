// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
// @ts-ignore
import nodemailer from "npm:nodemailer@6.9.13";

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

    // Validate required secrets
    // @ts-ignore
    const smtpUser = Deno.env.get("SMTP_USER");
    // @ts-ignore
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpUser || !smtpPass) {
        console.error("Missing SMTP credentials.");
        return new Response(
            JSON.stringify({ error: "Server configuration error: Missing email credentials." }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Configure the transporter for iCloud
    const transporter = nodemailer.createTransport({
        host: "smtp.mail.me.com",
        port: 587,
        secure: false, // false for 587 (STARTTLS)
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    const subject = type === 'support' 
        ? `[Support] ${category} - ${firstName} ${lastName}`
        : `[Suggestion] ${category} - ${firstName} ${lastName}`;

    const htmlContent = `
        <h2>New ${type === 'support' ? 'Support Request' : 'Suggestion'}</h2>
        <p><strong>From:</strong> ${firstName} ${lastName} (<a href="mailto:${email}">${email}</a>)</p>
        <p><strong>Category:</strong> ${category}</p>
        <hr />
        <h3>Message:</h3>
        <p style="white-space: pre-wrap;">${message}</p>
    `;

    // Send the email
    const info = await transporter.sendMail({
        from: `"Quillix System" <${smtpUser}>`, // Must match the authenticated user
        to: targetEmail, 
        replyTo: email, // Allows you to reply directly to the user
        subject: subject,
        html: htmlContent,
    });

    console.log("Email sent successfully:", info.messageId);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error sending email:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})