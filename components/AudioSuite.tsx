import React, { useRef } from 'react';
import { generateSpeech } from '../services/geminiService';
import { addToHistory } from '../services/historyService';
import { useAppContext, CustomVoice } from '../context/AppContext';
import { Loader } from './icons/Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import { PlayIcon } from './icons/PlayIcon';
import { MicIcon } from './icons/MicIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { PauseIcon } from './icons/PauseIcon';

// As per documentation: decode base64 string to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// As per documentation: decode raw PCM data into an AudioBuffer for playback
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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


const corePrebuiltVoices: CustomVoice[] = [
    { name: 'Kore', description: 'Female, Clear, Professional' },
    { name: 'Puck', description: 'Male, Energetic, Youthful' },
    { name: 'Charon', description: 'Male, Deep, Authoritative' },
    { name: 'Fenrir', description: 'Male, Raspy, Storyteller' },
    { name: 'Zephyr', description: 'Female, Warm, Friendly' },
];

const bengaliDocumentaryVoices: CustomVoice[] = [
    { name: 'Nabin (Bengali Male)', description: 'A young, clear, and energetic male Bengali voice, suitable for modern documentaries targeting youth.' },
    { name: 'Kotha (Bengali Female)', description: 'A calm, articulate, and warm female Bengali voice, perfect for narrative-driven documentaries and storytelling.' },
    { name: 'Proshanto (Bengali Male)', description: 'A professional and standard male Bengali voice with clear pronunciation, ideal for formal and educational documentaries.' },
    { name: 'Gombhir (Bengali Male)', description: 'A deep, authoritative, and serious male Bengali voice, fitting for historical, political, or scientific documentaries.' },
    { name: 'Snigdha (Bengali Female)', description: 'A gentle, friendly, and engaging female Bengali voice, suitable for human-interest stories and cultural documentaries.' },
];


