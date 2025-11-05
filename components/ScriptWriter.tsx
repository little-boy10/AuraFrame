import React, { useState } from 'react';
import { generateScript } from '../services/geminiService';
import { addToHistory } from '../services/historyService';
import { useAppContext } from '../context/AppContext';
import { Loader } from './icons/Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import { ScriptIcon } from './icons/ScriptIcon';

const ScriptWriter: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { topic, audience, tone, length, platform, isLoading, script, error } = appState.scriptWriter;

    const [copySuccess, setCopySuccess] = useState('');

    const setState = (updates: Partial<typeof appState.scriptWriter>) => {
        setAppState(prev => ({ ...prev, scriptWriter: { ...prev.scriptWriter, ...updates } }));
    };

    const handleGenerateScript = async () => {
        setState({ isLoading: true, error: null, script: null });
        try {
            const result = await generateScript(topic, audience, tone, length, platform);
            const metadata = { audience, tone, length, platform };
            const newHistoryItem = { type: 'text' as const, prompt: topic, data: result, metadata };
            
            addToHistory(newHistoryItem);

            setAppState(prev => ({
                ...prev,
                scriptWriter: { ...prev.scriptWriter, script: result, isLoading: false },
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setState({ error: errorMessage, isLoading: false });
        }
    };

    const handleCopy = () => {
        if (!script) return;
        navigator.clipboard.writeText(script).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Failed to copy');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const handleDownloadText = () => {
        if (!script) return;
        const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `${topic.slice(0, 30).replace(/\s/g, '_')}_script.txt`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">AI Script Writer</h2>
                <p className="text-gray-400 mt-2">Generate a complete video script from a simple idea. Perfect for creators on any platform.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- Input Form --- */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
                    <div className="flex items-center gap-3">
                        <ScriptIcon />
                        <h3 className="text-xl font-semibold">Script Specifications</h3>
                    </div>

                    <div>
                        <label htmlFor="topic" className="block text-sm font-medium mb-1">Video Topic or Idea</label>
                        <textarea
                            id="topic"
                            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600"
                            rows={4}
                            value={topic}
                            onChange={(e) => setState({ topic: e.target.value })}
                            placeholder="e.g., How to build a gaming PC in 2024"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="audience" className="block text-sm font-medium mb-1">Target Audience</label>
                            <input
                                id="audience"
                                type="text"
                                value={audience}
                                onChange={(e) => setState({ audience: e.target.value })}
                                className="w-full p-2 bg-gray-700 rounded-md border border-gray-600"
                                placeholder="e.g., Beginner PC builders"
                            />
                        </div>
                         <div>
                            <label htmlFor="platform" className="block text-sm font-medium mb-1">Platform</label>
                            <select
                                id="platform"
                                value={platform}
                                onChange={(e) => setState({ platform: e.target.value })}
                                className="w-full p-2 bg-gray-700 rounded-md border border-gray-600"
                            >
                                <option>YouTube</option>
                                <option>TikTok</option>
                                <option>Instagram Reels</option>
                                <option>Corporate Training</option>
                                <option>Podcast</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tone" className="block text-sm font-medium mb-1">Tone / Style</label>
                            <select
                                id="tone"
                                value={tone}
                                onChange={(e) => setState({ tone: e.target.value })}
                                className="w-full p-2 bg-gray-700 rounded-md border border-gray-600"
                            >
                                <option>Informative</option>
                                <option>Entertaining</option>
                                <option>Inspirational</option>
                                <option>Funny / Comedic</option>
                                <option>Formal / Professional</option>
                                <option>Casual / Conversational</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="length" className="block text-sm font-medium mb-1">Desired Length</label>
                            <select
                                id="length"
                                value={length}
                                onChange={(e) => setState({ length: e.target.value })}
                                className="w-full p-2 bg-gray-700 rounded-md border border-gray-600"
                            >
                                <option>Short (&lt; 1 minute)</option>
                                <option>Medium (5-10 minutes)</option>
                                <option>Long (&gt; 15 minutes)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateScript}
                        disabled={isLoading}
                        className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader /> : <SparklesIcon />}
                        {isLoading ? 'Writing Script...' : 'Generate Script'}
                    </button>
                    {error && <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-lg text-sm">{error}</div>}
                </div>

                {/* --- Output Area --- */}
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700 flex flex-col">
                     <div className="p-4 flex justify-between items-center border-b border-gray-700">
                        <h3 className="text-xl font-semibold">Generated Script</h3>
                        {script && (
                             <div className="flex items-center gap-2">
                                <button onClick={handleCopy} className="bg-gray-700 text-sm text-gray-200 px-3 py-1 rounded-md hover:bg-gray-600">
                                    {copySuccess || 'Copy'}
                                </button>
                                <button onClick={handleDownloadText} className="bg-green-700 text-sm text-white px-3 py-1 rounded-md hover:bg-green-600">
                                    Download .txt
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="p-4 flex-grow overflow-y-auto min-h-[300px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Loader large={true} />
                                <p className="mt-4 text-gray-400">The AI is writing, please wait...</p>
                            </div>
                        ) : script ? (
                            <div className="text-gray-300 whitespace-pre-wrap prose prose-invert max-w-none prose-headings:text-purple-400">{script}</div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-gray-500">
                                <p>Your generated script will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScriptWriter;