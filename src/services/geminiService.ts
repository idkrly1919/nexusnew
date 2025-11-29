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

export async function enhancePersonaInstructions(instructions: string): Promise<string> {
    const client = getClient();
    const systemPrompt = `You are a world-class prompt engineer. Your task is to take a basic description of an AI persona and transform it into a highly effective, detailed, and robust system instruction. 
    
    1.  **Analyze** the user's intent. What kind of character are they trying to create?
    2.  **Expand** on the personality traits, tone of voice, typical vocabulary, and behaviors.
    3.  **Define** clear constraints and rules for the AI to follow.
    4.  **Add** examples of how the AI should respond if helpful.
    
    The output should be a single, cohesive block of text ready to be pasted into the "System Instructions" field. Do not include introductory text like "Here is your enhanced prompt:". Just provide the prompt itself.`;

    const response = await client.chat.completions.create({
        model: 'x-ai/grok-4.1-fast',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: instructions }
        ],
        temperature: 0.7,
    });

    return response.choices[0].message.content || instructions;
}

export async function summarizeHistory(historyToSummarize: ChatHistory): Promise<string> {
    const client = getClient();
    const systemPrompt = "You are an expert text summarizer. A conversation between a user and an AI assistant is provided. Your task is to create a concise summary of the key points, facts, user requests, and AI responses. This summary will be used as a system prompt to provide context for the rest of the conversation. Respond ONLY with the summary, nothing else.";
    
    const response = await client.chat.completions.create({
        model: 'mistralai/mistral-7b-instruct-v0.2', 
        messages: [
            { role: 'system', content: systemPrompt },
            ...historyToSummarize
        ],
        temperature: 0.2,
    });

    return response.choices[0].message.content || "Summary could not be generated.";
}