const AudioSuite: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { text, voice, isLoading, audioDataUrl, error, customVoices, customVoicePrompt } = appState.audioSuite;
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const setState = (updates: Partial<typeof appState.audioSuite>) => {
        setAppState(prev => ({ ...prev, audioSuite: { ...prev.audioSuite, ...updates } }));
    };

    const allVoices = [...corePrebuiltVoices, ...bengaliDocumentaryVoices, ...customVoices];

    const handleGenerateSpeech = async () => {
        if (!text) {
            setState({ error: 'Please enter some text to generate audio.' });
            return;
        }
        setState({ isLoading: true, error: null, audioDataUrl: null });
        try {
            const selectedVoice = allVoices.find(v => v.name === voice);
            
            // A voice is "core" if its name is in the core list. Everything else needs a description to guide the AI.
            const isCoreVoice = corePrebuiltVoices.some(v => v.name === voice);
            const voiceDescription = isCoreVoice ? undefined : selectedVoice?.description;
            
            // The API requires one of the pre-built voice names. Use the name if it's core, otherwise a default.
            const baseVoiceName = isCoreVoice ? voice : 'Kore';
            
            const base64Audio = await generateSpeech(text, baseVoiceName, voiceDescription);
            
            const audioUrlForPlayback = `data:audio/wav;base64,${base64Audio}`;
            
            const metadata = { voice: selectedVoice?.name, description: selectedVoice?.description };
            const newHistoryItem = { type: 'audio' as const, prompt: text, data: audioUrlForPlayback, metadata };
            
            addToHistory(newHistoryItem);

            setAppState(prev => ({
                ...prev,
                audioSuite: { ...prev.audioSuite, audioDataUrl: base64Audio, isLoading: false },
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setState({ error: errorMessage, isLoading: false });
        }
    };

    const playAudio = async (base64Audio: string | null) => {
        if (!base64Audio) return;
        try {
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            const outputNode = outputAudioContext.createGain();
            outputNode.connect(outputAudioContext.destination);

            const decodedBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(decodedBytes, outputAudioContext, 24000, 1);
            
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.start();
        } catch (e) {
            console.error("Failed to play audio with AudioContext:", e);
            setState({ error: "Could not play generated audio. Your browser may not support the format." });
        }
    };

    const handleAddCustomVoice = () => {
        if (!customVoicePrompt) return;
        const newVoice: CustomVoice = {
            name: `Custom ${customVoices.length + 1}`,
            description: customVoicePrompt,
        };
        setState({ customVoices: [...customVoices, newVoice], voice: newVoice.name });
    };

    const handleDownloadAudio = () => {
        if (!audioDataUrl) return;
        const blob = new Blob([decode(audioDataUrl).buffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `auroraframe-audio-${Date.now()}.wav`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleAddPause = () => {
        if (!textareaRef.current) return;
        const { selectionStart, value } = textareaRef.current;
        const pauseTag = ' [pause:500ms] ';
        const newText = value.slice(0, selectionStart) + pauseTag + value.slice(selectionStart);
        setState({ text: newText });

        // Focus and set cursor position after the inserted tag
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPosition = selectionStart + pauseTag.length;
                textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
            }
        }, 0);
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Audio Suite</h2>
                <p className="text-gray-400 mt-2">Generate high-quality speech from text with pre-built or custom-cloned voices.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Text to Speech */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
                    <div className="flex items-center gap-3">
                        <MicIcon className="w-6 h-6" />
                        <h3 className="text-xl font-semibold">Text-to-Speech</h3>
                    </div>

                    <div>
                        <label htmlFor="tts-text" className="block text-sm font-medium mb-1">Text</label>
                        <textarea
                            id="tts-text"
                            ref={textareaRef}
                            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600"
                            rows={6}
                            value={text}
                            onChange={(e) => setState({ text: e.target.value })}
                            placeholder="Enter the text you want to convert to speech..."
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={handleAddPause}
                                className="flex items-center gap-2 bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-500 text-sm transition-colors"
                                title="Insert a 500ms pause at the cursor position"
                            >
                                <PauseIcon /> Add Pause
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="tts-voice" className="block text-sm font-medium mb-1">Voice</label>
                        <select
                            id="tts-voice"
                            value={voice}
                            onChange={(e) => setState({ voice: e.target.value })}
                            className="w-full p-2 bg-gray-700 rounded-md border border-gray-600"
                        >
                            <optgroup label="Standard Voices">
                                {corePrebuiltVoices.map(v => (
                                    <option key={v.name} value={v.name}>{v.name} ({v.description})</option>
                                ))}
                            </optgroup>
                             <optgroup label="Bengali Documentary Voices">
                                {bengaliDocumentaryVoices.map(v => (
                                    <option key={v.name} value={v.name}>{v.name} ({v.description})</option>
                                ))}
                            </optgroup>
                            {customVoices.length > 0 && <optgroup label="My Custom Voices">
                                {customVoices.map(v => (
                                    <option key={v.name} value={v.name}>{v.name} ({v.description})</option>
                                ))}
                            </optgroup>}
                        </select>
                    </div>

                    <button
                        onClick={handleGenerateSpeech}
                        disabled={isLoading}
                        className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader /> : <SparklesIcon />}
                        {isLoading ? 'Generating Audio...' : 'Generate Audio'}
                    </button>
                    {error && <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-lg text-sm">{error}</div>}
                    
                    {audioDataUrl && !isLoading && (
                        <div className="pt-4 border-t border-gray-700 flex items-center justify-center gap-4">
                            <button
                                onClick={() => playAudio(audioDataUrl)}
                                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                            >
                                <PlayIcon /> Play
                            </button>
                             <button
                                onClick={handleDownloadAudio}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                <DownloadIcon /> Download
                            </button>
                        </div>
                    )}
                </div>

                {/* Voice Cloning */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4 flex flex-col">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-6 h-6 text-purple-400" />
                        <h3 className="text-xl font-semibold">Instant Voice Cloning</h3>
                    </div>
                     <p className="text-sm text-gray-400 flex-grow">Describe the voice you want to create. The AI will generate a new voice profile based on your description, ready to use for text-to-speech.</p>
                     <div>
                        <label htmlFor="clone-prompt" className="block text-sm font-medium mb-1">Voice Description</label>
                        <textarea
                            id="clone-prompt"
                            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600"
                            rows={4}
                            value={customVoicePrompt}
                            onChange={(e) => setState({ customVoicePrompt: e.target.value })}
                            placeholder="e.g., A friendly and energetic female voice for a YouTube vlog"
                        />
                    </div>
                     <button
                        onClick={handleAddCustomVoice}
                        className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                        Create & Add Voice
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AudioSuite;