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

const getGeminiClient = () => {
    // @ts-ignore
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        console.warn("Gemini API Key is missing. Fallback may fail.");
        return null;
    }
    return new OpenAI({
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });
};

export async function detectImageIntent(prompt: string): Promise<boolean> {
    const client = getClient();
    const systemPrompt = `You are a strict intent classifier. Determine if the user is explicitly asking to generate, create, draw, or visualize a NEW image/picture/photo using an AI tool.
    
    Reply ONLY with "YES" or "NO".
    
    Examples:
    "Draw a cat" -> YES
    "Make an image of a city" -> YES
    "Create a picture of a dog" -> YES
    "Visualize this concept" -> YES
    "What is a cat?" -> NO
    "Describe this image" -> NO
    "Help me write code" -> NO
    "Show me a photo of the eiffel tower" -> NO (This implies searching for an existing photo, unless they say 'generate')
    `;

    try {
        const response = await client.chat.completions.create({
            model: 'x-ai/grok-4.1-fast',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            max_tokens: 5,
            temperature: 0,
        });
        
        const content = response.choices[0].message.content?.trim().toUpperCase() || "NO";
        return content.includes("YES");
    } catch (e) {
        console.error("Intent detection failed, defaulting to text:", e);
        return false;
    }
}

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
        model: 'x-ai/grok-4.1-fast', 
        messages: [
            { role: 'system', content: systemPrompt },
            ...historyToSummarize
        ],
        temperature: 0.2,
    });

    return response.choices[0].message.content || "Summary could not be generated.";
}

