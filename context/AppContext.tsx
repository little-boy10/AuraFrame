import React, { createContext, useContext, useState } from 'react';
import { AppTab, AspectRatio, ChatMessage, HistoryItem } from '../types';
import { getHistory } from '../services/historyService';

// --- State Interfaces ---

interface SceneCreatorState {
    imagePrompt: string;
    aspectRatio: AspectRatio;
    visualStyle: 'High-Res Cinematic' | 'Low-Poly Tactical';
    isGeneratingImage: boolean;
    generatedImage: string | null;
    videoPrompt: string;
    resolution: '720p' | '1080p';
    cameraMovement: string;
    isGeneratingVideo: boolean;
    generatedVideo: string | null;
    videoStatus: string;
    error: string | null;
}

interface ImageStudioGenerateState {
    prompt: string;
    aspectRatio: AspectRatio;
    isLoading: boolean;
    isUpscaling: boolean;
    image: string | null;
    error: string | null;
}

interface ImageStudioEditState {
    file: File | null;
    preview: string | null;
    prompt: string;
    isLoading: boolean;
    editedImage: string | null;
    error: string | null;
}

interface ImageStudioAnalyzeState {
    file: File | null;
    preview: string | null;
    isLoading: boolean;
    analysis: string | null;
    error: string | null;
}

interface ImageStudioState {
    activeTab: 'generate' | 'edit' | 'analyze';
    generate: ImageStudioGenerateState;
    edit: ImageStudioEditState;
    analyze: ImageStudioAnalyzeState;
}

interface ContentAnalysisVideoState {
    file: File | null;
    isLoading: boolean;
    analysis: string | null;
    error: string | null;
}

interface ContentAnalysisQueryState {
    prompt: string;
    isLoading: boolean;
    result: string | null;
    error: string | null;
}

interface ContentAnalysisState {
    video: ContentAnalysisVideoState;
    query: ContentAnalysisQueryState;
}

interface AudioSuiteTTSState {
    text: string;
    isLoading: boolean;
    error: string | null;
    voice: string;
}

interface AudioSuiteTranscriberState {
    isRecording: boolean;
    transcription: string;
    error: string | null;
}

interface AudioSuiteLiveState {
    isSessionActive: boolean;
    status: string;
    transcripts: { type: 'user' | 'model', text: string }[];
}

interface AudioSuiteState {
    tts: AudioSuiteTTSState;
    transcriber: AudioSuiteTranscriberState;
    live: AudioSuiteLiveState;
    // New state for voice cloning simulation
    isCloning: boolean;
    cloningStatus: string;
    isCloneReady: boolean;
}

interface ChatbotState {
    messages: ChatMessage[];
    input: string;
    isLoading: boolean;
}

interface HistoryState {
    items: HistoryItem[];
    filter: HistoryItem[ 'type' ] | 'all';
}

// --- Full App State ---
interface AppState {
    activeTab: AppTab;
    sceneCreator: SceneCreatorState;
    imageStudio: ImageStudioState;
    contentAnalysis: ContentAnalysisState;
    audioSuite: AudioSuiteState;
    chatbot: ChatbotState;
    history: HistoryState;
}

// --- Context Type ---
interface AppContextType {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

// --- Initial State ---
const initialState: AppState = {
    activeTab: AppTab.SCENE_CREATOR,
    sceneCreator: {
        imagePrompt: 'A featureless red figure, fully clothed in a patient gown, is sprinting down a stark white lab hallway.',
        aspectRatio: '16:9',
        visualStyle: 'High-Res Cinematic',
        isGeneratingImage: false,
        generatedImage: null,
        videoPrompt: 'The camera follows the figure, increasing intensity.',
        resolution: '720p',
        cameraMovement: 'Smooth Dolly Push-in',
        isGeneratingVideo: false,
        generatedVideo: null,
        videoStatus: '',
        error: null,
    },
    imageStudio: {
        activeTab: 'generate',
        generate: {
            prompt: 'A highly stylized 3D render of a featureless human figure with shiny red material, running through a neon-lit cyberpunk city alley at night.',
            aspectRatio: '16:9',
            isLoading: false,
            isUpscaling: false,
            image: null,
            error: null,
        },
        edit: { file: null, preview: null, prompt: 'Add a retro, grainy film filter.', isLoading: false, editedImage: null, error: null },
        analyze: { file: null, preview: null, isLoading: false, analysis: null, error: null },
    },
    contentAnalysis: {
        video: { file: null, isLoading: false, analysis: null, error: null },
        query: { prompt: 'Analyze the geopolitical implications of the three-body problem in astrophysics on international space treaties.', isLoading: false, result: null, error: null }
    },
    audioSuite: {
        tts: { text: 'Hello! I am Gemini, ready to bring your words to life.', isLoading: false, error: null, voice: 'Kore' },
        transcriber: { isRecording: false, transcription: '', error: null },
        live: { isSessionActive: false, status: 'Idle', transcripts: [] },
        isCloning: false,
        cloningStatus: 'Ready to start.',
        isCloneReady: false,
    },
    chatbot: {
        messages: [],
        input: '',
        isLoading: false,
    },
    history: {
        items: [],
        filter: 'all',
    }
};

// --- Create Context ---
const AppContext = createContext<AppContextType | undefined>(undefined);

// --- Provider Component ---
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appState, setAppState] = useState<AppState>(() => {
        // Load history from localStorage on initial load
        const storedHistory = getHistory();
        const initialBotMessage = { role: 'model' as const, text: 'Hello! How can I help you today?' };
        return {
            ...initialState,
            history: {
                ...initialState.history,
                items: storedHistory
            },
            chatbot: {
                ...initialState.chatbot,
                messages: [initialBotMessage]
            }
        };
    });

    return (
        <AppContext.Provider value={{ appState, setAppState }}>
            {children}
        </AppContext.Provider>
    );
};

// --- Custom Hook ---
export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};