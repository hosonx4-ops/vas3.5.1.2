import { GoogleGenAI, Type, GenerateContentResponse as GenAIResponse, Operation, GenerateVideosResponse, Part } from "@google/genai";
import { Character, GeminiModelSelection } from "../types";

// Export các type cần thiết để các component khác có thể sử dụng
export type { GenAIResponse as GenerateContentResponse, Part };

let ai: GoogleGenAI | null = null;
let serverApiKey: string | null = null;

// Lớp lỗi tùy chỉnh cho việc hủy tác vụ
export class AbortError extends Error {
    constructor(message = 'Operation was cancelled by the user.') {
        super(message);
        this.name = 'AbortError';
    }
}

// Đối tượng điều khiển việc hủy
export type CancellationController = {
    cancel: () => void;
    isCancelled: boolean;
    throwIfCancelled: () => void;
};

export const createCancellationController = (): CancellationController => {
    let isCancelled = false;
    return {
        cancel: () => { isCancelled = true; },
        get isCancelled() { return isCancelled; },
        throwIfCancelled: () => {
            if (isCancelled) {
                throw new AbortError();
            }
        }
    };
};

/**
 * Khởi tạo hoặc khởi tạo lại Gemini client.
 */
const initializeClient = () => {
    const apiKey = serverApiKey;
    
    if (apiKey) {
        ai = new GoogleGenAI({ apiKey });
        console.log("Gemini client đã được khởi tạo với API key từ server.");
    } else {
        ai = null;
        console.log("Gemini client chưa được khởi tạo (chưa có key từ server).");
    }
};

/**
 * Lấy API key từ máy chủ của bạn và khởi tạo lại client.
 */
const fetchApiKeyFromServer = async (): Promise<boolean> => {
    try {
        const response = await fetch('https://mmoreal.com/api/get_gemini_key.php');
        if (!response.ok) {
            console.warn("Không thể lấy API key từ máy chủ.");
            return false;
        }
        const data = await response.json();
        if (data.success && data.apiKey) {
            console.log("Đã lấy thành công API key mới từ máy chủ.");
            serverApiKey = data.apiKey;
            initializeClient(); // Khởi tạo lại client với key mới
            return true;
        }
        console.warn("Phản hồi từ server không chứa API key hợp lệ.");
        return false;
    } catch (error) {
        console.error("Lỗi khi kết nối đến máy chủ để lấy API key:", error);
        return false;
    }
};

// Lấy key từ server ngay khi ứng dụng khởi động.
fetchApiKeyFromServer();

/**
 * Lấy Gemini client đã được khởi tạo.
 */
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        throw new Error("API Key từ server không có sẵn. Vui lòng kiểm tra lại kết nối và cài đặt phía server.");
    }
    return ai;
};

export const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
};

export const setApiKeyAndReloadClient = (apiKey: string) => {
    localStorage.setItem('gemini-api-key', apiKey);
    console.log("API key của người dùng đã được lưu vào localStorage. Tuy nhiên, ứng dụng được cấu hình để ưu tiên sử dụng key từ server.");
};

export const getApiKey = (): string | null => {
    return localStorage.getItem('gemini-api-key');
};

