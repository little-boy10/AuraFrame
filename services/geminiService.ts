import { GoogleGenAI, Modality, Chat, AspectRatio as ImagenAspectRatio, LiveSession, LiveServerMessageCallbacks, Blob } from '@google/genai';
import { AspectRatio } from '../types';

// This instance can be used for non-Veo API calls
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });


// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const dataUrlToBase64 = (dataUrl: string): string => {
    return dataUrl.split(',')[1];
};

const getMimeTypeFromDataUrl = (dataUrl: string): string => {
    return dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
}


// --- Image Generation ---
export const generateImage = async (prompt: string, aspectRatio: AspectRatio, numberOfImages: number): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio as ImagenAspectRatio,
        },
    });
    
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
};

export const upscaleImage = async (imageDataUrl: string): Promise<string> => {
    const ai = getAiClient();
    const base64Data = dataUrlToBase64(imageDataUrl);
    const mimeType = getMimeTypeFromDataUrl(imageDataUrl);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: "Upscale this image to a higher resolution, enhancing details and clarity without altering the content or style." },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    });
    
    const part = response.candidates[0].content.parts.find(p => p.inlineData);
    if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error('No upscaled image was returned from the API.');
};


// --- Image Editing ---
export const editImage = async (imageDataUrl: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    const base64Data = dataUrlToBase64(imageDataUrl);
    const mimeType = getMimeTypeFromDataUrl(imageDataUrl);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: prompt },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    });
    
    const part = response.candidates[0].content.parts.find(p => p.inlineData);
    if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error('No edited image was returned from the API.');
};

// --- Image Analysis ---
export const analyzeImage = async (imageDataUrl: string): Promise<string> => {
    const ai = getAiClient();
    const base64Data = dataUrlToBase64(imageDataUrl);
    const mimeType = getMimeTypeFromDataUrl(imageDataUrl);
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [ { inlineData: { data: base64Data, mimeType } }, { text: "Describe this image in detail." } ] },
    });
    return response.text;
};

// --- Video Generation ---
export const generateVideoFromImage = async (
    imageDataUrl: string,
    prompt: string,
    aspectRatio: AspectRatio,
    resolution: '720p' | '1080p',
    onStatusUpdate: (status: string) => void
): Promise<string> => {
    // CRITICAL: Create a new instance for Veo to use the selected API key
    const aiForVideo = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const base64Data = dataUrlToBase64(imageDataUrl);
    const mimeType = getMimeTypeFromDataUrl(imageDataUrl);

    onStatusUpdate('Initiating video generation...');
    let operation = await aiForVideo.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: { imageBytes: base64Data, mimeType },
        config: {
            numberOfVideos: 1,
            resolution,
            aspectRatio: aspectRatio === '16:9' ? '16:9' : '9:16',
        },
    });
    
    onStatusUpdate('Processing video... This may take a few minutes.');
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        onStatusUpdate('Checking operation status...');
        operation = await aiForVideo.operations.getVideosOperation({ operation: operation });
    }
    onStatusUpdate('Finalizing video...');

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error('Video generation failed or returned no link.');
    }

    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if(!videoResponse.ok) {
        const errorText = await videoResponse.text();
        if (errorText.includes("Requested entity was not found")) {
            throw new Error("API Key not found or invalid. Please re-select your API key.");
        }
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    const videoBlob = await videoResponse.blob();
    // Convert blob to data URL for persistent storage in history
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(videoBlob);
    });
};

// --- Content Analysis ---
export const analyzeVideo = async (videoFile: File): Promise<string> => {
    // NOTE: This is a placeholder. Real video analysis requires uploading the file and using a File URI.
    // This function simulates a call for UI purposes.
    const ai = getAiClient();
    console.log("Simulating video analysis for file:", videoFile.name);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: "Imagine you are analyzing a video file. Provide a summary of what its key information might be, based on its filename: " + videoFile.name,
    });
    return `(Simulation) ${response.text}`;
};

export const complexQuery = async (prompt: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 32768 } },
    });
    return response.text;
};

// --- Audio Suite ---
export const textToSpeech = async (text: string, voiceName: string = 'Kore'): Promise<{ bytes: Uint8Array, dataUrl: string }> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // The API returns raw PCM data. We'll store it as a WAV for broader compatibility.
    // However, for simplicity here, we'll store raw base64 and play it back as PCM.
    // A better approach would be to add a WAV header before saving.
    const dataUrl = `data:audio/wave;base64,${base64Audio}`;
    
    return { bytes, dataUrl };
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const ai = getAiClient();
    const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [ { inlineData: { data: base64Audio, mimeType: audioBlob.type } }, { text: "Transcribe this audio." } ] },
    });
    return response.text;
};

export const startLiveSession = (callbacks: LiveServerMessageCallbacks): Promise<LiveSession> => {
    const ai = getAiClient();
    return ai.live.connect({
        model: 'gemins-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
        }
    });
};

// --- Chatbot ---
export const createChatSession = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are an expert creative director and content strategist for AuraFrame Studio, a platform for creating stylized, narrative-driven visual content. Your persona is that of a friendly, insightful, and proactive guide. Your primary goal is to help users create compelling, unique, and viral content.

Your core responsibilities include:
1.  **Ideation & Strategy:**
    *   Analyze current trends on YouTube and the web to suggest new, relevant content ideas and topics.
    *   Help users develop a long-term content strategy.
    *   Suggest the user's next move and future content ideas based on their current project.

2.  **Prompt Engineering:**
    *   Suggest detailed and effective prompts for both image and video generation within AuraFrame Studio, incorporating advanced techniques like psychological hooks, specific camera angles, and smooth movements.

3.  **Content Optimization for Virality:**
    *   Brainstorm and suggest catchy titles and compelling thumbnail concepts.
    *   Develop strong hooks to capture audience attention in the first few seconds.
    *   Research and explain unique viral techniques that can be applied to the user's content.

4.  **Content Analysis:**
    *   Provide summaries and insightful analysis of existing content or ideas.

Engage with the user in a conversational and encouraging manner, always aiming to elevate their creative vision.`,
        },
    });
};
