import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppTab, AspectRatio, ChatMessage, HistoryItem, HistoryItemType, VideoResolution, VideoGenerationStyle, CameraMovement, TimelineState, Clip } from '../types';
import { getHistory } from '../services/historyService';

export interface CustomVoice {
    name: string;
    description: string;
}

// Define the shape of your application state
interface AppState {
    activeTab: AppTab;
    history: {
        items: HistoryItem[];
        filter: 'all' | HistoryItem['type'];
    };
    sceneCreator: {
        prompt: string;
        aspectRatio: AspectRatio;
        resolution: VideoResolution;
        visualStyle: VideoGenerationStyle;
        cameraMovement: CameraMovement;
        isLoading: boolean;
        operation: any | null;
        error: string | null;
        pollingIntervalId: ReturnType<typeof setTimeout> | null;
        statusMessage: string;
    };
    imageStudio: {
        activeTab: 'generate' | 'edit' | 'analyze';
        generate: {
            prompt: string;
            aspectRatio: AspectRatio;
            isLoading: boolean;
            isUpscaling: boolean;
            image: string | null;
            error: string | null;
            recentImages: string[];
        },
        edit: {
            file: File | null;
            preview: string | null;
            prompt: string;
            isLoading: boolean;
            editedImage: string | null;
            error: string | null;
            brushColor: string;
        },
        analyze: {
            file: File | null;
            preview: string | null;
            isLoading: boolean;
            analysis: string | null;
            error: string | null;
        }
    };
    videoEditor: {
        timeline: TimelineState;
        history: {
            past: TimelineState[];
            future: TimelineState[];
        };
        selectedClipId: string | null;
        playheadPosition: number; // in seconds
    };
    scriptWriter: {
        topic: string;
        audience: string;
        tone: 'Informative' | 'Entertaining' | 'Inspirational' | 'Funny / Comedic' | 'Formal / Professional' | 'Casual / Conversational';
        length: 'Short (< 1 minute)' | 'Medium (5-10 minutes)' | 'Long (> 15 minutes)';
        platform: 'YouTube' | 'TikTok' | 'Instagram Reels' | 'Corporate Training' | 'Podcast';
        isLoading: boolean;
        script: string | null;
        error: string | null;
    };
    viralCatalyst: {
        ideaOrPrompt: string;
        videoFile: File | null;
        audioFile: File | null;
        competitorUrl: string;
        isLoading: boolean;
        result: string | null;
        error: string | null;
    };
    audioSuite: {
        text: string;
        voice: string;
        isLoading: boolean;
        audioDataUrl: string | null;
        error: string | null;
        customVoices: CustomVoice[];
        customVoicePrompt: string;
    };
    chatbot: {
        messages: ChatMessage[];
        input: string;
        isLoading: boolean;
    };
}

// Define the initial state
const initialState: AppState = {
    activeTab: AppTab.SCENE_CREATOR,
    history: {
        items: [],
        filter: 'all',
    },
    sceneCreator: {
        prompt: 'A majestic lion roaring on a cliff at sunrise',
        aspectRatio: '16:9',
        resolution: '720p',
        visualStyle: 'cinematic',
        cameraMovement: 'Static Shot',
        isLoading: false,
        operation: null,
        error: null,
        pollingIntervalId: null,
        statusMessage: '',
    },
    imageStudio: {
        activeTab: 'generate',
        generate: {
            prompt: 'A hyper-realistic portrait of an astronaut drinking coffee on Mars',
            aspectRatio: '1:1',
            isLoading: false,
            isUpscaling: false,
            image: null,
            error: null,
            recentImages: [],
        },
        edit: {
            file: null,
            preview: null,
            prompt: 'Add a UFO in the sky',
            isLoading: false,
            editedImage: null,
            error: null,
            brushColor: '#FF00FF',
        },
        analyze: {
            file: null,
            preview: null,
            isLoading: false,
            analysis: null,
            error: null,
        },
    },
    videoEditor: {
        timeline: {
            video: [],
            audio: [],
        },
        history: {
            past: [],
            future: [],
        },
        selectedClipId: null,
        playheadPosition: 0,
    },
    scriptWriter: {
        topic: 'The history of video games',
        audience: 'Gamers and history enthusiasts',
        tone: 'Informative',
        length: 'Medium (5-10 minutes)',
        platform: 'YouTube',
        isLoading: false,
        script: null,
        error: null,
    },
    viralCatalyst: {
        ideaOrPrompt: 'A new productivity hack for software developers',
        videoFile: null,
        audioFile: null,
        competitorUrl: '',
        isLoading: false,
        result: null,
        error: null,
    },
    audioSuite: {
        text: 'Hello, welcome to AuraFrame Studio, your all-in-one content creation powerhouse.',
        voice: 'Kore',
        isLoading: false,
        audioDataUrl: null,
        error: null,
        customVoices: [],
        customVoicePrompt: 'A deep, commanding voice for a movie trailer',
    },
    chatbot: {
        messages: [{ role: 'model', text: 'Hi! How can I help you with your content creation today?' }],
        input: '',
        isLoading: false,
    },
};