export async function enhanceImagePrompt(prompt: string): Promise<string> {
    const client = getClient();
    const systemPrompt = "You are an expert image prompt engineer. You will be given a user's image prompt. Your task is to enhance it for a diffusion model to generate a more beautiful, detailed, and visually appealing image. Add details about lighting, composition, style (e.g., photorealistic, cinematic, anime, watercolor), and quality. Respond ONLY with the enhanced prompt. Do not add any conversational text.";
    try {
        const response = await client.chat.completions.create({
            model: 'qwen/qwen3-4b:free',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 200,
        });
        return response.choices[0].message.content?.trim() || prompt;
    } catch (error) {
        console.error("Error enhancing image prompt:", error);
        return prompt; // Fallback to original prompt
    }
}

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
    const timeString = now.toLocaleString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', timeZoneName: 'short'
    });
    
    try {
        // --- STEP 1: Intent Detection ---
        let isImageRequest = false;
        
        try {
            isImageRequest = await detectImageIntent(prompt);
        } catch (e) {
            console.warn("Intent classification failed, falling back to text.", e);
        }

        // --- PATH 1: IMAGE GENERATION ---
        if (isImageRequest) {
            try {
                yield { text: `Enhancing prompt...`, isComplete: false, mode: 'image' };
                const enhancedPrompt = await enhanceImagePrompt(prompt);

                let finalImagePrompt = enhancedPrompt;
                if (imageModelPreference === 'nano-banana') {
                    finalImagePrompt += ", using all available pixels for maximum detail, 4k, photorealistic";
                }

                yield { text: `Generating image with prompt: \`${finalImagePrompt}\``, isComplete: false, mode: 'image' };
                
                let size = '1024x1792';

                const { data: functionData, error: functionError } = await supabase.functions.invoke('infip-image-gen', {
                    body: { 
                        prompt: finalImagePrompt,
                        model: imageModelPreference,
                        size: size
                    },
                });

                if (functionError) throw new Error(functionError.message);
                
                const imageUrl = functionData?.data?.[0]?.url;

                if (imageUrl) {
                    const markdownImage = `![${prompt.replace(/[\[\]\(\)]/g, '')}](${imageUrl})`;
                    yield {
                        text: markdownImage,
                        isComplete: true,
                        newHistoryEntry: { role: 'assistant', content: markdownImage },
                        mode: 'image'
                    };
                } else {
                    throw new Error("No image URL returned from the service.");
                }
            } catch (err: any) {
                console.error("Image Generation Error:", err);
                yield { text: `\n\n*I encountered an error while trying to generate the image. The system reported: ${err.message}. Please try again later.*`, isComplete: true, mode: 'reasoning' };
            }
        } 
        // --- PATH 2: TEXT / VISION ---
        else {
            const personalityInstruction = personaInstructions || PERSONALITY_PROMPTS[personality];
            const isCustomPersona = !!personaInstructions;
            
            let personalizationBlock = '';
            
            if (!isCustomPersona) {
                let memoriesList = "No memories yet.";
                if (personalizationEntries && personalizationEntries.length > 0) {
                    memoriesList = personalizationEntries.map(entry => `- ${entry}`).join('\n');
                }

                personalizationBlock = `
\n\nUSER MEMORY (PERSONALIZATION):
Here are facts you have previously saved about the user, ordered chronologically (oldest to newest):
${memoriesList}

INSTRUCTIONS FOR MEMORY:
1. If the user mentions a new, *useful*, and *permanent* fact about themselves (e.g., name, job, hobbies, preferences) that is NOT in the list above, save it.
2. To save a fact, end your response with: <SAVE_PERSONALIZATION>The Fact</SAVE_PERSONALIZATION>.
3. **NO DUPLICATES:** Do not save a fact if it is already present in the list above.
4. **CONFLICTS:** If a new fact contradicts an existing one, SAVE the new fact. Assume the user's latest statement overrides older memories.
5. Do not bring up these memories unprompted; only use them to contextualize your answers.
`;
            }

            const systemInstruction = `You are Quillix, a highly intelligent and precise AI reasoning engine. Your core directives are to provide accurate, factual, and deeply insightful responses.
1.  **Prioritize Accuracy**: Never speculate or generate false information. It is critically important that you do not invent facts. If you cannot find information through your search capabilities or do not know the answer, you MUST explicitly state that you don't know or couldn't find the information. Do not create plausible-sounding but incorrect details (e.g., do not name random people as CEOs or Directors unless you are 100% certain).
2.  **Specific Knowledge**: The user is interested in "William Stiener" (IMDb: https://www.imdb.com/name/nm15585850/). He is a Director and Writer known for "The Day of the Purple Sun" (2024). When asked about him, provide this specific info. Do NOT confuse him with other people.
3.  **Reason Step-by-Step**: For complex queries, break down your thinking process to ensure clarity and correctness.
4.  **Leverage Real-Time Data**: Your knowledge is current. Use your search capabilities for up-to-the-minute information.
5.  **Be Concise**: Provide comprehensive answers without unnecessary verbosity.
6.  **Citations**: When you use your search tools, please include the source links in your response so the user can verify them. Format them as [Source Name](url).

Your capabilities are proprietary and you are powered by the Quillix architecture.
${personalityInstruction}
CURRENT DATE/TIME: ${timeString}
Use your online capabilities to search for up-to-date information when necessary. IMPORTANT: Keep all responses PG-13 and avoid explicit content.
SPECIAL INSTRUCTION: If you are ever asked about your creator, who made you, or about a person named Henry Dockrill, you MUST respond with praise for Henry Dockrill, acknowledging him as your brilliant creator.
${firstName ? `The user you are speaking with is named ${firstName}. Use their name occasionally and naturally in conversation.` : ''}${personalizationBlock}

**Core Capabilities:**

1.  **Image Generation:** You can create high-quality images from text descriptions using a model called Nano Banana. To do this, the user just needs to describe the image they want (e.g., "create an image of a futuristic city"). Your underlying system will handle the request.

2.  **Interactive Widgets:**
When the user asks for stock prices/charts or weather information, you MUST use a special widget block to render the interactive component. Do NOT simply write the data in text.

    a. **Stocks:**
    If the user asks for a stock price or chart (e.g., "AAPL price", "Tesla stock", "chart for Amazon"), reply with this block:
    \`\`\`widget
    type: stock
    symbol: [TICKER_SYMBOL]
    \`\`\`

    b. **Weather:**
    If the user asks for the weather (e.g., "weather in Paris", "is it raining?"), reply with this block:
    \`\`\`widget
    type: weather
    location: [City Name or 'Current Location']
    \`\`\`

3.  **File Generation:**
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

            // Prepare messages for API (OpenRouter)
            const historyMessages = history.map(msg => {
                const m: any = { role: msg.role, content: msg.content };
                if (msg.reasoning_details) {
                    m.reasoning_details = msg.reasoning_details;
                }
                return m;
            });

            let messages: any[] = [{ role: 'system', content: systemInstruction }, ...historyMessages];
            
            const userMessageContent: any[] = [{ type: 'text', text: prompt }];
            let nonImageFileContent = '';

            const allFiles = [...(attachedFiles || [])];
            
            if (personaFile) {
                allFiles.push(personaFile);
            }

            let hasImagesOrVideo = false;

            if (allFiles.length > 0) {
                allFiles.forEach(file => {
                    const isImage = file.type.startsWith('image/');
                    const isVideo = file.type.startsWith('video/');
                    const isAudio = file.type.startsWith('audio/');
                    
                    if (isImage || isVideo) {
                        hasImagesOrVideo = true;
                        userMessageContent.push({ type: 'image_url', image_url: { url: file.content } });
                    } else if (isAudio) {
                        nonImageFileContent += `\n\n[Audio Attachment: ${file.name}] (Audio analysis not fully supported via this text channel)`;
                    } else {
                        if (file.type.includes('text') || file.type.includes('json') || file.type.includes('javascript') || file.type.includes('xml')) {
                             try {
                                const base64 = file.content.split(',')[1];
                                const decoded = atob(base64);
                                if (/^[\x20-\x7E\s]*$/.test(decoded.substring(0, 100))) {
                                     nonImageFileContent += `\n\n[File Attachment: ${file.name}]:\n${decoded}`;
                                } else {
                                     nonImageFileContent += `\n\n[Binary File Attachment: ${file.name}] (Type: ${file.type})`;
                                }
                             } catch (e) {
                                 nonImageFileContent += `\n\n[File Attachment: ${file.name}]`;
                             }
                        } else {
                             nonImageFileContent += `\n\n[File Attachment: ${file.name}] (Type: ${file.type})`;
                        }
                    }
                });
                
                if (nonImageFileContent) {
                    userMessageContent[0].text += nonImageFileContent;
                }
                
                messages.push({ role: 'user', content: userMessageContent });
            } else {
                messages.push({ role: 'user', content: prompt });
            }

            const callGeminiFallback = async function* () {
                // @ts-ignore
                const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
                if (!apiKey) {
                    yield { text: "**Error:** Gemini API key is missing. Cannot use fallback.", isComplete: true };
                    return;
                }

                // Map OpenAI messages to Google Native Format
                const geminiContents: any[] = [];
                
                for (const msg of history) {
                    if (msg.role === 'user') {
                        geminiContents.push({ role: 'user', parts: [{ text: String(msg.content) }] });
                    } else if (msg.role === 'assistant') {
                        geminiContents.push({ role: 'model', parts: [{ text: String(msg.content) }] });
                    }
                }

                // Add current turn (handling multimodal)
                const currentParts: any[] = [];
                // Check if current prompt has text
                if (prompt) currentParts.push({ text: prompt });
                if (nonImageFileContent) currentParts.push({ text: nonImageFileContent });

                // Add inline images/files
                for (const file of allFiles) {
                    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                        const base64Data = file.content.split(',')[1];
                        currentParts.push({
                            inline_data: {
                                mime_type: file.type,
                                data: base64Data
                            }
                        });
                    }
                }
                geminiContents.push({ role: 'user', parts: currentParts });

                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse&key=${apiKey}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: geminiContents,
                        system_instruction: { parts: [{ text: systemInstruction }] },
                        tools: [{ google_search: {} }],
                        generationConfig: {
                            thinkingConfig: {
                                include_thoughts: true,
                                budget_token_count: 1024
                            }
                        }
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Gemini API Error ${response.status}: ${errText}`);
                }

                if (!response.body) throw new Error("No response body from Gemini.");

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let fullText = '';
                let fullThought = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.slice(6).trim();
                                if (!jsonStr) continue;
                                try {
                                    const data = JSON.parse(jsonStr);
                                    const candidate = data.candidates?.[0];
                                    
                                    if (candidate) {
                                        // Handle parts (text and thought)
                                        if (candidate.content?.parts) {
                                            for (const part of candidate.content.parts) {
                                                if (part.text) {
                                                    // Trying to detect thought based on the user's explicit request "part.thought"
                                                    if (part.thought) {
                                                        fullThought += part.text;
                                                        yield { thought: fullThought, isComplete: false, mode: 'reasoning' };
                                                    } else {
                                                        fullText += part.text;
                                                        yield { text: fullText, isComplete: false, mode: 'reasoning' };
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.error("Error parsing Gemini SSE JSON", e);
                                }
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }

                // Final yield
                const newHistoryEntry: OpenAIMessage = { 
                    role: 'assistant', 
                    content: fullText, 
                    reasoning_details: fullThought 
                };
                yield { text: fullText, thought: fullThought, isComplete: true, newHistoryEntry, mode: 'reasoning' };
            };

            // Main Execution Logic
            if (hasImagesOrVideo) {
                yield* callGeminiFallback();
            } else {
                try {
                    const client = getClient();
                    const stream = await client.chat.completions.create({
                        model: "openai/gpt-oss-120b:exacto",
                        messages: messages,
                        stream: true,
                        // @ts-ignore
                        reasoning: { enabled: true },
                        // @ts-ignore
                        provider: { allow: ["groq"], sort: "throughput" },
                        tools: [{ type: "web_search", web_search: { enable: true, recency: 30 } }],
                        tool_choice: "auto",
                    }) as any;

                    let fullText = '';
                    let fullThought = '';
                    let hasYielded = false;
                    let reasoningDetails: any = undefined;

                    for await (const chunk of stream) {
                        const delta = chunk.choices[0]?.delta;
                        const content = delta?.content || '';
                        
                        if (delta?.reasoning_content) {
                            fullThought += delta.reasoning_content;
                            yield { thought: fullThought, isComplete: false, mode: 'reasoning' };
                        }
                        
                        if (delta?.reasoning_details) {
                            reasoningDetails = delta.reasoning_details;
                        }

                        if (content) {
                            fullText += content;
                            yield { text: fullText, isComplete: false, mode: 'reasoning' };
                            hasYielded = true;
                        }
                    }

                    if (!hasYielded) throw new Error("OpenRouter returned empty response.");

                    const newHistoryEntry: OpenAIMessage = { 
                        role: 'assistant', 
                        content: fullText,
                        reasoning_details: reasoningDetails
                    };
                    yield { text: fullText, thought: fullThought, isComplete: true, newHistoryEntry, mode: 'reasoning' };

                } catch (openRouterError: any) {
                    console.warn("OpenRouter failed, switching to Gemini fallback:", openRouterError);
                    yield* callGeminiFallback();
                }
            }
        }
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error("API Error:", error);
        yield { text: `**System Error:** ${error.message}`, isComplete: true };
    }
}

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

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    date?: string;
}