// *** HÀM ĐƯỢC CẬP NHẬT TOÀN DIỆN NHẤT ***
export const createVideoPrompts = async (
    storyContent: string,
    granularity: string,
    style: string,
    characters: Character[],
    isJsonOutput: boolean,
    cameraLenses: string[],
    cameraShots: string[], // Thêm tùy chọn góc máy
    lightingSetups: string[],
    videoDuration: number, // Thêm thời lượng video (phút)
    voiceLanguage: string, // Thêm ngôn ngữ giọng nói
    promptCount: number, // Thêm số lượng prompt
    preferredModel: GeminiModelSelection = 'auto',
    onProgress: (message: string) => void = () => {},
    cancellationController?: CancellationController | null
): Promise<GenAIResponse> => {
    
    const characterInstructions = characters.length > 0
        ? `CHARACTER SHEETS (MUST FOLLOW):\n${characters.map(c => `- Name: ${c.name}, Description: ${c.description}`).join('\n')}`
        : 'No specific characters provided.';

    const outputFormatInstruction = isJsonOutput
        ? `Return the result as a JSON object with a single key "prompts", which is an array of JSON objects. Each object must contain keys like "scene_number", "camera_shot", "lighting", "action_description", and "dialogue".`
        : `Return the result as a JSON object with a single key "prompts", which is an array of strings. Each string is a complete prompt for one scene.`;
        
    const prompt = `
        **TASK: Analyze the story and generate a series of video prompts for a VEO video, strictly following all instructions.**

        **STORY:**
        ---
        ${storyContent}
        ---

        **INSTRUCTIONS (MANDATORY):**

        1.  **VIDEO & AUDIO SPECIFICATIONS:**
            - Total Video Duration: Approximately ${videoDuration} minutes.
            - Total Prompts to Generate: Exactly ${promptCount} prompts.
            - Voice Language for Narration/Dialogue: ${voiceLanguage}.

        2.  **CHARACTER(S):**
            ${characterInstructions}
            *You MUST adhere to these character descriptions to ensure consistency.*

        3.  **STYLE & CINEMATOGRAPHY (CRITICAL):**
            -   Overall Style & Settings: ${style}
            -   Permitted Camera Lenses: ${cameraLenses.length > 0 ? cameraLenses.join(', ') : 'Not specified'}
            -   Permitted Camera Shots/Movements: ${cameraShots.length > 0 ? cameraShots.join(', ') : 'Not specified'}
            -   Permitted Lighting Setups: ${lightingSetups.length > 0 ? lightingSetups.join(', ') : 'Not specified'}
            *You MUST combine these elements creatively and appropriately in the prompts to create a cohesive and professional visual experience.*

        4.  **PROMPT STRUCTURE:**
            ${granularity === 'detailed'
                ? `Create exactly ${promptCount} detailed prompts. Each prompt must describe a distinct scene of approximately 8 seconds. The prompts must flow chronologically to tell the story.`
                : `Create a single, comprehensive prompt that encapsulates the entire story's visual narrative for a ${videoDuration}-minute video.`
            }
            *Focus on visual details: camera angles, character actions, environment, and mood, incorporating the specified cinematography styles.*

        5.  **OUTPUT FORMAT (CRITICAL):**
            ${outputFormatInstruction}
            *Do NOT deviate from this JSON structure. Ensure the entire array of ${promptCount} prompts is returned and not truncated.*
    `;
    
    const modelDisplayNames: { [key: string]: string } = {
        'gemini-2.5-flash': 'Trung Bình',
        'gemini-2.0-flash': 'Nhanh',
        'gemini-2.5-flash-lite-preview-09-2025': 'Tốc độ cao'
    };
    
    const modelPriorities: { [key in GeminiModelSelection]: string[] } = {
        'auto': ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite-preview-09-2025'],
        'gemini-2.5-flash': ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite-preview-09-2025'],
        'gemini-2.0-flash': ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite-preview-09-2025'],
        'gemini-2.5-flash-lite-preview-09-2025': ['gemini-2.5-flash-lite-preview-09-2025', 'gemini-2.0-flash', 'gemini-2.5-flash'],
    };

    const modelsToTry = modelPriorities[preferredModel];
    let lastError: any = null;
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        cancellationController?.throwIfCancelled();
        onProgress(`Bắt đầu lần thử ${attempt}/${maxRetries}...`);
        
        for (const model of modelsToTry) {
            cancellationController?.throwIfCancelled();
            const modelDisplayName = modelDisplayNames[model] || model;

            try {
                onProgress(`Đang tạo bằng model: ${modelDisplayName} (Lần thử ${attempt})`);
                const client = getAiClient();
                const response = await client.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                    }
                });

                cancellationController?.throwIfCancelled();
                onProgress("Đang kiểm tra dữ liệu trả về...");
                
                const parsed = JSON.parse(response.text ?? '');
                if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
                    throw new Error("Cấu trúc JSON không hợp lệ.");
                }

                onProgress("Tạo prompt thành công!");
                return response;

            } catch (error: any) {
                if (error instanceof AbortError) {
                    throw error;
                }
                
                lastError = error;
                onProgress(`Lỗi với model ${modelDisplayName}. Đang tự động thử lại...`);
                console.warn(`Lỗi ở lần thử ${attempt} với model ${model}:`, error.message);
                
                cancellationController?.throwIfCancelled();
                onProgress("Đang tự động lấy API key mới từ server...");
                await fetchApiKeyFromServer();
            }
        }
    }
    
    throw lastError || new Error(`Tất cả ${maxRetries} lần thử và các model đều thất bại. Vui lòng thử lại sau.`);
};

export const createStoryFromText = async (idea: string, wordCount: string, style: string): Promise<GenAIResponse> => {
    const client = getAiClient();
    const prompt = `Based on the following idea, write a ${style} story of about ${wordCount} words. The idea is: "${idea}". The story should be compelling and well-structured. Return only the story content.`;
    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite-preview-09-2025',
        contents: prompt,
        config: {
            systemInstruction: "You are a master storyteller, skilled in crafting engaging narratives in various styles."
        }
    });
    return response;
};

export const createStoryFromUrl = async (url: string, wordCount: string, style: string): Promise<GenAIResponse> => {
    const client = getAiClient();
    const groundingResponse = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Fetch the content from this URL: ${url}`,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const articleContent = groundingResponse.text;

    const prompt = `Based on the content of the article below, write a ${style} story of about ${wordCount} words. Develop the core themes and events from the article into a narrative. Article content: "${articleContent}"`;
    
    const storyResponse = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are a creative writer who transforms factual articles into captivating stories."
        }
    });
    return storyResponse;
};