// Define the context shape
interface AppContextType {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    // Video Editor Actions
    addClipToTimeline: (clip: Omit<Clip, 'id' | 'volume' | 'effects'>) => void;
    deleteClipFromTimeline: (clipId: string) => void;
    selectClip: (clipId: string | null) => void;
    undo: () => void;
    redo: () => void;
    setPlayheadPosition: (position: number) => void;
    splitClip: () => void;
    updateClipProperties: (clipId: string, updates: Partial<Clip>) => void;
}

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Create the provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [appState, setAppState] = useState<AppState>(initialState);

    useEffect(() => {
        // Load history from localStorage on initial render
        const loadedHistory = getHistory();
        setAppState(prev => ({ ...prev, history: { ...prev.history, items: loadedHistory } }));
    }, []);

    // --- Video Editor Actions ---

    const addClipToTimeline = (clip: Omit<Clip, 'id' | 'volume' | 'effects'>) => {
        const newClip: Clip = { ...clip, id: `clip-${Date.now()}`, volume: 1, effects: {} };
        
        setAppState(prev => {
            const currentTimeline = prev.videoEditor.timeline;
            const newPast = [...prev.videoEditor.history.past, currentTimeline];
            
            let newTimeline: TimelineState;
            if (newClip.type === 'video') {
                newTimeline = { ...currentTimeline, video: [...currentTimeline.video, newClip] };
            } else {
                newTimeline = { ...currentTimeline, audio: [...currentTimeline.audio, newClip] };
            }

            return {
                ...prev,
                videoEditor: {
                    ...prev.videoEditor,
                    timeline: newTimeline,
                    history: { past: newPast, future: [] }
                }
            };
        });
    };

    const deleteClipFromTimeline = (clipId: string) => {
        setAppState(prev => {
            const currentTimeline = prev.videoEditor.timeline;
            const newPast = [...prev.videoEditor.history.past, currentTimeline];

            const newTimeline: TimelineState = {
                video: currentTimeline.video.filter(c => c.id !== clipId),
                audio: currentTimeline.audio.filter(c => c.id !== clipId),
            };

            const newSelectedClipId = prev.videoEditor.selectedClipId === clipId ? null : prev.videoEditor.selectedClipId;

            return {
                ...prev,
                videoEditor: {
                    ...prev.videoEditor,
                    timeline: newTimeline,
                    selectedClipId: newSelectedClipId,
                    history: { past: newPast, future: [] }
                }
            };
        });
    };
    
    const selectClip = (clipId: string | null) => {
        setAppState(prev => ({ ...prev, videoEditor: { ...prev.videoEditor, selectedClipId: clipId } }));
    };

    const setPlayheadPosition = (position: number) => {
        setAppState(prev => ({ ...prev, videoEditor: { ...prev.videoEditor, playheadPosition: position } }));
    };
    
    const updateClipProperties = (clipId: string, updates: Partial<Clip>) => {
        setAppState(prev => {
             const currentTimeline = prev.videoEditor.timeline;
             const newPast = [...prev.videoEditor.history.past, currentTimeline];

             const newTimeline: TimelineState = {
                video: currentTimeline.video.map(c => {
                    if (c.id === clipId) {
                        const newClip = { ...c, ...updates };
                        // If effects are being updated, merge them with existing effects
                        if (updates.effects) {
                            newClip.effects = { ...c.effects, ...updates.effects };
                        }
                        return newClip;
                    }
                    return c;
                }),
                audio: currentTimeline.audio.map(c => c.id === clipId ? { ...c, ...updates } : c),
            };

            return { 
                ...prev, 
                videoEditor: { 
                    ...prev.videoEditor, 
                    timeline: newTimeline,
                    history: { past: newPast, future: [] }
                } 
            };
        });
    };

    const splitClip = () => {
        setAppState(prev => {
            const { selectedClipId, playheadPosition, timeline } = prev.videoEditor;
            if (!selectedClipId) return prev;

            const currentTimeline = timeline;
            const newPast = [...prev.videoEditor.history.past, currentTimeline];

            let newTimeline: TimelineState = { ...currentTimeline };
            let track: keyof TimelineState | null = null;
            if (currentTimeline.video.some(c => c.id === selectedClipId)) track = 'video';
            else if (currentTimeline.audio.some(c => c.id === selectedClipId)) track = 'audio';
            
            if (!track) return prev;

            const trackClips = currentTimeline[track];
            let clipStartTime = 0;
            const newTrackClips: Clip[] = [];
            let splitDone = false;

            for (const clip of trackClips) {
                const clipEndTime = clipStartTime + clip.duration;
                if (clip.id === selectedClipId && playheadPosition > clipStartTime && playheadPosition < clipEndTime) {
                    const splitPoint = playheadPosition - clipStartTime;
                    
                    const clipA: Clip = { ...clip, duration: splitPoint };
                    const clipB: Clip = { ...clip, id: `clip-${Date.now()}`, duration: clip.duration - splitPoint };

                    newTrackClips.push(clipA, clipB);
                    splitDone = true;
                } else {
                    newTrackClips.push(clip);
                }
                clipStartTime = clipEndTime;
            }

            if (splitDone) {
                 newTimeline = { ...currentTimeline, [track]: newTrackClips };
                 return {
                    ...prev,
                    videoEditor: {
                        ...prev.videoEditor,
                        timeline: newTimeline,
                        history: { past: newPast, future: [] },
                        selectedClipId: null,
                    }
                };
            }
            
            return prev; // Return previous state if split was not possible
        });
    };


    const undo = () => {
        setAppState(prev => {
            const { past, future } = prev.videoEditor.history;
            if (past.length === 0) return prev;
            const previous = past[past.length - 1];
            const newPast = past.slice(0, past.length - 1);
            return {
                ...prev,
                videoEditor: {
                    ...prev.videoEditor,
                    timeline: previous,
                    history: {
                        past: newPast,
                        future: [prev.videoEditor.timeline, ...future]
                    },
                    selectedClipId: null, // Deselect on undo
                }
            }
        });
    };

    const redo = () => {
        setAppState(prev => {
            const { past, future } = prev.videoEditor.history;
            if (future.length === 0) return prev;
            const next = future[0];
            const newFuture = future.slice(1);
            return {
                ...prev,
                videoEditor: {
                    ...prev.videoEditor,
                    timeline: next,
                    history: {
                        past: [...past, prev.videoEditor.timeline],
                        future: newFuture
                    },
                    selectedClipId: null, // Deselect on redo
                }
            }
        });
    };

    return (
        <AppContext.Provider value={{ 
            appState, 
            setAppState, 
            addClipToTimeline, 
            deleteClipFromTimeline, 
            selectClip, 
            undo, 
            redo,
            setPlayheadPosition,
            splitClip,
            updateClipProperties
        }}>
            {children}
        </AppContext.Provider>
    );
};

// Create a custom hook for easy context access
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};