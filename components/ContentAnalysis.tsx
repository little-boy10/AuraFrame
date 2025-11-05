import React, { useState } from 'react';
import { analyzeContent } from '../services/geminiService';
import { addToHistory } from '../services/historyService';
import { Loader } from './icons/Loader';
import { UploadIcon } from './icons/UploadIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { useAppContext } from '../context/AppContext';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { FileIcon } from './icons/FileIcon';

const ContentAnalysis: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { prompt, file, isLoading, result, error } = appState.contentAnalysis;
    const [copySuccess, setCopySuccess] = useState('');
    
    const setState = (updates: Partial<typeof appState.contentAnalysis>) => {
        setAppState(prev => ({ ...prev, contentAnalysis: { ...prev.contentAnalysis, ...updates } }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setState({ file: selectedFile });
        }
    };
    
    const handleAnalyze = async () => {
        if (!prompt) {
            setState({ error: 'Please provide instructions for the AI.' });
            return;
        }
        setState({ isLoading: true, error: null, result: null });
        try {
            const analysisResult = await analyzeContent(prompt, file);
            const metadata = { hasFile: !!file };
            const newHistoryItem = { type: 'text' as const, prompt: `Content Analysis: ${prompt}`, data: analysisResult, metadata };
            addToHistory(newHistoryItem);

            setAppState(prev => ({
                ...prev,
                contentAnalysis: { ...prev.contentAnalysis, result: analysisResult, isLoading: false },
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));
        } catch (err) {
            setState({ error: err instanceof Error ? err.message : 'Failed to generate analysis.', isLoading: false });
        }
    };

    const clearFile = () => {
        setState({ file: null });
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
        const filename = `content_analysis_${prompt.slice(0, 30).replace(/\s/g, '_')}.txt`;
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
                    <LightbulbIcon />
                    <h1>Content Analysis</h1>
                </div>
                <p className="text-gray-400 mt-2">Your AI multi-tool. Upload any file and tell the AI what you want to do with it.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- Input Section --- */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
                    <h3 className="text-xl font-semibold">1. Upload & Instruct</h3>
                    
                    <div>
                        <p className="text-sm font-medium mb-2">Upload Content for Analysis (Optional)</p>
                        <p className="text-xs text-gray-400 mb-2">Upload any file (video, audio, PDF, DOCX, image, etc.). Max file size ~20MB.</p>
                        <FileUploader
                            file={file}
                            onClear={clearFile}
                            onChange={handleFileChange}
                            label="Upload Any File"
                        />
                    </div>

                    <div>
                        <label htmlFor="idea" className="block text-sm font-medium mb-1">Your Instructions (Required)</label>
                        <textarea 
                            id="idea"
                            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600"
                            rows={4}
                            value={prompt}
                            onChange={e => setState({ prompt: e.target.value })}
                            placeholder="e.g., 'Summarize this PDF', 'Transcribe this audio file', 'Critique my video script', 'What is this image about?'"
                        />
                    </div>
                     <button 
                        onClick={handleAnalyze} 
                        disabled={isLoading} 
                        className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600"
                    >
                        {isLoading ? <Loader /> : <SparklesIcon />} {isLoading ? 'Analyzing...' : 'Generate Analysis'}
                    </button>
                    {error && <p className="text-red-400 mt-2">{error}</p>}
                </div>

                {/* --- Output Section --- */}
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700 flex flex-col">
                    <div className="p-4 flex justify-between items-center border-b border-gray-700">
                        <h3 className="text-xl font-semibold">2. AI Response</h3>
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
                                <p className="mt-4 text-gray-400">AI is analyzing your content...</p>
                            </div>
                        ) : result ? (
                            <div className="text-gray-300 whitespace-pre-wrap prose prose-invert max-w-none prose-headings:text-purple-400 prose-strong:text-white">{result}</div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-gray-500">
                                <p>The AI's response based on your instructions and uploaded content will appear here.</p>
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
    label: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ file, onClear, onChange, label }) => {
    if (file) {
        return (
            <div className="bg-gray-700 border-2 border-dashed border-green-500/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    <FileIcon className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button onClick={onClear} className="mt-2 text-xs text-red-400 hover:underline">Remove</button>
            </div>
        );
    }
    return (
        <label className="block w-full cursor-pointer bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500">
            <input type="file" className="hidden" onChange={onChange} />
            <UploadIcon className="mx-auto h-8 w-8 text-gray-400"/>
            <span className="mt-2 block text-sm font-medium text-gray-300">{label}</span>
        </label>
    );
};

export default ContentAnalysis;