export const extractCharacterSheet = async (storyContent: string): Promise<GenAIResponse> => {
    const client = getAiClient();
    const prompt = `
        From the story below, extract the main character's information and create a detailed "Character Sheet".
        The sheet should include the character's name, species, appearance, personality, and any other key visual details.
        Return the result as a JSON object with two keys: "name" (a string) and "description" (a detailed string).

        Story:
        ---
        ${storyContent}
        ---
    `;

    return client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING }
                }
            }
        }
    });
};

export const createCharacterSheetFromImage = async (imagePart: Part, userPrompt: string): Promise<GenAIResponse> => {
    const client = getAiClient();
    const prompt = userPrompt || `
        Analyze the character in this image and create a detailed "Character Sheet".
         Give the character a suitable name.
          Describe the species, appearance (clothes, hair, face, facial features, skin color, eyes, clothes, nose, mouth, etc.), estimated age, personality, and any other important visual details needed to best represent the character in different scenes.
          Return the result as a JSON object with two keys: "name" (a string) and "description" (a detailed string).
    `;

    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [imagePart, { text: prompt }]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING }
                }
            }
        }
    });
    return response;
};

// New function to handle multiple images
export const createCharacterSheetFromImages = async (imageParts: Part[], userPrompt: string): Promise<GenAIResponse> => {
    const client = getAiClient();
    const prompt = userPrompt || `
        Analyze the characters and style from these images and create a single, unified, detailed "Character Sheet".
        If there are characters, give them suitable names.
        Describe their species, appearance (clothing, hair, face, etc.), estimated age, and personality.
        Also, describe the overall artistic style, mood, and environment from the images.
        Combine all this information into one "description" that can be used to generate consistent video prompts.
        Return the result as a JSON object with one key: "description" (a detailed string).
    `;

    const contents = {
        parts: [...imageParts, { text: prompt }]
    };

    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING }
                }
            }
        }
    });
    return response;
};

export const createThumbnailPrompt = async (storyContent: string): Promise<GenAIResponse> => {
    const client = getAiClient();
    const prompt = `
    Based on the following story, create a single, concise, and visually striking prompt for an image generation model (like Imagen) to create a thumbnail.
    The prompt should capture the absolute essence of the story's mood, main character, and key conflict or theme in one sentence.
    Focus on creating a highly dynamic and attention-grabbing image.

    Story:
    ---
    ${storyContent}
    ---
    `;
    return client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are a professional marketing artist who specializes in creating viral-worthy thumbnail concepts."
        }
    });
}

export const generateThumbnailImage = async (prompt: string): Promise<string> => {
    const client = getAiClient();
    
    const response = await client.models.generateContent({
        model: 'gemini-2.0-flash-preview-image-generation',
        contents: [{
            parts: [{ text: prompt }]
        }],
        config: {
            responseModalities: ['IMAGE', 'TEXT']
        }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData && imagePart.inlineData.mimeType) {
        const base64ImageBytes: string = imagePart.inlineData.data ?? '';
        const mimeType = imagePart.inlineData.mimeType;
        return `data:${mimeType};base64,${base64ImageBytes}`;
    }

    throw new Error("Không tìm thấy dữ liệu hình ảnh trong phản hồi từ API.");
}

export const generateVideo = async (prompt: string): Promise<Operation<GenerateVideosResponse>> => {
    const client = getAiClient();
    const operation = await client.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        config: {
            numberOfVideos: 1
        }
    });
    return operation;
};

export const checkVideoStatus = async (operation: Operation<GenerateVideosResponse>): Promise<Operation<GenerateVideosResponse>> => {
    const client = getAiClient();
    const updatedOperation = await client.operations.getVideosOperation({ operation: operation });
    return updatedOperation;
};

export const getVideoUrl = (operation: Operation<GenerateVideosResponse>): string | undefined => {
    if (operation.done && operation.response) {
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
             const apiKey = getApiKey() || serverApiKey;
             if(!apiKey) throw new Error("API Key not found for video URL");
             return `${downloadLink}&key=${apiKey}`;
        }
    }
    return undefined;
}

export const processYouTubeVideo = async (url: string, request: string): Promise<GenAIResponse> => {
    const client = getAiClient();
    
    const videoPart = {
        fileData: {
            fileUri: url
        }
    };

    const textPart = {
        text: request || "Please provide a full transcript for this video."
    };

    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [videoPart, textPart] }
    });

    return response;
};

export const createTitleDescriptionHashtags = async (storyContent: string): Promise<GenAIResponse> => {
    const client = getAiClient();
    const prompt = `
        Based on the following story, generate an engaging title, a compelling description (around 150-200 words), and a list of 10-15 relevant hashtags.

        Story:
        ---
        ${storyContent}
        ---

        Return the result as a JSON object with three keys: "title", "description", and "hashtags". The "hashtags" value should be an array of strings and add # to hastag.
    `;

    return client.models.generateContent({
        model: 'gemini-2.5-flash-lite-preview-09-2025',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    hashtags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });
};