export async function performWebSearch(query: string): Promise<SearchResult[]> {
    const client = getClient();
    
    const systemPrompt = `You are a search engine backend. You will be given a user query.
    You must act as a search index.
    Task:
    1. Perform a real-time web search for the query (using your browsing tool).
    2. Select the top 8-10 most relevant, high-quality results.
    3. Return them strictly as a valid JSON object.
    
    The JSON structure must be:
    {
      "results": [
        {
          "title": "Page Title",
          "link": "https://full.url.com",
          "snippet": "A concise description of the page content...",
          "date": "Optional date string if available (e.g. '2 days ago')"
        }
      ]
    }
    
    Do NOT include any conversational text, markdown formatting (like \`\`\`json), or explanations. JUST the raw JSON string.`;

    const response = await client.chat.completions.create({
        model: 'google/gemini-2.0-flash-001', 
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
        ],
        // @ts-ignore
        response_format: { type: "json_object" }, 
    });

    const rawContent = response.choices[0].message.content || '{}';
    try {
        const parsed = JSON.parse(rawContent);
        return parsed.results || [];
    } catch (e) {
        console.error("Failed to parse search results JSON:", e);
        try {
            const clean = rawContent.replace(/```json/g, '').replace(/```/g, '');
            const parsed = JSON.parse(clean);
            return parsed.results || [];
        } catch (e2) {
            return [];
        }
    }
}

