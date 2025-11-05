import React, { useState } from 'react';
import { generateViralStrategy } from '../services/geminiService';
import { addToHistory } from '../services/historyService';
import { Loader } from './icons/Loader';
import { UploadIcon } from './icons/UploadIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { useAppContext } from '../context/AppContext';
import { RocketIcon } from './icons/RocketIcon';

const ViralCatalyst: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { ideaOrPrompt, videoFile, audioFile, competitorUrl, isLoading, result, error } = appState.viralCatalyst;
    const [copySuccess, setCopySuccess] = useState('');
    
    const setState = (updates: Partial<typeof appState.viralCatalyst>) => {
        setAppState(prev => ({ ...prev, viralCatalyst: { ...prev.viralCatalyst, ...updates } }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'audio') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === 'video') {
            setState({ videoFile: file });
        } else {
            setState({ audioFile: file });
        }
    };
    
    const handleAnalyze = async () => {
        if (!ideaOrPrompt) {
            setState({ error: 'Please describe your core idea or niche to get started.' });
            return;
        }
        setState({ isLoading: true, error: null, result: null });
        try {
            const analysisResult = await generateViralStrategy(ideaOrPrompt, videoFile, audioFile, competitorUrl);
            const metadata = {
                hasVideo: !!videoFile,
                hasAudio: !!audioFile,
                competitorUrl: competitorUrl,
            };
            const newHistoryItem = { type: 'text' as const, prompt: `Viral Strategy: ${ideaOrPrompt}`, data: analysisResult, metadata };
            addToHistory(newHistoryItem);

            setAppState(prev => ({
                ...prev,
                viralCatalyst: { ...prev.viralCatalyst, result: analysisResult, isLoading: false },
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));
        } catch (err) {
            setState({ error: err instanceof Error ? err.message : 'Failed to generate analysis.', isLoading: false });
        }
    };

    const clearFile = (type: 'video' | 'audio') => {
        if (type === 'video') {
            setState({ videoFile: null });
        } else {
            setState({ audioFile: null });
        }
    };

    const handleCopy = () => {
        if (!result) return;
        navigator.clipboard.writeText(result).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Failed to copy');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const handleDownloadText = () => {
        if (!result) return;
        const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `viral_strategy_${ideaOrPrompt.slice(0, 30).replace(/\s/g, '_')}.txt`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="text-center">
                <div className="flex justify-center items-center gap-3 text-3xl font-bold text-white">
                    <RocketIcon />
                    <h1>Viral Catalyst</h1>
                </div>
                <p className="text-gray-400 mt-2">Your AI-powered YouTube strategist. Get a complete viral package from just an idea.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- Input Section --- */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
                    <h3 className="text-xl font-semibold">1. Provide Your Content</h3>
                    <div>
                        <label htmlFor="idea" className="block text-sm font-medium mb-1">Core Idea or Niche (Required)</label>
                        <textarea 
                            id="idea"
                            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600"
                            rows={4}
                            value={ideaOrPrompt}
                            onChange={e => setState({ ideaOrPrompt: e.target.value })}
                            placeholder="Describe your content idea, target niche, or upload a file for analysis..."
                        />
                    </div>
                     <div>
                        <label htmlFor="competitor" className="block text-sm font-medium mb-1">Competitor's Viral Video URL (Optional)</label>
                        <input 
                            id="competitor"
                            type="text"
                            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600"
                            value={competitorUrl}
                            onChange={e => setState({ competitorUrl: e.target.value })}
                            placeholder="e.g., https://www.youtube.com/watch?v=..."
                        />
                        <p className="text-xs text-gray-400 mt-1">Provide a link to a successful video in your niche. The AI will analyze its viral elements to enhance your strategy.</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-2">Upload Your Content for Deeper Analysis (Optional)</p>
                        <p className="text-xs text-gray-400 mb-2">Note: Files are processed locally. Max file size ~20MB.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FileUploader
                                file={videoFile}
                                onClear={() => clearFile('video')}
                                onChange={(e) => handleFileChange(e, 'video')}
                                accept="video/*"
                                label="Upload Your Video"
                            />
                            <FileUploader
                                file={audioFile}
                                onClear={() => clearFile('audio')}
                                onChange={(e) => handleFileChange(e, 'audio')}
                                accept="audio/*"
                                label="Upload Your Audio"
                            />
                        </div>
                    </div>
                     <button 
                        onClick={handleAnalyze} 
                        disabled={isLoading} 
                        className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600"
                    >
                        {isLoading ? <Loader /> : <SparklesIcon />} {isLoading ? 'Analyzing...' : 'Generate Viral Strategy'}
                    </button>
                    {error && <p className="text-red-400 mt-2">{error}</p>}
                </div>

                {/* --- Output Section --- */}
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700 flex flex-col">
                    <div className="p-4 flex justify-between items-center border-b border-gray-700">
                        <h3 className="text-xl font-semibold">2. Your Viral Strategy</h3>
                        {result && (
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
                    <div className="p-4 flex-grow overflow-y-auto min-h-[400px]">
                       {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Loader large={true} />
                                <p className="mt-4 text-gray-400">AI is crafting your viral strategy...</p>
                            </div>
                        ) : result ? (
                            <div className="text-gray-300 whitespace-pre-wrap prose prose-invert max-w-none prose-headings:text-purple-400 prose-strong:text-white">{result}</div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-gray-500">
                                <p>Your complete strategy package—including titles, descriptions, hashtags, and growth hacks—will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper component for file inputs
interface FileUploaderProps {
    file: File | null;
    onClear: () => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    accept: string;
    label: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ file, onClear, onChange, accept, label }) => {
    if (file) {
        return (
            <div className="bg-gray-700 border-2 border-dashed border-green-500/50 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button onClick={onClear} className="mt-2 text-xs text-red-400 hover:underline">Remove</button>
            </div>
        );
    }
    return (
        <label className="block w-full cursor-pointer bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500">
            <input type="file" className="hidden" accept={accept} onChange={onChange} />
            <UploadIcon className="mx-auto h-8 w-8 text-gray-400"/>
            <span className="mt-2 block text-sm font-medium text-gray-300">{label}</span>
        </label>
    );
};

export default ViralCatalyst;