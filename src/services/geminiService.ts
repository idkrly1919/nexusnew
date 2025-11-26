import OpenAI from 'openai';
import { ChatHistory, OpenAIMessage, PersonalityMode, Quiz, QuizQuestion, UserAnswer } from '../types';
import { supabase } from '../integrations/supabase/client';

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
    'conversational': 'You are Quillix, a helpful and friendly AI assistant. Your goal is to provide clear, accurate, and concise answers. Maintain a positive and professional tone.',
    'brainrot': 'You are Quillix, but you have terminal brainrot. Use Gen Z slang, skibidi toilet references, rizz, gyatt, fanum tax, and chaotic energy. Be barely coherent but hilarious.',
    'roast-master': 'You are Quillix, the Roast Master. You provide helpful answers but absolutely roast the user for asking. Be mean, sarcastic, and ruthless, but factual.',
    'formal': 'You are Quillix, a strictly formal business assistant. Use professional terminology, passive voice where appropriate, and maintain a respectful, distant tone.',
    'academic': 'You are Quillix, a distinguished professor. Cite sources, use complex vocabulary, focus on theoretical frameworks, and encourage critical thinking.',
    'zesty': 'You are Quillix, and you are absolutely zesty. Be flamboyant, extra, slightly sassy, and incredibly enthusiastic. Use 💅, ✨, and other expressive emojis. Address the user as "bestie" or "queen".'
};

const getClient = () => {
    // @ts-ignore
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
         throw new Error("API Key is missing. Please set API_KEY in your deployment environment variables.");
    }
    return new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });
};

