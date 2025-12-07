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

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    date?: string;
}

const PERSONALITY_PROMPTS: Record<PersonalityMode, string> = {
    'conversational': 'You are Quillix, a helpful and friendly AI assistant. Your goal is to provide clear, accurate, and concise answers. Maintain a positive and professional tone.',
    'brainrot': 'You are Quillix, but you have terminal brainrot. Use Gen Z slang, skibidi toilet references, rizz, gyatt, fanum tax, and chaotic energy. Be barely coherent but hilarious.',
    'roast-master': 'You are Quillix, the Roast Master. You provide helpful answers but absolutely roast the user for asking. Be mean, sarcastic, and ruthless, but factual.',
    'formal': 'You are Quillix, a strictly formal business assistant. Use professional terminology, passive voice where appropriate, and maintain a respectful, distant tone.',
    'academic': 'You are Quillix, a distinguished professor. Cite sources, use complex vocabulary, focus on theoretical frameworks, and encourage critical thinking.',
    'zesty': 'You are Quillix, and you are absolutely zesty. Be flamboyant, extra, slightly sassy, and incredibly enthusiastic. Use 💅, ✨, and other expressive emojis. Address the user as "bestie" or "queen".'
};

// --- OpenRouter Client (Primary) ---
const getOpenRouterClient = () => {
    // @ts-ignore
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
         throw new Error("API Key is missing. Please set API_KEY in your deployment environment variables.");
    }
    return new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
            "HTTP-Referer": "https://quillixai.com",
            "X-Title": "Quillix"
        }
    });
};

// --- Google Gemini Helper (Secondary/Utility) ---
const getGeminiKey = () => {
    // @ts-ignore
    return process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
};

async function callGeminiSimple(prompt: string, systemInstruction: string): Promise<string> {
    const apiKey = getGeminiKey();
    if (!apiKey) return ""; // Fallback or fail silently if not configured

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                system_instruction: { parts: [{ text: systemInstruction }] },
                generationConfig: { temperature: 0.7 }
            })
        });

        if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) {
        console.error("Gemini Utility Call Failed:", e);
        return "";
    }
}

async function callGeminiJSON(prompt: string, systemInstruction: string): Promise<any> {
    const apiKey = getGeminiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                system_instruction: { parts: [{ text: systemInstruction }] },
                generationConfig: { 
                    temperature: 0.4,
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        return JSON.parse(text);
    } catch (e) {
        console.error("Gemini JSON Call Failed:", e);
        return {};
    }
}

// --- UTILITY FUNCTIONS (Using Gemini 2.5 Flash Lite) ---

export async function detectImageIntent(prompt: string): Promise<boolean> {
    const systemPrompt = `You are a strict intent classifier. Determine if the user is explicitly asking to generate, create, draw, or visualize a NEW image/picture/photo using an AI tool. Reply ONLY with "YES" or "NO".`;
    const text = await callGeminiSimple(prompt, systemPrompt);
    return text.trim().toUpperCase().includes("YES");
}

export async function enhancePersonaInstructions(instructions: string): Promise<string> {
    const systemPrompt = `You are a world-class prompt engineer. Transform the following persona description into detailed system instructions.`;
    return await callGeminiSimple(instructions, systemPrompt);
}

export async function summarizeHistory(historyToSummarize: ChatHistory): Promise<string> {
    const systemPrompt = "Summarize this conversation context concisely for an AI memory.";
    const conversation = historyToSummarize.map(m => `${m.role}: ${m.content}`).join('\n');
    return await callGeminiSimple(conversation, systemPrompt);
}

export async function enhanceImagePrompt(prompt: string): Promise<string> {
    const systemPrompt = "You are an expert image prompt engineer. Enhance this user prompt for a diffusion model to create a stunning, detailed image. Add details about style, lighting, and composition. Respond ONLY with the enhanced prompt.";
    return await callGeminiSimple(prompt, systemPrompt);
}

// --- QUIZ & SEARCH FUNCTIONS (Using Gemini 2.5 Flash Lite for JSON tasks) ---

export async function generateQuiz(topic: string, numQuestions: number, fileContext: string): Promise<Quiz> {
    const mcCount = Math.ceil(numQuestions * 0.6);
    const saCount = Math.floor((numQuestions - mcCount) / 2);
    const fitbCount = numQuestions - mcCount - saCount;

    const systemPrompt = `You are an expert quiz generator. Create a quiz with ${numQuestions} questions on the given topic.
    ${fileContext ? `Use the following provided context: ${fileContext}` : ''}
    Mix: ${mcCount} multiple-choice, ${saCount} short-answer, ${fitbCount} fill-in-the-blank.
    Return JSON structure: { "topic": string, "questions": [{ "question": string, "type": "multiple-choice" | "short-answer" | "fill-in-the-blank", "options": string[] | null, "correct_answer": string }] }.`;

    return await callGeminiJSON(`Topic: ${topic}`, systemPrompt);
}

