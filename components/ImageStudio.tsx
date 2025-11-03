
import React, { useCallback } from 'react';
import { generateImage, editImage, analyzeImage, upscaleImage } from '../services/geminiService';
import { addToHistory } from '../services/historyService';
import { AspectRatio } from '../types';
import { Loader } from './icons/Loader';
import { UploadIcon } from './icons/UploadIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { useAppContext } from '../context/AppContext';

type StudioTab = 'generate' | 'edit' | 'analyze';

const ImageStudio: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const activeTab = appState.imageStudio.activeTab;

    const setActiveTab = (tab: StudioTab) => {
        setAppState(prev => ({ ...prev, imageStudio: { ...prev.imageStudio, activeTab: tab } }));
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'generate':
                return <GenerateImage />;
            case 'edit':
                return <EditImage />;
            case 'analyze':
                return <AnalyzeImage />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Image Studio</h2>
                <p className="text-gray-400 mt-2">Your creative hub for all things image-related. Generate, edit, and understand visuals with AI.</p>
            </div>
            <div className="flex justify-center border-b border-gray-700">
                <button onClick={() => setActiveTab('generate')} className={`px-6 py-3 font-medium text-lg transition-colors ${activeTab === 'generate' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Generate</button>
                <button onClick={() => setActiveTab('edit')} className={`px-6 py-3 font-medium text-lg transition-colors ${activeTab === 'edit' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Edit</button>
                <button onClick={() => setActiveTab('analyze')} className={`px-6 py-3 font-medium text-lg transition-colors ${activeTab === 'analyze' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Analyze</button>
            </div>
            <div className="p-4 md:p-6 bg-gray-800 rounded-lg border border-gray-700">
                {renderTabContent()}
            </div>
        </div>
    );
};

// --- Sub-components for each tab ---

const GenerateImage: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { prompt, aspectRatio, isLoading, isUpscaling, image, error } = appState.imageStudio.generate;

    const setState = (updates: Partial<typeof appState.imageStudio.generate>) => {
        setAppState(prev => ({ ...prev, imageStudio: { ...prev.imageStudio, generate: { ...prev.imageStudio.generate, ...updates } } }));
    };

    const handleGenerate = async () => {
        setState({ isLoading: true, error: null, image: null });
        try {
            const result = await generateImage(prompt, aspectRatio, 1);
            const newHistoryItem = { type: 'image' as const, prompt, data: result, metadata: { aspectRatio } };
            addToHistory(newHistoryItem);

            setAppState(prev => ({
                ...prev,
                imageStudio: { ...prev.imageStudio, generate: { ...prev.imageStudio.generate, image: result, isLoading: false } },
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));
        } catch (err) {
            setState({ error: err instanceof Error ? err.message : 'Failed to generate image', isLoading: false });
        }
    };

    const handleUpscale = async () => {
        if (!image) return;
        setState({ isUpscaling: true, error: null });
        try {
            const result = await upscaleImage(image);
            const newHistoryItem = { type: 'image' as const, prompt: 'Upscaled Image', data: result, metadata: { original: image } };
            addToHistory(newHistoryItem);

            setAppState(prev => ({
                ...prev,
                imageStudio: { ...prev.imageStudio, generate: { ...prev.imageStudio.generate, image: result, isUpscaling: false } },
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));
        } catch (err) {
            setState({ error: err instanceof Error ? err.message : 'Failed to upscale image', isUpscaling: false });
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Image Generation</h3>
                <textarea className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" rows={4} value={prompt} onChange={e => setState({ prompt: e.target.value })} placeholder="Enter a prompt..."/>
                <div className="flex items-center gap-4">
                    <label className="font-medium">Aspect Ratio:</label>
                    <select value={aspectRatio} onChange={e => setState({ aspectRatio: e.target.value as AspectRatio })} className="bg-gray-700 border border-gray-600 rounded-md p-2">
                        <option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option><option value="4:3">4:3</option><option value="3:4">3:4</option>
                    </select>
                </div>
                <button 
                  onClick={handleGenerate} 
                  disabled={isLoading || isUpscaling} 
                  title="Creates a high-quality still image using the Imagen-4 model based on your prompt."
                  className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600">
                    {isLoading ? <Loader/> : <SparklesIcon />} {isLoading ? 'Generating...' : 'Generate'}
                </button>
                {error && <p className="text-red-400">{error}</p>}
            </div>
            <div className="bg-gray-900 rounded-lg flex flex-col items-center justify-center min-h-[256px] p-4 space-y-4">
                {isLoading ? <Loader large={true} /> : image ? (
                    <>
                        <img src={image} alt="Generated" className="max-h-80 w-auto rounded-md object-contain"/>
                        <button
                            onClick={handleUpscale}
                            disabled={isUpscaling || isLoading}
                            className="w-full max-w-xs flex justify-center items-center gap-2 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-600"
                        >
                            {isUpscaling ? <Loader /> : <SparklesIcon />}
                            {isUpscaling ? 'Upscaling...' : 'Upscale to Higher Resolution'}
                        </button>
                    </>
                ) : <p className="text-gray-500">Image will appear here</p>}
            </div>
        </div>
    );
};

const EditImage: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { file, preview, prompt, isLoading, editedImage, error } = appState.imageStudio.edit;

    const setState = (updates: Partial<typeof appState.imageStudio.edit>) => {
        setAppState(prev => ({ ...prev, imageStudio: { ...prev.imageStudio, edit: { ...prev.imageStudio.edit, ...updates } } }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const selectedFile = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => setState({ file: selectedFile, preview: reader.result as string, editedImage: null });
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleEdit = async () => {
        if (!file || !prompt || !preview) {
            setState({ error: 'Please upload an image and provide an edit prompt.' });
            return;
        }
        setState({ isLoading: true, error: null });
        try {
            const result = await editImage(preview, prompt);
            const newHistoryItem = { type: 'image' as const, prompt, data: result, metadata: { edit: true, original: preview } };
            addToHistory(newHistoryItem);

            setAppState(prev => ({
                ...prev,
                imageStudio: { ...prev.imageStudio, edit: { ...prev.imageStudio.edit, editedImage: result, isLoading: false } },
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));
        } catch (err) {
            setState({ error: err instanceof Error ? err.message : 'Failed to edit image', isLoading: false });
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold">Image Editor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <label className="block w-full cursor-pointer bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500">
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        <UploadIcon className="mx-auto h-12 w-12 text-gray-400"/>
                        <span className="mt-2 block text-sm font-medium text-gray-300">{file ? file.name : 'Click to upload an image'}</span>
                    </label>
                     <textarea className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" rows={3} value={prompt} onChange={e => setState({ prompt: e.target.value })} placeholder="e.g., Add a retro filter, remove the background..."/>
                     <button onClick={handleEdit} disabled={isLoading || !file} className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600">
                        {isLoading ? <Loader /> : <SparklesIcon />} {isLoading ? 'Editing...' : 'Apply Edit'}
                    </button>
                    {error && <p className="text-red-400">{error}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 rounded-lg flex flex-col items-center justify-center p-2"><p className="text-sm font-bold mb-2">Original</p>{preview ? <img src={preview} alt="Original" className="max-h-80 w-auto rounded-md object-contain"/> : <p className="text-gray-500 text-center flex-grow flex items-center">Upload an image to see a preview</p>}</div>
                    <div className="bg-gray-900 rounded-lg flex flex-col items-center justify-center p-2"><p className="text-sm font-bold mb-2">Edited</p>{isLoading ? <Loader large={true} /> : editedImage ? <img src={editedImage} alt="Edited" className="max-h-80 w-auto rounded-md object-contain"/> : <p className="text-gray-500 text-center flex-grow flex items-center">Edited image will appear here</p>}</div>
                </div>
            </div>
        </div>
    );
};

const AnalyzeImage: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { file, preview, isLoading, analysis, error } = appState.imageStudio.analyze;

    const setState = (updates: Partial<typeof appState.imageStudio.analyze>) => {
        setAppState(prev => ({ ...prev, imageStudio: { ...prev.imageStudio, analyze: { ...prev.imageStudio.analyze, ...updates } } }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const selectedFile = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => setState({ file: selectedFile, preview: reader.result as string, analysis: null });
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleAnalyze = async () => {
        if (!file || !preview) {
            setState({ error: 'Please upload an image to analyze.' });
            return;
        }
        setState({ isLoading: true, error: null });
        try {
            const result = await analyzeImage(preview);
            const newHistoryItem = { type: 'text' as const, prompt: `Analysis of ${file.name}`, data: result, metadata: { image: preview } };
            addToHistory(newHistoryItem);

            setAppState(prev => ({
                ...prev,
                imageStudio: { ...prev.imageStudio, analyze: { ...prev.imageStudio.analyze, analysis: result, isLoading: false } },
                history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
            }));
        } catch (err) {
            setState({ error: err instanceof Error ? err.message : 'Failed to analyze image', isLoading: false });
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold">Image Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                     <label className="block w-full cursor-pointer bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500">
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        <UploadIcon className="mx-auto h-12 w-12 text-gray-400"/>
                        <span className="mt-2 block text-sm font-medium text-gray-300">{file ? file.name : 'Click to upload an image'}</span>
                    </label>
                    <div className="bg-gray-900 rounded-lg flex items-center justify-center min-h-[256px]">
                        {preview ? <img src={preview} alt="Preview" className="max-h-80 w-auto rounded-md object-contain"/> : <p className="text-gray-500 text-center">Upload an image to see a preview</p>}
                    </div>
                    <button onClick={handleAnalyze} disabled={isLoading || !file} className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600">
                        {isLoading ? <Loader /> : <SparklesIcon />} {isLoading ? 'Analyzing...' : 'Analyze Image'}
                    </button>
                    {error && <p className="text-red-400">{error}</p>}
                </div>
                <div className="bg-gray-900 rounded-lg p-4 h-full min-h-[300px] overflow-y-auto">
                    <h4 className="font-bold mb-2">Analysis Results:</h4>
                    {isLoading ? <Loader large={true} /> : analysis ? <p className="text-gray-300 whitespace-pre-wrap">{analysis}</p> : <p className="text-gray-500">Analysis will appear here.</p>}
                </div>
            </div>
        </div>
    );
};

export default ImageStudio;
