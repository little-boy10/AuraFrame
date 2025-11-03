import React from 'react';
import { generateImage, generateVideoFromImage } from '../services/geminiService';
import { addToHistory } from '../services/historyService';
import { AspectRatio } from '../types';
import ApiKeySelector from './ApiKeySelector';
import { Loader } from './icons/Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import { useAppContext } from '../context/AppContext';

const cameraMovements = [
  'Static Shot',
  'Smooth Pan (Left to Right)',
  'Smooth Pan (Right to Left)',
  'Slow Tilt Up',
  'Slow Tilt Down',
  'Smooth Dolly Push-in',
  'Smooth Dolly Pull-out',
  'Tracking Shot (Follow Subject)',
  'Crane Shot (Boom Up)',
  'Crane Shot (Boom Down)',
  'Low Angle Shot',
  'High Angle Shot',
  'Dutch Angle',
  'Point of View (POV)',
  'Zoom In (Slow)',
  'Zoom Out (Slow)',
  'Arc Shot (Clockwise)',
  'Arc Shot (Counter-Clockwise)',
];

const SceneCreator: React.FC = () => {
  const { appState, setAppState } = useAppContext();
  const {
    imagePrompt, aspectRatio, visualStyle, isGeneratingImage, generatedImage,
    videoPrompt, resolution, cameraMovement, isGeneratingVideo, generatedVideo, videoStatus, error
  } = appState.sceneCreator;

  const setState = (updates: Partial<typeof appState.sceneCreator>) => {
    setAppState(prev => ({ ...prev, sceneCreator: { ...prev.sceneCreator, ...updates } }));
  };

  const handleImageGeneration = async () => {
    if (!imagePrompt) {
      setState({ error: 'Image prompt cannot be empty.' });
      return;
    }
    setState({ error: null, isGeneratingImage: true, generatedImage: null, generatedVideo: null });

    // --- Start of Prompt Engineering ---
    const stylePrefix = visualStyle === 'High-Res Cinematic'
      ? 'An ultra-realistic 4K, HDR, 3D cinematic render, like an Unreal Engine 5 cutscene, creating an eye-catching, psychologically engaging image based on this narrative: '
      : 'A stylized, low-poly 3D render with angular surfaces and sharp shadows, like a military simulation diagram, creating an eye-catching, tactical image based on this narrative: ';

    const storytellingHook = ' Weave in a subtle emotional hook or a hint of a hidden motive related to themes of conflict, espionage, or high-stakes scenarios.';
    
    const visibilityRule = " CRITICAL: Ensure all characters are fully and appropriately clothed for their role and context (e.g., suit, patient gown, tactical gear), avoiding any nudity.";

    const finalImagePrompt = stylePrefix + imagePrompt + storytellingHook + visibilityRule;
    // --- End of Prompt Engineering ---

    try {
      const imageUrl = await generateImage(finalImagePrompt, aspectRatio, 1);
      // Save the user's original prompt to history for clarity
      const newHistoryItem = { type: 'image' as const, prompt: imagePrompt, data: imageUrl, metadata: { aspectRatio, visualStyle } };
      addToHistory(newHistoryItem);
      
      setAppState(prev => ({
          ...prev,
          sceneCreator: { ...prev.sceneCreator, generatedImage: imageUrl, isGeneratingImage: false },
          history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
      }));

    } catch (err) {
      setState({ error: err instanceof Error ? err.message : 'An unknown error occurred during image generation.', isGeneratingImage: false });
    }
  };
  
  const handleVideoGeneration = async () => {
    if (!generatedImage || !videoPrompt) {
        setState({ error: "An initial image and a video prompt are required." });
        return;
    }
    setState({ error: null, isGeneratingVideo: true, generatedVideo: null });
    
    // --- Start of Prompt Engineering ---
    const smoothContentRule = `Animate this scene with a cinematic '${cameraMovement}' camera movement to enhance drama and visual appeal. The action is: ${videoPrompt}.`;
    const visibilityRule = " Ensure characters remain fully and appropriately clothed throughout the animation.";
    const finalVideoPrompt = smoothContentRule + visibilityRule;
    // --- End of Prompt Engineering ---

    try {
        const videoDataUrl = await generateVideoFromImage(
            generatedImage, 
            finalVideoPrompt, 
            aspectRatio, 
            resolution,
            (status) => setState({ videoStatus: status })
        );
        // Save the user's original prompt to history
        const newHistoryItem = { type: 'video' as const, prompt: videoPrompt, data: videoDataUrl, metadata: { aspectRatio, resolution, visualStyle, cameraMovement, sourceImage: generatedImage } };
        addToHistory(newHistoryItem);
        
        setAppState(prev => ({
            ...prev,
            sceneCreator: { ...prev.sceneCreator, generatedVideo: videoDataUrl, isGeneratingVideo: false, videoStatus: '' },
            history: { ...prev.history, items: [{ ...newHistoryItem, id: Date.now(), timestamp: new Date().toISOString() }, ...prev.history.items] }
        }));

    } catch (err) {
        setState({ error: err instanceof Error ? err.message : "An unknown error occurred during video generation.", isGeneratingVideo: false, videoStatus: '' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">Scene Creator</h2>
        <p className="text-gray-400 mt-2">Craft your narrative, frame by frame. Start with a powerful image, then bring it to life.</p>
      </div>

      {error && <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Image Generation */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
            <div className="flex items-center gap-2">
                <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
                <h3 className="text-xl font-semibold">Generate the First Frame</h3>
            </div>
          <textarea
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            rows={5}
            value={imagePrompt}
            onChange={(e) => setState({ imagePrompt: e.target.value })}
            placeholder="Describe your character, action, and environment..."
          />
          <div className="flex flex-wrap items-center gap-4">
             <label htmlFor="visual-style" className="font-medium">Visual Style:</label>
            <select
              id="visual-style"
              title="Choose the overall aesthetic for the generation."
              value={visualStyle}
              onChange={(e) => setState({ visualStyle: e.target.value as 'High-Res Cinematic' | 'Low-Poly Tactical' })}
              className="bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="High-Res Cinematic">High-Res Cinematic</option>
              <option value="Low-Poly Tactical">Low-Poly Tactical</option>
            </select>
            <label htmlFor="aspect-ratio" className="font-medium">Aspect Ratio:</label>
            <select
              id="aspect-ratio"
              title="Choose the width-to-height ratio for your image and video. Common formats are 16:9 for widescreen and 9:16 for mobile."
              value={aspectRatio}
              onChange={(e) => setState({ aspectRatio: e.target.value as AspectRatio })}
              className="bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="4:3">4:3 (Classic TV)</option>
              <option value="3:4">3:4 (Classic Portrait)</option>
            </select>
          </div>
          <button
            onClick={handleImageGeneration}
            disabled={isGeneratingImage}
            title="Creates a high-quality still image using the Imagen-4 model based on your prompt. This will be the first frame of your video."
            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGeneratingImage ? <Loader /> : <SparklesIcon />}
            {isGeneratingImage ? 'Generating Image...' : 'Generate Image'}
          </button>
        </div>

        {/* Display Image */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-center min-h-[300px]">
          {isGeneratingImage ? (
            <div className="text-center space-y-2">
                <Loader large={true} />
                <p>Creating your scene...</p>
            </div>
          ) : generatedImage ? (
            <img src={generatedImage} alt="Generated scene" className="max-h-96 w-auto rounded-md object-contain" />
          ) : (
            <div className="text-gray-500 text-center">
              <p>Your generated image will appear here.</p>
            </div>
          )}
        </div>
      </div>
      
      {generatedImage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-gray-700">
          {/* Step 2: Video Generation */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
            <div className="flex items-center gap-2">
                <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</span>
                <h3 className="text-xl font-semibold">Animate the Scene</h3>
            </div>
            <ApiKeySelector>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="video-resolution" className="block text-sm font-medium mb-1">Resolution:</label>
                        <select
                            id="video-resolution"
                            value={resolution}
                            onChange={(e) => setState({ resolution: e.target.value as '720p' | '1080p' })}
                            className="bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-purple-500 w-full"
                        >
                            <option value="720p">720p (Fast)</option>
                            <option value="1080p">1080p (HD)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="camera-movement" className="block text-sm font-medium mb-1">Camera Movement:</label>
                        <select
                            id="camera-movement"
                            value={cameraMovement}
                            onChange={(e) => setState({ cameraMovement: e.target.value })}
                            className="bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-purple-500 w-full"
                        >
                            {cameraMovements.map(move => (
                                <option key={move} value={move}>{move}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <textarea
                  className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  rows={4}
                  value={videoPrompt}
                  onChange={(e) => setState({ videoPrompt: e.target.value })}
                  placeholder="Describe the action in the scene..."
                />
                <button
                  onClick={handleVideoGeneration}
                  disabled={isGeneratingVideo}
                  title="Animates your generated image using the Veo model. Describe the desired camera movement and action in the prompt."
                  className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGeneratingVideo ? <Loader /> : <SparklesIcon />}
                  {isGeneratingVideo ? 'Generating Video...' : 'Generate Video'}
                </button>
              </div>
            </ApiKeySelector>
          </div>

          {/* Display Video */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-center min-h-[300px]">
            {isGeneratingVideo ? (
              <div className="text-center space-y-2">
                <Loader large={true} />
                <p>Animating your scene...</p>
                {videoStatus && <p className="text-sm text-purple-400">{videoStatus}</p>}
              </div>
            ) : generatedVideo ? (
              <video src={generatedVideo} controls autoPlay loop className="max-h-96 w-auto rounded-md" />
            ) : (
              <div className="text-gray-500 text-center">
                <p>Your generated video will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneCreator;