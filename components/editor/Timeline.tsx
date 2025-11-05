
import React from 'react';
import { useAppContext } from '../../context/AppContext';

const Timeline: React.FC = () => {
    const { appState, selectClip, deleteClipFromTimeline } = useAppContext();
    const { timeline, selectedClipId } = appState.videoEditor;

    const totalDuration = timeline.reduce((acc, clip) => acc + clip.duration, 0);
    const scale = 20; // pixels per second

    return (
        <div className="h-full w-full overflow-x-auto overflow-y-hidden bg-gray-900 rounded-md" style={{ background: 'repeating-linear-gradient(90deg, #2d3748, #2d3748 1px, #1a202c 1px, #1a202c 100px)'}}>
            <div className="relative h-full flex items-center" style={{ width: `${totalDuration * scale}px`, minWidth: '100%' }}>
                {timeline.map((clip, index) => {
                    const leftOffset = timeline.slice(0, index).reduce((acc, c) => acc + c.duration, 0);
                    return (
                        <div
                            key={clip.id}
                            onClick={() => selectClip(clip.id)}
                            className={`absolute h-20 rounded-lg cursor-pointer border-2 p-2 flex items-center overflow-hidden transition-all duration-150 ${selectedClipId === clip.id ? 'border-purple-500 bg-purple-900/50' : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'}`}
                            style={{ left: `${leftOffset * scale}px`, width: `${clip.duration * scale}px` }}
                            title={clip.name}
                        >
                            <span className="text-white text-xs font-medium truncate">{clip.name}</span>
                            {selectedClipId === clip.id && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // prevent re-selecting
                                        deleteClipFromTimeline(clip.id);
                                    }}
                                    className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold hover:bg-red-500 z-10"
                                    title="Delete clip"
                                    aria-label="Delete clip"
                                >
                                    X
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Timeline;
