
import React from 'react';
import { complexQuery, analyzeVideo } from '../services/geminiService';
import { addToHistory } from '../services/historyService';
import { Loader } from './icons/Loader';
import { UploadIcon } from './icons/UploadIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { useAppContext } from '../context/AppContext';

const ContentAnalysis: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Content Analysis</h2>
                <p className="text-gray-400 mt-2">Unlock deeper insights from your content. Analyze videos and tackle complex questions.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <VideoAnalyzer />
                <ComplexQuery />
            </div>
        </div>
    );
};

const VideoAnalyzer: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { file, isLoading, analysis, error } = appState.contentAnalysis.video;
    
    const setState = (updates: Partial<typeof appState.contentAnalysis.video>) => {
        setAppState(prev => ({ ...prev, contentAnalysis: { ...prev.contentAnalysis, video: { ...prev.contentAnalysis.video, ...updates } } }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setState({ file: e.target.files[0], analysis: null, error: null });
        }
    };
    
    const handleAnalyze = async () => {
        if (!file) {
            setState({ error: 'Please select a video file to analyze.' });
            return;
        }
        setState({ isLoading: true, error: null });
        try {
            const result = await analyzeVideo(file);
            const newHistoryItem = { type: 'text' as const, prompt: `Video Analysis: ${file.name}`, data: result };
            addToHistory(newHistoryItem);

            setAppState(prev => ({
                ...prev,
                contentAnalysis: { ...prev.contentAnalysis, video: { ...prev.contentAnalysis.video, analysis: result, isLoading: false } },
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));
        } catch (err) {
            setState({ error: err instanceof Error ? err.message : 'Failed to analyze video', isLoading: false });
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
            <h3 className="text-xl font-semibold">Video Understanding</h3>
            <label className="block w-full cursor-pointer bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500">
                <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400"/>
                <span className="mt-2 block text-sm font-medium text-gray-300">{file ? file.name : 'Click to upload a video'}</span>
            </label>
             <button onClick={handleAnalyze} disabled={isLoading || !file} className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600">
                {isLoading ? <Loader /> : <SparklesIcon />} {isLoading ? 'Analyzing...' : 'Analyze Video'}
            </button>
            {error && <p className="text-red-400 mt-2">{error}</p>}
            <div className="bg-gray-900 rounded-lg p-4 min-h-[200px] max-h-96 overflow-y-auto">
                <h4 className="font-bold mb-2">Analysis Results:</h4>
                {isLoading ? <Loader large={true} /> : analysis ? <p className="text-gray-300 whitespace-pre-wrap">{analysis}</p> : <p className="text-gray-500">Video analysis will appear here.</p>}
            </div>
        </div>
    );
};

const ComplexQuery: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { prompt, isLoading, result, error } = appState.contentAnalysis.query;
    
    const setState = (updates: Partial<typeof appState.contentAnalysis.query>) => {
        setAppState(prev => ({ ...prev, contentAnalysis: { ...prev.contentAnalysis, query: { ...prev.contentAnalysis.query, ...updates } } }));
    };

    const handleQuery = async () => {
        setState({ isLoading: true, error: null, result: null });
        try {
            const response = await complexQuery(prompt);
            const newHistoryItem = { type: 'text' as const, prompt, data: response };
            addToHistory(newHistoryItem);

            setAppState(prev => ({
                ...prev,
                contentAnalysis: { ...prev.contentAnalysis, query: { ...prev.contentAnalysis.query, result: response, isLoading: false } },
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));
        } catch (err) {
            setState({ error: err instanceof Error ? err.message : 'Failed to process query', isLoading: false });
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
            <h3 className="text-xl font-semibold">Complex Query with Thinking Mode</h3>
            <p className="text-sm text-gray-400">Leverages Gemini Pro with maximum thinking budget for deep reasoning tasks.</p>
            <textarea className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" rows={5} value={prompt} onChange={e => setState({ prompt: e.target.value })} placeholder="Enter a complex prompt..."/>
             <button onClick={handleQuery} disabled={isLoading} className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600">
                {isLoading ? <Loader /> : <SparklesIcon />} {isLoading ? 'Thinking...' : 'Submit Query'}
            </button>
            {error && <p className="text-red-400 mt-2">{error}</p>}
            <div className="bg-gray-900 rounded-lg p-4 min-h-[200px] max-h-96 overflow-y-auto">
                <h4 className="font-bold mb-2">Response:</h4>
                {isLoading ? <Loader large={true} /> : result ? <p className="text-gray-300 whitespace-pre-wrap">{result}</p> : <p className="text-gray-500">The model's response will appear here.</p>}
            </div>
        </div>
    );
};

export default ContentAnalysis;