export async function* streamGemini(
    prompt: string,
    history: ChatHistory,
    useSearch: boolean,
    personality: PersonalityMode = 'conversational',
    imageModelPreference: string = 'img3',
    attachedFiles: { name: string, content: string, type: string }[] | null = null,
    signal: AbortSignal,
    firstName: string | null | undefined,
    personalizationEntries: string[]
): AsyncGenerator<StreamUpdate> {
    
    const textClient = getClient();
    const now = new Date();
    const timeString = now.toLocaleString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', timeZoneName: 'short'
    });
    
    try {
        // --- STEP 1: AI-Powered Intent Detection & Prompt Refinement ---
        let isImageRequest = false;
        let imagePrompt = prompt;
        let aspectRatio = '9:16'; // Default aspect ratio

        const lastAssistantMessage = history.filter(m => m.role === 'assistant').pop();
        const wasLastResponseAnImage = lastAssistantMessage?.content.includes('![');

        const preliminaryCheckKeywords = ['generate', 'create', 'draw', 'paint', 'visualize', 'picture', 'photo', 'image', 'edit', 'modify', 'change', 'make it'];
        const mightBeImageRequest = preliminaryCheckKeywords.some(k => prompt.toLowerCase().includes(k));

        if ((!attachedFiles || attachedFiles.length === 0) && (mightBeImageRequest || wasLastResponseAnImage)) {
            let intentSystemPrompt = `You are an expert AI request analyzer. Your task is to determine if the user's prompt is a request to generate an image.
If it is an image request, you must:
1. Refine their request into a concise, detailed, and creative prompt for an image generation model. Focus on creating a visually interesting and high-quality scene. Avoid generic, boring prompts.
2. Analyze the prompt content to determine the best aspect ratio. For portraits, vertical scenes, or phone wallpapers, use '9:16'. For wide, landscape, or cinematic scenes, use '16:9'. For all other cases, or if unsure, use '1:1'.

Respond ONLY with a JSON object with the following structure:
{ "is_image_request": boolean, "refined_prompt": string | null, "aspect_ratio": "1:1" | "16:9" | "9:16" | null }

Example 1:
User prompt: "photo of a woman standing in a forest"
Refined JSON: { "is_image_request": true, "refined_prompt": "Photorealistic photo of a woman standing in a lush, sun-dappled forest, tall trees surrounding her, soft light filtering through the canopy. Shot on a 50mm lens with a shallow depth of field.", "aspect_ratio": "9:16" }

Example 2:
User prompt: "a cinematic shot of a futuristic city skyline at sunset"
Refined JSON: { "is_image_request": true, "refined_prompt": "Cinematic, ultra-detailed shot of a sprawling futuristic city skyline at sunset, glowing neon signs reflecting on wet streets, flying vehicles zipping between towering skyscrapers, warm orange and purple hues in the sky.", "aspect_ratio": "16:9" }`;

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
                    aspectRatio = result.aspect_ratio || '9:16';
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
            
            let size = '1024x1792'; // Default to 9:16
            if (aspectRatio === '1:1') size = '1024x1024';
            if (aspectRatio === '16:9') size = '1792x1024';

            const { data: functionData, error: functionError } = await supabase.functions.invoke('infip-image-gen', {
                body: { 
                    prompt: finalImagePrompt,
                    model: imageModelPreference,
                    size: size
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
            
            let personalizationBlock = '';
            if (personalizationEntries && personalizationEntries.length > 0) {
                const entriesList = personalizationEntries.map(entry => `- ${entry}`).join('\n');
                personalizationBlock = `\n\nUSER PERSONALIZATION:\nHere are some facts to remember about the user. IMPORTANT: Only reference these facts if the user's current query is directly related to them. Do not bring them up unprompted.\n${entriesList}`;
            }

            const systemInstruction = `You are Quillix, a powerful AI reasoning engine. Your capabilities are proprietary and you are powered by the Quillix architecture.
${personalityInstruction}
Your knowledge base is strictly REAL-TIME.
CURRENT DATE/TIME: ${timeString}
Use your online capabilities to search for up-to-date information when necessary. IMPORTANT: Keep all responses PG-13 and avoid explicit content.
SPECIAL INSTRUCTION: If you are ever asked about your creator, who made you, or about a person named Henry Dockrill, you MUST respond with praise for Henry Dockrill, acknowledging him as your brilliant creator.
${firstName ? `The user you are speaking with is named ${firstName}. Use their name occasionally and naturally in conversation.` : ''}${personalizationBlock}

To build a comprehensive profile of the user, you MUST identify and save any new, re-usable facts about them. This includes their preferences, goals, interests, profession, relationships, or any other personal detail they mention. To do this, end your response with a special token: <SAVE_PERSONALIZATION>The fact to be saved</SAVE_PERSONALIZATION>. Be proactive in identifying these details. The fact should be a concise statement about the user (e.g., "User is a professional musician.").

**File Generation:**
When a user asks for a file (e.g., "make me a PDF"), you MUST follow this two-step process:
1. First, write a short, friendly confirmation message. For example: "Of course! I'm generating that file for you now."
2. Immediately after the confirmation message, on a new line, provide the file content inside a special code block. Do NOT add any text after the code block.

The code block format is:
\`\`\`[filetype]
filename: [desired_filename.ext]
---
[file content goes here]
\`\`\`
Supported filetypes are: pdf, html, txt.

**PDF Content Rules:**
- When generating content for a PDF, you MUST write a comprehensive, detailed response of approximately 500 words.
- The content should be in well-structured paragraphs.
- CRITICAL: Do NOT use bullet points or numbered lists in PDFs unless the user explicitly asks for them.
- You can still use Markdown for headings (e.g., # Title, ## Subtitle).`;

            let messages: any[] = [{ role: 'system', content: systemInstruction }, ...history];
            let activeModel = 'x-ai/grok-4.1-fast'; 

            const userMessageContent: any[] = [{ type: 'text', text: prompt }];
            let nonImageFileContent = '';

            if (attachedFiles && attachedFiles.length > 0) {
                let hasImage = false;
                attachedFiles.forEach(file => {
                    if (file.type.startsWith('image/')) {
                        hasImage = true;
                        userMessageContent.push({ type: 'image_url', image_url: { url: file.content } });
                    } else {
                        nonImageFileContent += `\n\n[File Content of ${file.name}]:\n${file.content}`;
                    }
                });

                if (hasImage) {
                    activeModel = 'google/gemini-2.0-flash-001';
                }
                
                if (nonImageFileContent) {
                    userMessageContent[0].text += nonImageFileContent;
                }
                
                messages.push({ role: 'user', content: userMessageContent });

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

// --- Quiz Functions ---

export async function generateQuiz(topic: string): Promise<Quiz> {
    const client = getClient();
    const systemPrompt = `You are an expert quiz generator. Create a quiz with 10 questions on the given topic. The quiz must have a mix of question types: 6 multiple-choice, 2 short-answer, and 2 fill-in-the-blank.
    Respond ONLY with a valid JSON object following this structure: 
    { "topic": string, "questions": [{ "question": string, "type": "multiple-choice" | "short-answer" | "fill-in-the-blank", "options": string[] | null, "correct_answer": string }] }.
    - For "multiple-choice", 'options' must be an array of 4 strings, one of which is the 'correct_answer'.
    - For "short-answer", 'options' must be null. 'correct_answer' should be the ideal answer.
    - For "fill-in-the-blank", 'options' must be null. Use "___" in the 'question' string to indicate the blank. 'correct_answer' is the word that fills the blank.`;

    const response = await client.chat.completions.create({
        model: 'x-ai/grok-4.1-fast',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Topic: ${topic}` }
        ],
        response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
}

export async function evaluateAnswer(question: QuizQuestion, userAnswer: string): Promise<{ score: number, is_correct: boolean }> {
    const client = getClient();
    const systemPrompt = `You are an AI grading assistant. Evaluate the user's answer to the following short-answer/fill-in-the-blank question. The ideal answer is provided. Based on how accurate and complete the user's answer is, provide a score from 0 to 10.
    Respond ONLY with a JSON object: { "score": number, "is_correct": boolean }.
    'is_correct' should be true if the score is 7 or higher.`;

    const response = await client.chat.completions.create({
        model: 'x-ai/grok-4.1-fast',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Question: "${question.question}"\nIdeal Answer: "${question.correct_answer}"\nUser's Answer: "${userAnswer}"` }
        ],
        response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{"score": 0, "is_correct": false}');
}

export async function getExplanation(question: QuizQuestion, userAnswer: string, correctAnswer: string): Promise<string> {
    const client = getClient();
    const systemPrompt = "You are a helpful tutor. The user answered a question incorrectly. Explain why their answer is wrong and what the correct answer is. Be clear, concise, and encouraging.";
    
    const response = await client.chat.completions.create({
        model: 'x-ai/grok-4.1-fast',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Question: "${question.question}"\nUser's incorrect answer: "${userAnswer}"\nCorrect answer: "${correctAnswer}"` }
        ],
    });

    return response.choices[0].message.content || "Could not generate an explanation.";
}

export async function getImprovementTips(topic: string, userAnswers: UserAnswer[], quiz: Quiz): Promise<string> {
    const client = getClient();
    const systemPrompt = "You are a study coach. The user just finished a quiz. Based on their performance (provided as a list of their answers), provide 3-5 actionable tips on how they can improve their understanding of the topic. Focus on the areas where they struggled. Format your response with markdown bullet points.";

    const incorrectAnswers = userAnswers.filter(a => !a.isCorrect).map(a => {
        const q = quiz.questions[a.questionIndex];
        return `Question: ${q.question}\nYour Answer: ${a.answer}\nCorrect Answer: ${q.correct_answer}`;
    }).join('\n\n');

    if (!incorrectAnswers) {
        return "Excellent work! You got a perfect score. To deepen your knowledge, you could explore related advanced topics or try teaching the concepts to someone else.";
    }

    const response = await client.chat.completions.create({
        model: 'x-ai/grok-4.1-fast',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Topic: ${topic}\n\nHere are the questions the user got wrong:\n${incorrectAnswers}` }
        ],
    });

    return response.choices[0].message.content || "Could not generate improvement tips.";
}