
import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateVideo, checkVideoStatus } from '../services/geminiService';
import { addToHistory } from '../services/historyService';
import { AspectRatio, VideoResolution, VideoGenerationStyle, CameraMovement } from '../types';
import { Loader } from './icons/Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import ApiKeySelector from './ApiKeySelector';
import { DownloadIcon } from './icons/DownloadIcon';

const SceneCreator: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { prompt, aspectRatio, resolution, visualStyle, cameraMovement, isLoading, operation, error, statusMessage } = appState.sceneCreator;

    const setState = (updates: Partial<typeof appState.sceneCreator>) => {
        setAppState(prev => ({ ...prev, sceneCreator: { ...prev.sceneCreator, ...updates } }));
    };

    const stopPolling = () => {
        if (appState.sceneCreator.pollingIntervalId) {
            clearInterval(appState.sceneCreator.pollingIntervalId);
            setState({ pollingIntervalId: null });
        }
    };
    
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [appState.sceneCreator.pollingIntervalId]);

    const handleGenerateVideo = async () => {
        setState({ isLoading: true, error: null, operation: null, statusMessage: 'Initializing video generation...' });
        try {
            const op = await generateVideo(prompt, aspectRatio, resolution, visualStyle, cameraMovement);
            setState({ operation: op, statusMessage: 'Video generation started. This may take a few minutes. Checking status...' });

            const intervalId = setInterval(async () => {
                try {
                    const updatedOp = await checkVideoStatus(op);
                    setState({ operation: updatedOp });

                    if (updatedOp.done) {
                        stopPolling();
                        if (updatedOp.error) {
                            setState({ error: updatedOp.error.message, isLoading: false, statusMessage: 'Generation failed.' });
                        } else {
                            const videoUri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                            if (videoUri) {
                                const downloadLink = `${videoUri}&key=${process.env.API_KEY}`;
                                const newHistoryItem = {
                                    type: 'video' as const,
                                    prompt,
                                    data: downloadLink,
                                    metadata: { aspectRatio, resolution, visualStyle, cameraMovement },
                                    operation: updatedOp,
                                };
                                addToHistory(newHistoryItem);
                                setAppState(prev => ({
                                    ...prev,
                                    sceneCreator: {
                                        ...prev.sceneCreator,
                                        isLoading: false,
                                        statusMessage: 'Video generation complete!',
                                    },
                                    history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
                                }));
                            } else {
                                setState({ error: "Generation finished but no video URI was found.", isLoading: false, statusMessage: 'Error.' });
                            }
                        }
                    } else {
                         setState({ statusMessage: 'Still processing... The AI is working its magic.' });
                    }
                } catch (pollErr) {
                    stopPolling();
                    const errMsg = pollErr instanceof Error ? pollErr.message : "An unknown polling error occurred.";
                    if (errMsg.includes("Requested entity was not found.")) {
                        setState({ error: "API Key not found. Please re-select your API key and try again.", isLoading: false, statusMessage: 'Error.' });
                    } else {
                        setState({ error: errMsg, isLoading: false, statusMessage: 'Error during status check.' });
                    }
                }
            }, 10000); // Poll every 10 seconds
            setState({ pollingIntervalId: intervalId });
        } catch (err) {
            setState({ error: err instanceof Error ? err.message : 'Failed to start video generation', isLoading: false, statusMessage: 'Error.' });
        }
    };

    const generatedVideoUrl = operation?.response?.generatedVideos?.[0]?.video?.uri ? `${operation.response.generatedVideos[0].video.uri}&key=${process.env.API_KEY}` : null;

    const handleDownloadVideo = () => {
        if (!generatedVideoUrl) return;
        const link = document.createElement('a');
        link.href = generatedVideoUrl;
        link.download = `auroraframe-scene-${Date.now()}.mp4`;
        // Fetch as blob to download correctly
        fetch(generatedVideoUrl)
            .then(res => res.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                link.href = blobUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            });
    };

    const visualStyles: VideoGenerationStyle[] = ['photorealistic', 'cinematic', 'vibrant', 'minimalist', 'documentary', 'vintage'];
    const cameraMovements: CameraMovement[] = ['Static Shot', 'Pan Left', 'Pan Right', 'Tilt Up', 'Tilt Down', 'Zoom In', 'Zoom Out', 'Dolly Zoom', 'Tracking Shot'];

    return (
        <ApiKeySelector>
            <div className="space-y-6">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">Scene Creator</h2>
                    <p className="text-gray-400 mt-2">Bring your ideas to life. Generate stunning video scenes from a text prompt using Veo.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <h3 className="text-xl font-semibold">1. Describe Your Scene</h3>
                        <textarea
                            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500"
                            rows={5}
                            value={prompt}
                            onChange={e => setState({ prompt: e.target.value })}
                            placeholder="e.g., An astronaut riding a horse on the moon..."
                            disabled={isLoading}
                        />
                        
                        <h3 className="text-xl font-semibold pt-2">2. Set the Style</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="font-medium block mb-1">Visual Style:</label>
                                <select value={visualStyle} onChange={e => setState({ visualStyle: e.target.value as VideoGenerationStyle })} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 capitalize" disabled={isLoading}>
                                    {visualStyles.map(style => <option key={style} value={style}>{style}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="font-medium block mb-1">Camera Movement:</label>
                                <select value={cameraMovement} onChange={e => setState({ cameraMovement: e.target.value as CameraMovement })} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" disabled={isLoading}>
                                    {cameraMovements.map(move => <option key={move} value={move}>{move}</option>)}
                                </select>
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold pt-2">3. Technical Settings</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="font-medium block mb-1">Aspect Ratio:</label>
                                <select value={aspectRatio} onChange={e => setState({ aspectRatio: e.target.value as AspectRatio })} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" disabled={isLoading}>
                                    <option value="16:9">16:9 (Landscape)</option>
                                    <option value="9:16">9:16 (Portrait)</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-medium block mb-1">Resolution:</label>
                                <select value={resolution} onChange={e => setState({ resolution: e.target.value as VideoResolution })} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" disabled={isLoading}>
                                    <option value="1080p">1080p</option>
                                    <option value="720p">720p</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateVideo}
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 mt-4"
                        >
                            {isLoading ? <Loader /> : <SparklesIcon />} {isLoading ? 'Generating...' : 'Generate Scene'}
                        </button>
                        {error && <p className="text-red-400">{error}</p>}
                    </div>
                    <div className="space-y-4 bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col">
                        <h3 className="text-xl font-semibold">Generated Video</h3>
                        <div className="bg-gray-900 rounded-lg flex flex-col items-center justify-center flex-grow min-h-[300px] p-4 space-y-4">
                            {isLoading && (
                                <div className="text-center">
                                    <Loader large={true} />
                                    <p className="text-lg font-semibold mt-4 text-gray-300">Generating Video</p>
                                    <p className="text-gray-400 mt-2">{statusMessage}</p>
                                    <p className="text-sm text-gray-500 mt-2">(This can take several minutes. Please be patient.)</p>
                                </div>
                            )}
                            {!isLoading && generatedVideoUrl && (
                                <>
                                    <video src={generatedVideoUrl} controls autoPlay loop className="max-h-[400px] w-auto rounded-md" />
                                    <button
                                        onClick={handleDownloadVideo}
                                        className="w-full max-w-xs mt-4 flex justify-center items-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"
                                    >
                                        <DownloadIcon />
                                        Download Video
                                    </button>
                                </>
                            )}
                            {!isLoading && !generatedVideoUrl && (
                                <p className="text-gray-500">Your generated video will appear here.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ApiKeySelector>
    );
};

export default SceneCreator;
