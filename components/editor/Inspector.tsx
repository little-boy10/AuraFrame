import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Clip } from '../../types';

interface EffectSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    displayMultiplier?: number;
    unit?: string;
}

const EffectSlider: React.FC<EffectSliderProps> = ({ label, value, min, max, step, onChange, displayMultiplier = 1, unit = '' }) => (
    <div className="space-y-1">
        <label className="block text-sm font-medium">{label}</label>
        <div className="flex items-center gap-2">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm w-16 text-center bg-gray-700 p-1 rounded-md">
                {(value * displayMultiplier).toFixed(0)}{unit}
            </span>
        </div>
    </div>
);


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

    const handleEffectChange = (effectName: keyof NonNullable<Clip['effects']>, value: number) => {
        updateClipProperties(selectedClip.id, { effects: { [effectName]: value } });
    };

    const resetEffects = () => {
        updateClipProperties(selectedClip.id, {
            effects: {
                blur: 0,
                grayscale: 0,
                brightness: 1,
                contrast: 1,
                saturate: 1,
            }
        });
    };

    return (
        <div className="space-y-4 flex-grow overflow-y-auto pr-2">
            <div>
                <h4 className="font-bold text-lg mb-2 capitalize">{selectedClip.type} Clip</h4>
                <p className="text-sm bg-gray-700 p-2 rounded-md truncate" title={selectedClip.name}>{selectedClip.name}</p>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-gray-700/50">
                <h5 className="font-semibold">Properties</h5>
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
                    <span className="text-sm w-16 text-center bg-gray-700 p-1 rounded-md">{(selectedClip.volume * 100).toFixed(0)}%</span>
                </div>
            </div>

            {selectedClip.type === 'video' && (
                <div className="space-y-3 pt-2 border-t border-gray-700/50">
                    <div className="flex justify-between items-center">
                        <h5 className="font-semibold">Visual Effects</h5>
                         <button
                            onClick={resetEffects}
                            className="text-xs text-purple-400 hover:text-purple-300 hover:underline"
                        >
                            Reset Effects
                        </button>
                    </div>

                    <EffectSlider 
                        label="Blur"
                        value={selectedClip.effects?.blur ?? 0}
                        min={0} max={20} step={1}
                        onChange={val => handleEffectChange('blur', val)}
                        unit="px"
                    />
                     <EffectSlider 
                        label="Grayscale"
                        value={selectedClip.effects?.grayscale ?? 0}
                        min={0} max={1} step={0.01}
                        onChange={val => handleEffectChange('grayscale', val)}
                        displayMultiplier={100}
                        unit="%"
                    />
                    <EffectSlider 
                        label="Brightness"
                        value={selectedClip.effects?.brightness ?? 1}
                        min={0} max={2} step={0.01}
                        onChange={val => handleEffectChange('brightness', val)}
                        displayMultiplier={100}
                        unit="%"
                    />
                     <EffectSlider 
                        label="Contrast"
                        value={selectedClip.effects?.contrast ?? 1}
                        min={0} max={2} step={0.01}
                        onChange={val => handleEffectChange('contrast', val)}
                        displayMultiplier={100}
                        unit="%"
                    />
                     <EffectSlider 
                        label="Saturation"
                        value={selectedClip.effects?.saturate ?? 1}
                        min={0} max={2} step={0.01}
                        onChange={val => handleEffectChange('saturate', val)}
                        displayMultiplier={100}
                        unit="%"
                    />
                </div>
            )}
        </div>
    );
};

export default Inspector;