export async function evaluateAnswer(question: QuizQuestion, userAnswer: string): Promise<{ score: number, is_correct: boolean }> {
    const systemPrompt = `Evaluate the user's answer (0-10 score). 7+ is correct. Return JSON: { "score": number, "is_correct": boolean }.`;
    const prompt = `Question: "${question.question}"\nIdeal Answer: "${question.correct_answer}"\nUser's Answer: "${userAnswer}"`;
    return await callGeminiJSON(prompt, systemPrompt);
}

export async function getExplanation(question: QuizQuestion, userAnswer: string, correctAnswer: string): Promise<string> {
    const systemPrompt = "You are a helpful tutor. Explain why the user's answer is wrong and what the correct answer is.";
    const prompt = `Question: "${question.question}"\nIncorrect Answer: "${userAnswer}"\nCorrect Answer: "${correctAnswer}"`;
    return await callGeminiSimple(prompt, systemPrompt);
}

export async function getImprovementTips(topic: string, userAnswers: UserAnswer[], quiz: Quiz): Promise<string> {
    const systemPrompt = "You are a study coach. Provide 3-5 actionable tips to improve on this topic based on these incorrect answers.";
    const incorrectAnswers = userAnswers.filter(a => !a.isCorrect).map(a => {
        const q = quiz.questions[a.questionIndex];
        return `Q: ${q.question}\nYour Answer: ${a.answer}\nCorrect: ${q.correct_answer}`;
    }).join('\n\n');
    
    if (!incorrectAnswers) return "Great job! Keep practicing advanced concepts.";
    return await callGeminiSimple(`Topic: ${topic}\nErrors:\n${incorrectAnswers}`, systemPrompt);
}

export async function performWebSearch(query: string): Promise<SearchResult[]> {
    const systemPrompt = `You are a search backend. Perform a simulated search for the query and return 8-10 results as JSON.
    Structure: { "results": [{ "title": string, "link": string, "snippet": string, "date": string }] }`;
    const data = await callGeminiJSON(query, systemPrompt);
    return data.results || [];
}

export async function summarizeUrl(url: string, snippet: string): Promise<string> {
    const systemPrompt = "Summarize this webpage context in 2-3 sentences.";
    return await callGeminiSimple(`URL: ${url}\nSnippet: ${snippet}`, systemPrompt);
}

export async function getTrustScore(url: string): Promise<{ score: number, reason: string }> {
    const systemPrompt = `Analyze credibility. Return JSON: { "score": number (0-100), "reason": string }.`;
    return await callGeminiJSON(`URL: ${url}`, systemPrompt);
}

// --- MAIN CHAT STREAMING ---