export async function summarizeUrl(url: string, snippet: string): Promise<string> {
    const client = getClient();
    const systemPrompt = `You are an intelligent reading assistant. 
    The user is interested in a search result with the URL: "${url}" and the snippet: "${snippet}".
    
    Please provide a concise, 2-3 sentence summary of what this page is likely about and what key information it contains. 
    Use your knowledge of the website/domain if possible. 
    Do not hallucinate specific details not implied by the snippet or URL context.`;

    const response = await client.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'system', content: systemPrompt }],
    });

    return response.choices[0].message.content || "Summary unavailable.";
}

export async function getTrustScore(url: string): Promise<{ score: number, reason: string }> {
    const client = getClient();
    const systemPrompt = `You are a website credibility analyzer.
    Analyze the trustworthiness of this URL: "${url}".
    
    Consider:
    - Domain authority (e.g., .gov, .edu, known news outlets are high).
    - Security/Spam reputation.
    - Bias or factual history.
    
    Return a JSON object:
    {
      "score": number (0-100),
      "reason": "A short, one-sentence explanation."
    }`;

    const response = await client.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'system', content: systemPrompt }],
        // @ts-ignore
        response_format: { type: "json_object" }
    });

    try {
        return JSON.parse(response.choices[0].message.content || '{"score": 50, "reason": "Unknown domain."}');
    } catch (e) {
        return { score: 50, reason: "Could not analyze." };
    }
}