import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Timeline from './editor/Timeline';
import Inspector from './editor/Inspector';
import Toolbar from './editor/Toolbar';
import { HistoryItem } from '../types';
import { CameraIcon } from './icons/CameraIcon';
import { MusicNoteIcon } from './icons/MusicNoteIcon';

type LeftPanelTab = 'media' | 'inspector';

const VideoEditor: React.FC = () => {
    const { appState, addClipToTimeline } = useAppContext();
    const { history, videoEditor } = appState;
    const { timeline, selectedClipId, playheadPosition } = videoEditor;

    const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('media');
    const [currentVideo, setCurrentVideo] = useState<{ src: string, volume: number } | null>(null);

    const mediaItems = history.items.filter(item => item.type === 'video' || item.type === 'audio');
    const selectedClip = [...timeline.video, ...timeline.audio].find(clip => clip.id === selectedClipId);

    // Effect to switch to inspector when a clip is selected
    useEffect(() => {
        if (selectedClipId) {
            setLeftPanelTab('inspector');
        } else {
            setLeftPanelTab('media');
        }
    }, [selectedClipId]);
    
    // Effect to update the video preview based on playhead position
    useEffect(() => {
        let currentTime = 0;
        let foundClip = false;
        for (const clip of timeline.video) {
            if (playheadPosition >= currentTime && playheadPosition < currentTime + clip.duration) {
                // To-do: seek to the correct time in the video: playheadPosition - currentTime
                setCurrentVideo({ src: clip.source, volume: clip.volume });
                foundClip = true;
                break;
            }
            currentTime += clip.duration;
        }
        if (!foundClip) {
            setCurrentVideo(null);
        }
    }, [playheadPosition, timeline.video]);


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
                <p className="text-gray-400 mt-2">Assemble your generated clips into a sequence. Split, trim, and adjust your media.</p>
            </div>

            {/* Editor Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-320px)]">
                {/* Left Panel: Media Bin / Inspector */}
                <div className="lg:col-span-1 bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col">
                    <div className="flex border-b border-gray-700 mb-4">
                        <button onClick={() => setLeftPanelTab('media')} className={`px-4 py-2 font-medium text-sm ${leftPanelTab === 'media' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}>Media Bin</button>
                        <button onClick={() => setLeftPanelTab('inspector')} className={`px-4 py-2 font-medium text-sm ${leftPanelTab === 'inspector' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`} disabled={!selectedClip}>Inspector</button>
                    </div>

                    {leftPanelTab === 'media' && (
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
                                    <button onClick={() => handleAddClip(item)} className="bg-purple-600 text-white px-3 py-1 text-sm rounded hover:bg-purple-700 flex-shrink-0">Add</button>
                                </div>
                            )) : (
                                <p className="text-gray-500 text-center py-8">No media in history. Generate scenes or audio first.</p>
                            )}
                        </div>
                    )}
                    
                    {leftPanelTab === 'inspector' && <Inspector />}

                </div>

                {/* Preview and Controls */}
                <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Preview</h3>
                    <div className="bg-black flex-grow rounded-md flex items-center justify-center">
                        {currentVideo ? (
                            <video key={currentVideo.src} src={currentVideo.src} controls autoPlay className="max-h-full max-w-full" volume={currentVideo.volume} />
                        ) : (
                            <div className="text-center text-gray-500">
                                <CameraIcon className="w-16 h-16 mx-auto" />
                                <p>Preview your video track here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toolbar and Timeline */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-4">
                <Toolbar />
                <div className="h-48">
                    <Timeline />
                </div>
            </div>
        </div>
    );
};

export default VideoEditor;