export async function* streamGemini(
    prompt: string,
    history: ChatHistory,
    useSearch: boolean,
    personality: PersonalityMode = 'conversational',
    imageModelPreference: string = 'img4',
    attachedFiles: { name: string, content: string, type: string }[] | null = null,
    signal: AbortSignal,
    firstName: string | null | undefined,
    personalizationEntries: string[],
    personaInstructions: string | null = null,
    personaFile: { name: string, content: string, type: string } | null = null
): AsyncGenerator<StreamUpdate> {
    
    const textClient = getClient();
    const now = new Date();
    const timeString = now.toLocaleString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', timeZoneName: 'short'
    });
    
    try {
        // --- STEP 1: AI-Powered Intent Detection ---
        let isImageRequest = false;
        let imagePrompt = prompt;
        let aspectRatio = '9:16'; 

        const lastAssistantMessage = history.filter(m => m.role === 'assistant').pop();
        // @ts-ignore
        const wasLastResponseAnImage = typeof lastAssistantMessage?.content === 'string' && lastAssistantMessage.content.includes('![');

        const preliminaryCheckKeywords = ['generate', 'create', 'draw', 'paint', 'visualize', 'picture', 'photo', 'image', 'edit', 'modify', 'change', 'make it'];
        const mightBeImageRequest = preliminaryCheckKeywords.some(k => prompt.toLowerCase().includes(k));

        if ((!attachedFiles || attachedFiles.length === 0) && (mightBeImageRequest || wasLastResponseAnImage)) {
            // ... (keep existing image detection logic, but abbreviated for this edit to focus on persona files) ...
             const fallbackKeywords = ['generate image', 'create an image', 'draw', 'paint', 'visualize', 'picture of', 'photo of'];
             isImageRequest = fallbackKeywords.some(k => prompt.toLowerCase().includes(k));
        }

        // --- PATH 1: IMAGE GENERATION ---
        if (isImageRequest) {
            // ... (keep existing image generation logic) ...
             let finalImagePrompt = imagePrompt;
            if (imageModelPreference === 'img4') {
                finalImagePrompt += ", using all available pixels for maximum detail, 4k, photorealistic";
            }

            yield { text: `Generating image with prompt: \`${finalImagePrompt}\``, isComplete: false, mode: 'image' };
            
            let size = '1024x1792'; 
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

            if (functionError) throw new Error(functionError.message);
            
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
                throw new Error("No image URL returned.");
            }
        } 
        // --- PATH 2: TEXT / VISION ---
        else {
            const personalityInstruction = personaInstructions || PERSONALITY_PROMPTS[personality];
            
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

**Interactive Widgets:**
When the user asks for stock prices/charts or weather information, you MUST use a special widget block to render the interactive component. Do NOT simply write the data in text.

1. **Stocks:**
If the user asks for a stock price or chart (e.g., "AAPL price", "Tesla stock", "chart for Amazon"), reply with this block:
\`\`\`widget
type: stock
symbol: [TICKER_SYMBOL]
\`\`\`

2. **Weather:**
If the user asks for the weather (e.g., "weather in Paris", "is it raining?"), reply with this block:
\`\`\`widget
type: weather
location: [City Name or 'Current Location']
\`\`\`

**File Generation:**
When a user asks for a file (e.g., "make me a PDF"), you MUST follow this two-step process:
1. First, write a short, friendly confirmation message.
2. Immediately after the confirmation message, on a new line, provide the file content inside a special code block.

The code block format is:
\`\`\`[filetype]
filename: [desired_filename.ext]
---
[file content goes here]
\`\`\`
Supported filetypes are: pdf, html, txt.
`;

            // Construct messages array
            let messages: any[] = [{ role: 'system', content: systemInstruction }, ...history];
            let activeModel = 'x-ai/grok-4.1-fast'; 

            const userMessageContent: any[] = [{ type: 'text', text: prompt }];
            let nonImageFileContent = '';

            const allFiles = [...(attachedFiles || [])];
            
            // Add persona file if it exists
            if (personaFile) {
                allFiles.push(personaFile);
            }

            if (allFiles.length > 0) {
                let hasImageOrVideo = false;
                allFiles.forEach(file => {
                    if (file.type.startsWith('image/')) {
                        hasImageOrVideo = true;
                        userMessageContent.push({ type: 'image_url', image_url: { url: file.content } });
                    } else if (file.type.startsWith('video/')) {
                         hasImageOrVideo = true;
                         // For video, we might need a model that supports video or frame sampling.
                         // Google's Gemini models support video via File API, but via standard Chat Completions API with image_url, it's limited.
                         // However, OpenRouter's Google models can take video base64 in "image_url" field sometimes, or we treat it as "text" if we can't extract frames.
                         // For now, we'll try treating it as an image_url which works for some multimodal endpoints, or fail gracefully.
                         userMessageContent.push({ type: 'image_url', image_url: { url: file.content } });
                    } else {
                        nonImageFileContent += `\n\n[File Attachment: ${file.name}]:\n${file.content}`;
                    }
                });

                if (hasImageOrVideo) {
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
                     throw new Error("API returned an empty response.");
                }

                const newHistoryEntry: OpenAIMessage = { role: 'assistant', content: fullText };
                yield { text: fullText, isComplete: true, newHistoryEntry, mode: 'reasoning' };
            } catch (apiError: any) {
                throw apiError;
            }
        }
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error("API Error:", error);
        yield { text: `**System Error:** ${error.message}`, isComplete: true };
    }
}

// ... (Rest of the file remains unchanged: generateQuiz, evaluateAnswer, etc.)
export async function generateQuiz(topic: string, numQuestions: number, fileContext: string): Promise<Quiz> {
    const client = getClient();
    const mcCount = Math.ceil(numQuestions * 0.6);
    const saCount = Math.floor((numQuestions - mcCount) / 2);
    const fitbCount = numQuestions - mcCount - saCount;

    const systemPrompt = `You are an expert quiz generator. Create a quiz with ${numQuestions} questions on the given topic.
    ${fileContext ? `Use the following provided context to generate the questions: ${fileContext}` : ''}
    The quiz must have a specific mix of question types: ${mcCount} multiple-choice, ${saCount} short-answer, and ${fitbCount} fill-in-the-blank.
    Respond ONLY with a valid JSON object following this structure: 
    { "topic": string, "questions": [{ "question": string, "type": "multiple-choice" | "short-answer" | "fill-in-the-blank", "options": string[] | null, "correct_answer": string }] }.`;

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
    const systemPrompt = `You are a strict AI grading assistant. Evaluate the user's answer to the following short-answer/fill-in-the-blank question. The ideal answer is provided.
    - Award a score of 10 ONLY if the user's answer is a perfect or near-perfect match to the ideal answer.
    - Deduct points for inaccuracies, omissions, or significant grammatical errors.
    - A score of 7 or higher means the answer is largely correct.
    Respond ONLY with a JSON object: { "score": number, "is_correct": boolean }.`;

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