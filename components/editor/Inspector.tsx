import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Clip } from '../../types';

const Inspector: React.FC = () => {
    const { appState, updateClipProperties } = useAppContext();
    const { timeline, selectedClipId } = appState.videoEditor;

    const selectedClip = [...timeline.video, ...timeline.audio].find(c => c.id === selectedClipId);

    if (!selectedClip) {
        return (
            <div className="text-gray-500 text-center py-8 flex-grow">
                <p>Select a clip on the timeline to inspect its properties.</p>
            </div>
        );
    }
    
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        updateClipProperties(selectedClip.id, { volume: newVolume });
    };

    return (
        <div className="space-y-4 flex-grow overflow-y-auto pr-2">
            <div>
                <h4 className="font-bold text-lg mb-2 capitalize">{selectedClip.type} Clip</h4>
                <p className="text-sm bg-gray-700 p-2 rounded-md truncate" title={selectedClip.name}>{selectedClip.name}</p>
            </div>
            
            <div className="space-y-2">
                <label htmlFor="volume" className="block text-sm font-medium">Volume</label>
                <div className="flex items-center gap-2">
                    <input
                        id="volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={selectedClip.volume}
                        onChange={handleVolumeChange}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm w-12 text-center bg-gray-700 p-1 rounded-md">{(selectedClip.volume * 100).toFixed(0)}%</span>
                </div>
            </div>

            {/* Future properties can be added here */}
            {/* e.g., Speed, Effects, Color Correction */}
        </div>
    );
};

export default Inspector;
