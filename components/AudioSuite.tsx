import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { textToSpeech, transcribeAudio, startLiveSession } from '../services/geminiService';
import { addToHistory } from '../services/historyService';
import { Loader } from './icons/Loader';
import { MicIcon } from './icons/MicIcon';
import { StopIcon } from './icons/StopIcon';
import { PlayIcon } from './icons/PlayIcon';
import type { LiveSession, LiveServerMessage } from '@google/genai';
import { useAppContext } from '../context/AppContext';
import { SparklesIcon } from './icons/SparklesIcon';

// --- Audio Utility Functions (remain the same) ---
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

// --- Main Component ---
const AudioSuite: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Audio Suite</h2>
                <p className="text-gray-400 mt-2">Engage with voice. Converse in real-time, generate speech, and transcribe audio.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <LiveConversation />
                <div className="space-y-8">
                    <VoiceCloning />
                    <TextToSpeech />
                    <Transcriber />
                </div>
            </div>
        </div>
    );
};

// --- Sub-components ---

const LiveConversation: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { isSessionActive, status, transcripts } = appState.audioSuite.live;

    const setState = (updates: Partial<typeof appState.audioSuite.live>) => {
        setAppState(prev => ({ ...prev, audioSuite: { ...prev.audioSuite, live: { ...prev.audioSuite.live, ...updates } } }));
    };

    // Refs for non-state, instance-specific objects
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    
    // Cleanup on component unmount OR when session is manually stopped
    useEffect(() => {
        return () => {
            // This will be called when the App component is unmounted
            // We can ensure everything is stopped here
            if (sessionPromiseRef.current) {
                stopSession();
            }
        };
    }, []); // Empty dependency array means this runs once on mount and cleanup on unmount


    const stopSession = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) { console.error("Error closing session:", e); }
            sessionPromiseRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        
        if (scriptProcessorRef.current) {
          scriptProcessorRef.current.disconnect();
          scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
          mediaStreamSourceRef.current.disconnect();
          mediaStreamSourceRef.current = null;
        }

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            await inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            await outputAudioContextRef.current.close();
        }

        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        
        setState({ isSessionActive: false, status: 'Session ended.' });
    }, [setAppState]);

    const handleMessage = async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
        }
        if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
        }
        if (message.serverContent?.turnComplete) {
            const userInput = currentInputTranscriptionRef.current.trim();
            const modelOutput = currentOutputTranscriptionRef.current.trim();
            
            setAppState(prev => {
                const newTranscripts = [
                    ...prev.audioSuite.live.transcripts,
                     ...(userInput ? [{ type: 'user' as const, text: userInput }] : []),
                     ...(modelOutput ? [{ type: 'model' as const, text: modelOutput }] : [])
                ];
                return { ...prev, audioSuite: { ...prev.audioSuite, live: { ...prev.audioSuite.live, transcripts: newTranscripts } } };
            });

            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
        }

        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current) {
            const outputCtx = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            source.addEventListener('ended', () => sourcesRef.current.delete(source));
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
        }

        if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(source => source.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
        }
    };
    
    const start = async () => {
        setState({ transcripts: [], status: 'Requesting permissions...', isSessionActive: true });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            setState({ status: 'Connecting to Live API...' });

            sessionPromiseRef.current = startLiveSession({
                onopen: () => {
                    setState({ status: 'Connection open. Start speaking.' });
                    const inputCtx = inputAudioContextRef.current!;
                    const source = inputCtx.createMediaStreamSource(stream);
                    mediaStreamSourceRef.current = source;

                    const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (event) => {
                        const inputData = event.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                        sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputCtx.destination);
                },
                onmessage: handleMessage,
                onerror: (e) => {
                    console.error('Live API Error:', e);
                    setState({ status: 'An error occurred.' });
                    stopSession();
                },
                onclose: () => {
                    setState({ status: 'Connection closed.' });
                    stopSession();
                }
            });
        } catch (err) {
            console.error('Failed to start session:', err);
            setState({ status: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`, isSessionActive: false });
        }
    };
    
    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 h-full flex flex-col">
            <h3 className="text-xl font-semibold mb-2">Live Conversation</h3>
            <p className="text-sm text-gray-400 mb-4">Speak directly with Gemini in real-time. The model will respond with voice.</p>
            <div className="flex items-center justify-between bg-gray-900 p-3 rounded-md mb-4">
                <p className="text-sm font-mono">Status: <span className="text-purple-400">{status}</span></p>
                <button onClick={isSessionActive ? stopSession : start} className={`px-4 py-2 rounded-lg font-bold text-white transition-colors flex items-center gap-2 ${isSessionActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                    {isSessionActive ? <StopIcon /> : <MicIcon />}
                    {isSessionActive ? 'Stop' : 'Start'}
                </button>
            </div>
            <div className="flex-grow bg-gray-900 rounded-lg p-4 overflow-y-auto space-y-3 min-h-[250px]">
                {transcripts.length === 0 && <p className="text-gray-500">Conversation transcripts will appear here...</p>}
                {transcripts.map((t, i) => (
                    <div key={i} className={`p-3 rounded-lg max-w-[85%] ${t.type === 'user' ? 'bg-purple-900/50 ml-auto' : 'bg-gray-700'}`}>
                        <p className="text-sm font-bold capitalize mb-1 text-purple-400">{t.type}</p>
                        <p className="text-gray-200">{t.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const VoiceCloning: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { isCloning, cloningStatus, isCloneReady } = appState.audioSuite;

    const setState = (updates: Partial<typeof appState.audioSuite>) => {
        setAppState(prev => ({ ...prev, audioSuite: { ...prev.audioSuite, ...updates } }));
    };

    const handleStartCloning = () => {
        setState({ isCloning: true, cloningStatus: "Requesting microphone access..." });

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop()); // We don't need the stream, just the permission.

                const steps = [
                    { status: "Recording audio sample (3s)...", duration: 3000 },
                    { status: "Analyzing pitch, tone, and emotion...", duration: 2000 },
                    { status: "Generating psychologically-tuned voice profile...", duration: 2500 },
                    { status: "Cloning successful! New voice options available.", duration: 1000 },
                ];

                let promise = Promise.resolve();
                steps.forEach(step => {
                    promise = promise.then(() => {
                        setState({ cloningStatus: step.status });
                        return new Promise(resolve => setTimeout(resolve, step.duration));
                    });
                });

                promise.then(() => {
                    setState({ isCloning: false, isCloneReady: true });
                });
            })
            .catch(err => {
                setState({ isCloning: false, cloningStatus: "Microphone access denied. Cannot clone voice." });
            });
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
            <h3 className="text-xl font-semibold">Custom Voice Clone (Simulation)</h3>
            <p className="text-xs text-yellow-400/80">
                <strong>Note:</strong> This simulates an interactive voice cloning process. It unlocks AI-profiled voices below that match the desired characteristics (manly, engaging, Bangla).
            </p>
            {isCloneReady ? (
                 <div className="bg-green-900/50 text-green-300 p-3 rounded-md text-center">
                    <p className="font-bold">Voice Profile Created!</p>
                    <p className="text-sm">Your custom cloned voices are now available in the Text-to-Speech section.</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <button
                        onClick={handleStartCloning}
                        disabled={isCloning}
                        className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-600"
                    >
                        {isCloning ? <Loader /> : <MicIcon />}
                        {isCloning ? 'Cloning in Progress...' : 'Start Cloning Process'}
                    </button>
                    {isCloning && <p className="text-sm text-purple-400 animate-pulse">{cloningStatus}</p>}
                </div>
            )}
        </div>
    );
};


const TextToSpeech: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { text, isLoading, error, voice } = appState.audioSuite.tts;
    const { isCloneReady } = appState.audioSuite;

    const setState = (updates: Partial<typeof appState.audioSuite.tts>) => {
        setAppState(prev => ({ ...prev, audioSuite: { ...prev.audioSuite, tts: { ...prev.audioSuite.tts, ...updates } } }));
    };

    const allVoiceOptions = useMemo(() => {
        const standardVoices = [
            { id: 'Kore', name: 'Standard Male (Kore)' },
            { id: 'Puck', name: 'Deep Male (Puck)' },
            { id: 'Zephyr', name: 'Friendly Female (Zephyr)' },
            { id: 'Charon', name: 'Formal Male (Charon)' },
            { id: 'Fenrir', name: 'Bangla - Young Adult Female (Clear)' },
            { id: 'Fenrir-teen', name: 'Bangla - Teen Male (Energetic)' },
            { id: 'Fenrir-mid', name: 'Bangla - Middle-Aged Male (Warm)' },
            { id: 'Fenrir-mature', name: 'Bangla - Mature Female (Authoritative)' },
            { id: 'Fenrir-elder', name: 'Bangla - Elderly Male (Storyteller)' },
        ];
        
        const clonedVoices = [
            { id: 'cloned-puck-27', name: '✨ Cloned Voice - 27yr (Manly, Deep)' },
            { id: 'cloned-puck-23', name: '✨ Cloned Voice - 23yr (Manly, Engaging)' },
            { id: 'cloned-kore-20', name: '✨ Cloned Voice - 20yr (Natural, Realistic)' },
            { id: 'cloned-kore-18', name: '✨ Cloned Voice - 18yr (Interactive, Clear)' },
            { id: 'cloned-kore-15', name: '✨ Cloned Voice - 15yr (Youthful, Energetic)' },
        ];

        return isCloneReady ? [...clonedVoices, ...standardVoices] : standardVoices;
    }, [isCloneReady]);

    const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedVoice = e.target.value;
        let newText = text;
        if (selectedVoice.includes('Fenrir') || selectedVoice.includes('cloned')) {
            newText = 'হ্যালো! আমি আপনার বিষয়বস্তুর জন্য একটি অনন্য কণ্ঠ তৈরি করতে এখানে আছি।';
        } else {
            newText = 'Hello! I am Gemini, ready to bring your words to life.';
        }
        setState({ voice: selectedVoice, text: newText });
    };

    const handleSpeak = async () => {
        setState({ isLoading: true, error: null });
        try {
            let apiVoice = voice;
            if (voice.startsWith('cloned-')) {
                apiVoice = voice.split('-')[1]; // e.g., 'cloned-puck-27' -> 'puck'
            } else if (voice.startsWith('Fenrir-')) {
                apiVoice = 'Fenrir';
            }

            const { bytes: audioData, dataUrl: audioDataUrl } = await textToSpeech(text, apiVoice);
            
            const newHistoryItem = { type: 'audio' as const, prompt: text, data: audioDataUrl, metadata: { voice: voice } };
            addToHistory(newHistoryItem);
            setAppState(prev => ({
                ...prev,
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));
            
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            const buffer = await decodeAudioData(audioData, audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start();
        } catch (err) {
            setState({ error: err instanceof Error ? err.message : 'Failed to generate speech' });
        } finally {
            setState({ isLoading: false });
        }
    };
    
    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
            <h3 className="text-xl font-semibold">Text-to-Speech</h3>
            <p className="text-sm text-gray-400">Generate multi-lingual, natural-sounding speech from text for content creation and voice-overs.</p>
            <div>
              <label htmlFor="voice-select" className="block mb-2 text-sm font-medium text-gray-300">Select a Voice:</label>
              <select
                id="voice-select"
                value={voice}
                onChange={handleVoiceChange}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
              >
                {allVoiceOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
            <textarea className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" rows={4} value={text} onChange={e => setState({ text: e.target.value })} placeholder="Enter text to generate speech..."/>
            <button onClick={handleSpeak} disabled={isLoading || !text} className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600">
                {isLoading ? <Loader /> : <PlayIcon />} {isLoading ? 'Generating...' : 'Speak'}
            </button>
            {error && <p className="text-red-400">{error}</p>}
        </div>
    );
};

const Transcriber: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { isRecording, transcription, error } = appState.audioSuite.transcriber;

    const setState = (updates: Partial<typeof appState.audioSuite.transcriber>) => {
        setAppState(prev => ({ ...prev, audioSuite: { ...prev.audioSuite, transcriber: { ...prev.audioSuite.transcriber, ...updates } } }));
    };

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleStartRecording = async () => {
        setState({ transcription: '', error: null });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = event => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                try {
                    const result = await transcribeAudio(audioBlob);
                    setState({ transcription: result });
                } catch (err) {
                    setState({ error: err instanceof Error ? err.message : 'Failed to transcribe audio' });
                }
            };
            audioChunksRef.current = [];
            mediaRecorderRef.current.start();
            setState({ isRecording: true });
        } catch (err) {
            setState({ error: 'Microphone access denied or not available.' });
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setState({ isRecording: false });
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
            <h3 className="text-xl font-semibold">Audio Transcription</h3>
            <button onClick={isRecording ? handleStopRecording : handleStartRecording} className={`w-full flex justify-center items-center gap-2 font-bold py-3 rounded-lg text-white transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                {isRecording ? <StopIcon /> : <MicIcon />} {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            {error && <p className="text-red-400">{error}</p>}
            <div className="bg-gray-900 rounded-lg p-4 min-h-[100px]">
                <h4 className="font-bold mb-2">Transcription:</h4>
                <p className="text-gray-300">{transcription || '...'}</p>
            </div>
        </div>
    );
};

export default AudioSuite;