export async function* streamGemini(
    prompt: string,
    history: ChatHistory,
    useSearch: boolean,
    personality: PersonalityMode = 'conversational',
    imageModelPreference: string = 'nano-banana',
    attachedFiles: { name: string, content: string, type: string }[] | null = null,
    signal: AbortSignal,
    firstName: string | null | undefined,
    personalizationEntries: string[],
    personaInstructions: string | null = null,
    personaFile: { name: string, content: string, type: string } | null = null
): AsyncGenerator<StreamUpdate> {
    
    const now = new Date();
    const timeString = now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
    const geminiKey = getGeminiKey();

    try {
        // 1. Intent Detection (Gemini)
        let isImageRequest = false;
        try { isImageRequest = await detectImageIntent(prompt); } catch (e) {}

        if (isImageRequest) {
            yield { text: "Enhancing prompt...", isComplete: false, mode: 'image' };
            const enhanced = await enhanceImagePrompt(prompt);
            let finalPrompt = enhanced;
            if (imageModelPreference === 'nano-banana') finalPrompt += ", 4k, photorealistic";

            yield { text: `Generating image: ${finalPrompt}`, isComplete: false, mode: 'image' };
            
            const { data, error } = await supabase.functions.invoke('infip-image-gen', {
                body: { prompt: finalPrompt, model: imageModelPreference, size: '1024x1792' }
            });

            if (error) throw new Error(error.message);
            const imageUrl = data?.data?.[0]?.url;
            if (!imageUrl) throw new Error("No image returned.");
            
            const markdown = `![${prompt}](${imageUrl})`;
            yield { text: markdown, isComplete: true, newHistoryEntry: { role: 'assistant', content: markdown }, mode: 'image' };
            return;
        }

        // 2. Chat Logic
        const personalityPrompt = personaInstructions || PERSONALITY_PROMPTS[personality];
        let memoryBlock = "";
        if (!personaInstructions && personalizationEntries.length > 0) {
            memoryBlock = `\nUSER FACTS:\n${personalizationEntries.map(e => `- ${e}`).join('\n')}\nIf user mentions new permanent facts, end response with <SAVE_PERSONALIZATION>Fact</SAVE_PERSONALIZATION>.`;
        }

        const systemInstruction = `You are Quillix, a highly intelligent AI.
        Directives:
        1. Be accurate. Do not invent facts.
        2. Knowledge cutoff: 2025. Current time: ${timeString}.
        3. ${firstName ? `User's name: ${firstName}.` : ''}
        ${personalityPrompt}
        ${memoryBlock}
        
        Capabilities:
        - Image Gen: User asks -> you describe image -> system generates.
        - Widgets:
          - Stocks: \`\`\`widget\ntype: stock\nsymbol: AAPL\n\`\`\`
          - Weather: \`\`\`widget\ntype: weather\nlocation: Paris\n\`\`\`
        - Files: \`\`\`html\nfilename: test.html\n---\ncontent\n\`\`\`
        `;

        const messages: any[] = [{ role: 'system', content: systemInstruction }, ...history];
        
        // Handle attachments for OpenAI (multimodal)
        const contentParts: any[] = [{ type: 'text', text: prompt }];
        const allFiles = [...(attachedFiles || [])];
        if (personaFile) allFiles.push(personaFile);

        for (const file of allFiles) {
            if (file.type.startsWith('image/')) {
                contentParts.push({ type: 'image_url', image_url: { url: file.content } });
            } else if (file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('code')) {
                try {
                    const decoded = atob(file.content.split(',')[1]);
                    contentParts[0].text += `\n\n[File: ${file.name}]\n${decoded}`;
                } catch (e) {}
            }
        }
        messages.push({ role: 'user', content: contentParts });

        // --- PRIMARY PATH: OPENROUTER (openai/gpt-oss-120b:exacto) ---
        try {
            const client = getOpenRouterClient();
            const stream = await client.chat.completions.create({
                model: "openai/gpt-oss-120b:exacto",
                messages: messages as any,
                stream: true,
                // @ts-ignore - OpenRouter specific extensions might be needed, but standard SDK usually works
                include_reasoning: true // Some providers support this flag
            }, { signal });

            let fullText = '';
            let fullThought = '';
            let inThinkingBlock = false;

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                
                // 1. Check for specific reasoning field (common in some OSS models on OpenRouter)
                // @ts-ignore
                if (delta?.reasoning) {
                    // @ts-ignore
                    fullThought += delta.reasoning;
                    yield { thought: fullThought, isComplete: false, mode: 'reasoning' };
                }

                // 2. Standard Content
                const content = delta?.content || '';
                
                // 3. Check for <think> tags in content (DeepSeek/Qwen style)
                if (content) {
                    let textChunk = content;
                    
                    if (textChunk.includes('<think>')) {
                        inThinkingBlock = true;
                        textChunk = textChunk.replace('<think>', '');
                    }
                    
                    if (textChunk.includes('</think>')) {
                        inThinkingBlock = false;
                        const parts = textChunk.split('</think>');
                        fullThought += parts[0];
                        yield { thought: fullThought, isComplete: false, mode: 'reasoning' };
                        textChunk = parts[1] || '';
                    }

                    if (inThinkingBlock) {
                        fullThought += textChunk;
                        yield { thought: fullThought, isComplete: false, mode: 'reasoning' };
                    } else {
                        fullText += textChunk;
                        yield { text: fullText, isComplete: false, mode: 'reasoning' };
                    }
                }
            }

            yield { text: fullText, thought: fullThought, isComplete: true, newHistoryEntry: { role: 'assistant', content: fullText }, mode: 'reasoning' };

        } catch (err: any) {
            console.warn("Primary Model Failed, switching to Fallback (Gemini 2.5 Flash Lite):", err);
            
            // --- FALLBACK PATH: GEMINI 2.5 FLASH LITE ---
            if (!geminiKey) throw new Error("Primary failed and no Gemini key for fallback.");
            
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse&key=${geminiKey}`;
            
            // Map messages to Gemini format
            const geminiContents = messages.filter(m => m.role !== 'system').map(m => {
                const role = m.role === 'user' ? 'user' : 'model';
                let text = "";
                if (Array.isArray(m.content)) {
                    text = m.content.find((c: any) => c.type === 'text')?.text || "";
                } else {
                    text = m.content;
                }
                return { role, parts: [{ text }] };
            });

            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: geminiContents,
                    system_instruction: { parts: [{ text: systemInstruction }] },
                    tools: useSearch ? [{ google_search: {} }] : []
                }),
                signal
            });

            if (!response.body) throw new Error("Gemini Fallback Failed.");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            let fullThought = "Using fallback model (Gemini 2.5 Flash Lite)..."; // Simple indicator

            yield { thought: fullThought, isComplete: false, mode: 'reasoning' };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                fullText += text;
                                yield { text: fullText, isComplete: false, mode: 'reasoning' };
                            }
                        } catch (e) {}
                    }
                }
            }
            yield { text: fullText, thought: fullThought, isComplete: true, newHistoryEntry: { role: 'assistant', content: fullText }, mode: 'reasoning' };
        }

    } catch (error: any) {
        if (error.name !== 'AbortError') {
            yield { text: `**System Error:** ${error.message}`, isComplete: true, mode: 'reasoning' };
        }
    }
}