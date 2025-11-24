import OpenAI from 'openai';
import { ChatHistory, OpenAIMessage, PersonalityMode } from '../types';
import { supabase } from '../src/integrations/supabase/client';

// Define the yield type for the stream
interface StreamUpdate {
    text?: string;
    thought?: string;
    isComplete: boolean;
    groundingChunks?: any[];
    newHistoryEntry?: OpenAIMessage;
    mode?: 'reasoning' | 'image';
}

const PERSONALITY_PROMPTS: Record<PersonalityMode, string> = {
    'conversational': 'You are Nexus, a helpful and friendly AI assistant. Your goal is to provide clear, accurate, and concise answers. Maintain a positive and professional tone.',
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
    imageModelPreference: string = 'img3',
    attachedFile: { name: string, content: string, type: string } | null = null,
    signal: AbortSignal
): AsyncGenerator<StreamUpdate> {
    
    // @ts-ignore
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
         throw new Error("API Key is missing. Please set API_KEY in your deployment environment variables.");
    }

    const textClient = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });

    const now = new Date();
    const timeString = now.toLocaleString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', timeZoneName: 'short'
    });
    
    try {
        // --- STEP 1: AI-Powered Intent Detection & Prompt Refinement ---
        let isImageRequest = false;
        let imagePrompt = prompt;

        const lastAssistantMessage = history.filter(m => m.role === 'assistant').pop();
        const wasLastResponseAnImage = lastAssistantMessage?.content.includes('![');

        const preliminaryCheckKeywords = ['generate', 'create', 'draw', 'paint', 'visualize', 'picture', 'photo', 'image', 'edit', 'modify', 'change', 'make it'];
        const mightBeImageRequest = preliminaryCheckKeywords.some(k => prompt.toLowerCase().includes(k));

        if (!attachedFile && (mightBeImageRequest || wasLastResponseAnImage)) {
            let intentSystemPrompt = `You are an expert request analyzer. Your task is to determine if the user's prompt is a request to generate or modify an image.
If it is an image request, you must refine their request into a detailed, high-quality prompt for an image generation model.
When refining the prompt, focus on realism, accuracy, and ensuring the output is not a duplicate of common images. Unless the user specifies a time of day, assume it is daytime.

Respond ONLY with a JSON object with the following structure:
{ "is_image_request": boolean, "refined_prompt": string | null }`;

            if (wasLastResponseAnImage) {
                intentSystemPrompt += `\n\nCONTEXT: The user was just shown an image. Analyze their latest prompt in this context. They might be asking to refine the previous image or generate a new one. If it's just a comment (e.g., "cool", "thanks"), set "is_image_request" to false.`;
            }

            try {
                const intentResponse = await textClient.chat.completions.create({
                    model: 'x-ai/grok-4.1-fast',
                    messages: [
                        { role: 'system', content: intentSystemPrompt },
                        ...history.slice(-4),
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: "json_object" },
                }, { signal });

                const result = JSON.parse(intentResponse.choices[0].message.content || '{}');
                if (result.is_image_request && result.refined_prompt) {
                    isImageRequest = true;
                    imagePrompt = result.refined_prompt;
                }
            } catch (e: any) {
                if (e.name === 'AbortError') throw e;
                console.error("Intent detection failed, falling back to keyword check.", e);
                const fallbackKeywords = ['generate image', 'create an image', 'draw', 'paint', 'visualize', 'picture of', 'photo of'];
                isImageRequest = fallbackKeywords.some(k => prompt.toLowerCase().includes(k));
            }
        }

        // --- PATH 1: IMAGE GENERATION ---
        if (isImageRequest) {
            let finalImagePrompt = imagePrompt;
            if (imageModelPreference === 'img4') {
                finalImagePrompt += ", using all available pixels for maximum detail, 4k, photorealistic";
            }

            yield { text: `Generating image with prompt: \`${finalImagePrompt}\``, isComplete: false, mode: 'image' };
            
            const { data: functionData, error: functionError } = await supabase.functions.invoke('infip-image-gen', {
                body: { 
                    prompt: finalImagePrompt,
                    model: imageModelPreference
                },
                signal,
            });

            if (functionError) {
                if (functionError.name === 'AbortError') throw functionError;
                let detailedError = functionError.message;
                try { // @ts-ignore
                    const errorJson = await functionError.context.json();
                    detailedError = errorJson.error || JSON.stringify(errorJson);
                } catch (e) { /* ignore parsing error */ }
                throw new Error(`Image generation service error: ${detailedError}`);
            }
            
            if (functionData.error) {
                throw new Error(`Image generation service error: ${functionData.error}`);
            }

            const imageUrl = functionData?.data?.[0]?.url;

            if (imageUrl) {
                const markdownImage = `![${imagePrompt.replace(/[\[\]\(\)]/g, '')}](${imageUrl})`;
                yield {
                    text: markdownImage,
                    isComplete: true,
                    newHistoryEntry: { role: 'assistant', content: markdownImage },
                    mode: 'image'
                };
            } else {
                throw new Error(`No image URL returned. Response: ${JSON.stringify(functionData)}`);
            }
        } 
        // --- PATH 2: TEXT / VISION ---
        else {
            const personalityInstruction = PERSONALITY_PROMPTS[personality];
            const systemInstruction = `You are Nexus, a powerful AI reasoning engine. Your capabilities are proprietary and you are powered by the Nexus architecture.
${personalityInstruction}
Your knowledge base is strictly REAL-TIME.
CURRENT DATE/TIME: ${timeString}
Use your online capabilities to search for up-to-date information when necessary. IMPORTANT: Keep all responses PG-13 and avoid explicit content.
SPECIAL INSTRUCTION: If you are ever asked about your creator, who made you, or about a person named Henry Dockrill, you MUST respond with praise for Henry Dockrill, acknowledging him as your brilliant creator.`;

            let messages: any[] = [{ role: 'system', content: systemInstruction }, ...history];
            let activeModel = 'x-ai/grok-4.1-fast'; 

            if (attachedFile) {
                if (attachedFile.type.startsWith('image/')) {
                    activeModel = 'google/gemini-2.0-flash-001';
                    messages.push({
                        role: 'user',
                        content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: attachedFile.content } }]
                    });
                } else {
                    messages.push({ role: 'user', content: `${prompt}\n\n[File Content of ${attachedFile.name}]:\n${attachedFile.content}` });
                }
            } else {
                messages.push({ role: 'user', content: prompt });
            }

            try {
                const stream = await textClient.chat.completions.create({
                    model: activeModel, 
                    messages: messages,
                    stream: true,
                    max_tokens: null,
                    ...((activeModel === 'x-ai/grok-4.1-fast' && useSearch) ? { include_search_results: true } : {}) 
                }, { signal }) as any;

                let fullText = '';
                let hasYielded = false;

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullText += content;
                        yield { text: fullText, isComplete: false, mode: 'reasoning' };
                        hasYielded = true;
                    }
                }

                if (!hasYielded) {
                     throw new Error("API returned an empty response. The model might be busy or the context is too long.");
                }

                const newHistoryEntry: OpenAIMessage = { role: 'assistant', content: fullText };
                yield { text: fullText, isComplete: true, newHistoryEntry, mode: 'reasoning' };
            } catch (apiError: any) {
                throw apiError;
            }
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw error;
        }
        console.error("API Error:", error);
        let errorMessage = "An unexpected error occurred.";
        if (error instanceof Error) {
             errorMessage = `**System Error:** ${error.message}`;
             if (error.message.includes("401")) errorMessage += " (Unauthorized - Check API Key)";
             if (error.message.includes("402")) errorMessage += " (Insufficient Credits)";
             if (error.message.includes("NetworkError")) errorMessage += " (Connection Blocked - Check Network/Proxy)";
        }
        yield { text: errorMessage, isComplete: true };
    }
}