
import { GoogleGenAI } from "@google/genai";
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
    personality: PersonalityMode = 'conversational'
): AsyncGenerator<StreamUpdate> {
    
    // Use Google GenAI SDK
    // API Key must be obtained exclusively from process.env.API_KEY
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        yield { text: "Error: API_KEY is missing in environment variables.", isComplete: true };
        return;
    }

    const ai = new GoogleGenAI({ apiKey });

    // Detect Image Intent
    const imageKeywords = [
        'generate image', 'create an image', 'draw', 'paint', 'visualize', 
        'picture of', 'photo of', 'generate a image', 'make an image', 
        'edit image', 'modify image', 'change image'
    ];
    const isImageRequest = imageKeywords.some(k => prompt.toLowerCase().includes(k));

    // System Instruction
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
    
    const personalityInstruction = PERSONALITY_PROMPTS[personality];
    const systemInstruction = `You are Nexus. ${personalityInstruction}
Current Date/Time: ${timeString}`;

    try {
        if (isImageRequest) {
            // Image Generation using gemini-2.5-flash-image
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [{ text: prompt }]
                }
            });
            
            let imageUrl = '';
            let text = '';
            
            // The output response may contain both image and text parts; iterate through all parts.
            const candidate = response.candidates?.[0];
            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData) {
                        const base64EncodeString = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || 'image/png';
                        imageUrl = `data:${mimeType};base64,${base64EncodeString}`;
                    } else if (part.text) {
                        text += part.text;
                    }
                }
            }

            if (imageUrl) {
                // Display the image in Markdown
                const markdownImage = `![Generated Image](${imageUrl})`;
                const combinedContent = text ? `${text}\n\n${markdownImage}` : markdownImage;
                
                yield {
                    text: combinedContent,
                    isComplete: true,
                    newHistoryEntry: {
                        role: 'assistant',
                        content: combinedContent
                    }
                };
            } else {
                yield {
                    text: text || "Sorry, I couldn't generate an image.",
                    isComplete: true,
                    newHistoryEntry: {
                        role: 'assistant',
                        content: text || "Failed to generate image."
                    }
                };
            }

        } else {
            // Text Generation using gemini-2.5-flash
            
            // Convert history to Gemini Content format
            const contents = history.map(msg => {
                if (msg.role === 'system') return null;
                return {
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                };
            }).filter(c => c !== null);

            // Add current prompt
            contents.push({
                role: 'user',
                parts: [{ text: prompt }]
            });

            // Configure tools
            const tools = [];
            if (useSearch) {
                tools.push({ googleSearch: {} });
            }

            const streamResponse = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: {
                    systemInstruction: systemInstruction,
                    tools: tools.length > 0 ? tools : undefined,
                }
            });

            let fullText = '';
            let groundingChunks: any[] = [];

            for await (const chunk of streamResponse) {
                if (chunk.text) {
                    fullText += chunk.text;
                    yield { text: fullText, isComplete: false };
                }
                
                if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    groundingChunks = chunk.candidates[0].groundingMetadata.groundingChunks;
                    yield { text: fullText, isComplete: false, groundingChunks };
                }
            }

            yield {
                text: fullText,
                isComplete: true,
                groundingChunks,
                newHistoryEntry: {
                    role: 'assistant',
                    content: fullText
                }
            };
        }

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        let errorMessage = "An unexpected error occurred.";
        
        if (error instanceof Error) {
             errorMessage = `**System Error:** ${error.message}`;
             if (error.message.includes("API key")) {
                 errorMessage += "\n\n(Please configure your environment variables)";
             }
        }
        
        yield { text: errorMessage, isComplete: true };
    }
}
