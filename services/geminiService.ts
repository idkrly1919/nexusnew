
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
    
    // Use OpenAI SDK for Text Generation (OpenRouter)
    // Retrieve API Key from environment variables (injected by Vite build)
    const apiKey = process.env.API_KEY;
    
    const textClient = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });

    // Detect Image Intent
    const imageKeywords = [
        'generate image', 'create an image', 'draw', 'paint', 'visualize', 
        'picture of', 'photo of', 'generate a image', 'make an image', 
        'edit image', 'modify image', 'change image'
    ];
    const isImageRequest = imageKeywords.some(k => prompt.toLowerCase().includes(k));

    // Inject dynamic real-time date
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
        if (!apiKey) {
             throw new Error("API Key missing. Please check your environment variables (API_KEY).");
        }

        if (isImageRequest) {
            // 1. PROMPT REFINEMENT (Using Grok)
            let refinedPrompt = prompt;
            try {
                const refinementResponse = await textClient.chat.completions.create({
                    model: 'x-ai/grok-4.1-fast',
                    messages: [
                        { 
                            role: 'system', 
                            content: `You are an expert AI Art Prompt Engineer. 
                            Your task is to rewrite the user's request into a highly detailed, photorealistic image generation prompt.
                            
                            MANDATORY REQUIREMENTS:
                            1. Include keywords: "4k uhd", "ultrarealistic", "high detail", "photorealistic", "masterpiece".
                            2. Ensure NO duplicate tags/keywords.
                            3. Describe lighting, texture, and composition if not specified.
                            4. Output ONLY the raw prompt string. Do not include "Here is the prompt:" or quotes.` 
                        },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 300
                });
                
                const refinedText = refinementResponse.choices[0]?.message?.content?.trim();
                if (refinedText) {
                    refinedPrompt = refinedText;
                }
            } catch (refinementError) {
                console.warn("Prompt refinement failed, using original:", refinementError);
            }

            // 2. IMAGE GENERATION (InfiP API via CORS Proxy)
            // Retrieve InfiP Key from environment (checking both correct name and typo version)
            const infipKey = process.env.INFIP_API_KEY;
            
            if (!infipKey) {
                throw new Error("InfiP API Key missing. Please check your environment variables (INFIP_API_KEY or INFLIP_API_KEY).");
            }

            const url = "https://corsproxy.io/?https://api.infip.pro/v1/images/generations";

            const headers = {
                "Authorization": `Bearer ${infipKey}`,
                "Content-Type": "application/json"
            };

            const payload = {
                model: "img4",
                prompt: refinedPrompt,
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
                 throw new Error(`Image API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            
            let imageUrl: string | undefined;

            // Handle various response formats
            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                imageUrl = data.images[0];
            } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                // Fallback for OpenAI-style response { data: [{ url: "..." }] }
                imageUrl = data.data[0].url;
            } else if (typeof data.url === 'string') {
                imageUrl = data.url;
            }

            if (imageUrl) {
                // Display the prompt used in alt text for reference
                const markdownImage = `![${refinedPrompt.replace(/[\[\]\(\)]/g, '')}](${imageUrl})`;
                
                yield {
                    text: markdownImage,
                    isComplete: true,
                    newHistoryEntry: {
                        role: 'assistant',
                        content: markdownImage
                    }
                };
            } else {
                throw new Error(`No image URL found in API response: ${JSON.stringify(data)}`);
            }

        } else {
            // TEXT GENERATION PATH (OpenRouter)
            
            const personalityInstruction = PERSONALITY_PROMPTS[personality];
            const systemInstruction = `You are Nexus.
${personalityInstruction}
Your knowledge base is strictly REAL-TIME.
CURRENT DATE/TIME: ${timeString}
Use your online capabilities to search for up-to-date information when necessary.
`;

            // --- MULTIMODAL LOGIC ---
            let messages: any[] = [
                { role: 'system', content: systemInstruction },
                ...history,
            ];

            let activeModel = 'x-ai/grok-4.1-fast'; // Default Text Model

            // If user attached a file
            if (attachedFile) {
                // If Image -> Switch to Vision Capable Model (Flash 2.0 on OpenRouter)
                // Grok 4.1 is primarily text; Flash 2.0 is excellent at vision and free/cheap on OpenRouter.
                if (attachedFile.type.startsWith('image/')) {
                    activeModel = 'google/gemini-2.0-flash-001';
                    
                    messages.push({
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: attachedFile.content // This is the Base64 string from ChatView
                                }
                            }
                        ]
                    });
                } else {
                    // Text file - append content to prompt
                    messages.push({
                        role: 'user',
                        content: `${prompt}\n\n[File Content of ${attachedFile.name}]:\n${attachedFile.content}`
                    });
                }
            } else {
                // Standard Text Prompt
                messages.push({ role: 'user', content: prompt });
            }

            // Fix: Cast result to any to allow iteration
            const stream = await textClient.chat.completions.create({
                model: activeModel, 
                messages: messages,
                stream: true,
                max_tokens: 4000, 
                // Force search capability for text model (Grok)
                ...((activeModel === 'x-ai/grok-4.1-fast') ? { include_search_results: true } : {}) 
            }) as any;

            let fullText = '';

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullText += content;
                    yield { text: fullText, isComplete: false };
                }
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
        }

    } catch (error: any) {
        console.error("API Error:", error);
        let errorMessage = "An unexpected error occurred.";
        
        if (error instanceof Error) {
             errorMessage = `**System Error:** ${error.message}`;
             
             if (error.message.includes("402")) {
                 errorMessage += "\n\n(Insufficient credits on API key)";
             }
             if (error.message.includes("401")) {
                 errorMessage += "\n\n(Unauthorized: Check API Key)";
             }
             if (error.message.includes("400")) {
                 errorMessage += "\n\n(Invalid request configuration)";
             }
             if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
                 errorMessage += "\n\n(Network Blocked: CORS issue or connection failed)";
             }
        }
        
        yield { text: errorMessage, isComplete: true };
    }
}
