import 'react-native-url-polyfill/auto';
import OpenAI from 'openai';

// NOTE: In a real app, API keys should not be hardcoded or stored in client-side code without safeguards.
// Ideally, proxy these requests through your Supabase Edge Functions.
const API_KEY = ""; // User needs to provide this or fetch from Supabase secrets if set up that way

const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: API_KEY, 
    dangerouslyAllowBrowser: true 
});

export const sendMessage = async (message: string, history: any[]) => {
    try {
        const response = await client.chat.completions.create({
            model: "x-ai/grok-4.1-fast",
            messages: [
                { role: "system", content: "You are Quillix, a helpful AI assistant on mobile." },
                ...history,
                { role: "user", content: message }
            ],
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("AI Error:", error);
        return "I'm having trouble connecting to the network right now.";
    }
};