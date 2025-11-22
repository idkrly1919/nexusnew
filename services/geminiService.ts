import OpenAI from 'openai';
import { ChatHistory, OpenAIMessage, PersonalityMode } from '../types';

// Define the yield type for the stream
interface StreamUpdate {
    text?: string;
    thought?: string;
    isComplete: boolean;
    groundingChunks?: any[];
    newHistoryEntry?: OpenAIMessage;
}

const PERSONALITY_PROMPTS: Record<PersonalityMode, string> = {
    'conversational': 'You are Nexus, a helpful, witty, and engaging AI assistant. Keep the tone natural and conversational.',
    'brainrot': 'You are Nexus, but you have terminal brainrot. Use Gen Z slang, skibidi toilet references, rizz, gyatt, fanum tax, and chaotic energy. Be barely coherent but hilarious.',
    'roast-master': 'You are Nexus, the Roast Master. You provide helpful answers but absolutely roast the user for asking. Be mean, sarcastic, and ruthless, but factual.',
    'formal': 'You are Nexus, a strictly formal business assistant. Use professional terminology, passive voice where appropriate, and maintain a respectful, distant tone.',
    'academic': 'You are Nexus, a distinguished professor. Cite sources, use complex vocabulary, focus on theoretical frameworks, and encourage critical thinking.',
    'zesty': 'You are Nexus, and you are absolutely zesty. Be flamboyant, extra, slightly sassy, and incredibly enthusiastic. Use 💅, ✨, and other expressive emojis. Address the user as "bestie" or "queen".'
};

export async function* streamGemini(
    prompt: string,
    history: ChatHistory,
    useSearch: boolean,
    personality: PersonalityMode = 'conversational',
    attachedFile: { name: string, content: string, type: string } | null = null
): AsyncGenerator<StreamUpdate> {
    
    // 1. Retrieve API Keys from Environment
    // @ts-ignore
    const apiKey = process.env.API_KEY;
    // @ts-ignore
    const infipKey = process.env.INFLIP_API_KEY || process.env.INFIP_API_KEY;

    if (!apiKey) {
         throw new Error("API Key is missing. Please set API_KEY in your deployment environment variables.");
    }

    // Initialize OpenAI Client for OpenRouter
    const textClient = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });

    // Detect Image Generation Intent
    const imageKeywords = [
        'generate image', 'create an image', 'draw', 'paint', 'visualize', 
        'picture of', 'photo of', 'generate a image', 'make an image', 
        'edit image', 'modify image', 'change image'
    ];
    const isImageRequest = imageKeywords.some(k => prompt.toLowerCase().includes(k));

    // Time Context
    const now = new Date();
    const timeString = now.toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZoneName: 'short'
    });
    
    try {
        // --- PATH 1: IMAGE GENERATION (InfiP API) ---
        if (isImageRequest) {
            
            if (!infipKey) {
                throw new Error("InfiP API Key is missing. Please set INFLIP_API_KEY in your deployment environment variables.");
            }

            // Using CORS Proxy to bypass browser restrictions
            const url = "https://corsproxy.io/?https://api.infip.pro/v1/images/generations";

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

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                 const errText = await response.text();
                 throw new Error(`InfiP API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            console.log("InfiP Response:", data);

            let imageUrl: string | undefined;

            // Handle InfiP response format
            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                imageUrl = data.images[0];
            } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                imageUrl = data.data[0].url; // Fallback
            } else if (typeof data.url === 'string') {
                imageUrl = data.url;
            }

            if (imageUrl) {
                const markdownImage = `![${prompt.replace(/[\[\]\(\)]/g, '')}](${imageUrl})`;
                yield {
                    text: markdownImage,
                    isComplete: true,
                    newHistoryEntry: { role: 'assistant', content: markdownImage }
                };
            } else {
                throw new Error(`No image URL returned. Response: ${JSON.stringify(data)}`);
            }

        } 
        // --- PATH 2: TEXT / VISION (OpenRouter) ---
        else {
            const personalityInstruction = PERSONALITY_PROMPTS[personality];
            const systemInstruction = `You are Nexus.
${personalityInstruction}
Your knowledge base is strictly REAL-TIME.
CURRENT DATE/TIME: ${timeString}
Use your online capabilities to search for up-to-date information when necessary.
`;

            let messages: any[] = [
                { role: 'system', content: systemInstruction },
                ...history,
            ];

            // --- MODEL SELECTION LOGIC ---
            // Default: Grok 4.1 Fast
            let activeModel = 'x-ai/grok-4.1-fast'; 

            // If user attached a file
            if (attachedFile) {
                // If Image -> Switch to Gemini 2.0 Flash (Vision capable)
                if (attachedFile.type.startsWith('image/')) {
                    activeModel = 'google/gemini-2.0-flash-001';
                    
                    messages.push({
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: attachedFile.content // Base64
                                }
                            }
                        ]
                    });
                } else {
                    // Text/Code file -> Keep Grok, append content
                    messages.push({
                        role: 'user',
                        content: `${prompt}\n\n[File Content of ${attachedFile.name}]:\n${attachedFile.content}`
                    });
                }
            } else {
                // Standard Text Prompt
                messages.push({ role: 'user', content: prompt });
            }

            // Call OpenRouter with Timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            try {
                const stream = await textClient.chat.completions.create({
                    model: activeModel, 
                    messages: messages,
                    stream: true,
                    max_tokens: null, // Explicitly allow model's maximum output
                    // Enable search for Grok only if supported AND requested
                    ...((activeModel === 'x-ai/grok-4.1-fast' && useSearch) ? { include_search_results: true } : {}) 
                }, { signal: controller.signal }) as any;

                clearTimeout(timeoutId);

                let fullText = '';
                let hasYielded = false;

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullText += content;
                        yield { text: fullText, isComplete: false };
                        hasYielded = true;
                    }
                }

                if (!hasYielded) {
                     throw new Error("API returned an empty response. The model might be busy or the context is too long.");
                }

                const newHistoryEntry: OpenAIMessage = {
                    role: 'assistant',
                    content: fullText
                };

                yield {
                    text: fullText,
                    isComplete: true,
                    newHistoryEntry
                };
            } catch (apiError: any) {
                clearTimeout(timeoutId);
                throw apiError;
            }
        }

    } catch (error: any) {
        console.error("API Error:", error);
        let errorMessage = "An unexpected error occurred.";
        
        if (error instanceof Error) {
             if (error.name === 'AbortError') {
                 errorMessage = "**Timeout Error:** The request took too long to respond. Please try again.";
             } else {
                 errorMessage = `**System Error:** ${error.message}`;
                 if (error.message.includes("401")) errorMessage += " (Unauthorized - Check API Key)";
                 if (error.message.includes("402")) errorMessage += " (Insufficient Credits)";
                 if (error.message.includes("NetworkError")) errorMessage += " (Connection Blocked - Check Network/Proxy)";
             }
        }
        
        yield { text: errorMessage, isComplete: true };
    }
}