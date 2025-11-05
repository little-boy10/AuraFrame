
import React from 'react';
import { useAppContext } from '../context/AppContext';
import Timeline from './editor/Timeline';
import { HistoryItem } from '../types';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';

const VideoEditor: React.FC = () => {
    const { appState, addClipToTimeline, undo, redo } = useAppContext();
    const { history, videoEditor } = appState;
    const { timeline } = videoEditor;
    const { past, future } = videoEditor.history;

    const mediaItems = history.items.filter(item => item.type === 'video' || item.type === 'audio');
    
    const selectedClip = videoEditor.timeline.find(clip => clip.id === videoEditor.selectedClipId);
    const currentVideoUrl = selectedClip?.source || (timeline.length > 0 ? timeline[0].source : null);


    const handleAddClip = (item: HistoryItem) => {
        // Mock duration for now, in a real scenario we'd get this from video metadata
        const duration = item.type === 'video' ? 10 : 5;
        addClipToTimeline({
            historyItemId: item.id,
            type: item.type,
            source: item.data,
            name: item.prompt,
            duration: duration
        });
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Video Editor</h2>
                <p className="text-gray-400 mt-2">Assemble your generated clips into a sequence. Add, remove, and re-order clips.</p>
            </div>

            {/* Editor Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
                {/* Media Bin */}
                <div className="lg:col-span-1 bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Media Bin</h3>
                    <div className="overflow-y-auto flex-grow space-y-2 pr-2">
                        {mediaItems.length > 0 ? mediaItems.map(item => (
                            <div key={item.id} className="bg-gray-700 p-2 rounded-md flex items-center gap-3">
                                {item.type === 'video' ? (
                                    <video src={item.data} className="w-20 h-12 object-cover rounded bg-black flex-shrink-0" muted />
                                ) : (
                                    <div className="w-20 h-12 bg-gray-600 rounded flex items-center justify-center text-xs text-gray-300 flex-shrink-0">Audio Clip</div>
                                )}
                                <div className="flex-grow overflow-hidden">
                                    <p className="text-sm font-medium line-clamp-2 text-ellipsis">{item.prompt}</p>
                                    <p className="text-xs text-gray-400 capitalize">{item.type}</p>
                                </div>
                                <button
                                    onClick={() => handleAddClip(item)}
                                    className="bg-purple-600 text-white px-3 py-1 text-sm rounded hover:bg-purple-700 flex-shrink-0"
                                >
                                    Add
                                </button>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-8">No media in history. Generate scenes or audio first.</p>
                        )}
                    </div>
                </div>

                {/* Preview and Controls */}
                <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Preview</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={undo}
                                disabled={past.length === 0}
                                className="p-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Undo (Ctrl+Z)"
                                aria-label="Undo"
                            >
                                <UndoIcon />
                            </button>
                            <button
                                onClick={redo}
                                disabled={future.length === 0}
                                className="p-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Redo (Ctrl+Y)"
                                aria-label="Redo"
                            >
                                <RedoIcon />
                            </button>
                        </div>
                    </div>
                    <div className="bg-black flex-grow rounded-md flex items-center justify-center">
                        {currentVideoUrl ? (
                            <video key={currentVideoUrl} src={currentVideoUrl} controls className="max-h-full max-w-full" />
                        ) : (
                            <p className="text-gray-500">Add clips to the timeline to preview</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 h-48">
                <h3 className="text-lg font-semibold mb-2">Timeline</h3>
                <Timeline />
            </div>
        </div>
    );
};

export default VideoEditor;
