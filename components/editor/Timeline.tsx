import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Clip } from '../../types';
import { CameraIcon } from '../icons/CameraIcon';
import { MusicNoteIcon } from '../icons/MusicNoteIcon';

const PIXELS_PER_SECOND = 40;
const RULER_HEIGHT = 20;
const TRACK_HEIGHT = 80;

const Timeline: React.FC = () => {
    const { appState, selectClip, deleteClipFromTimeline, setPlayheadPosition } = useAppContext();
    const { timeline, selectedClipId, playheadPosition } = appState.videoEditor;
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingPlayheadRef = useRef(false);

    const totalDuration = Math.max(
        timeline.video.reduce((acc, clip) => acc + clip.duration, 0),
        timeline.audio.reduce((acc, clip) => acc + clip.duration, 0),
        10 // Minimum duration of 10s
    );

    const handleScrub = useCallback((e: MouseEvent) => {
        if (isDraggingPlayheadRef.current && timelineContainerRef.current) {
            const rect = timelineContainerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const newPosition = Math.max(0, x / PIXELS_PER_SECOND);
            setPlayheadPosition(Math.min(newPosition, totalDuration));
        }
    }, [setPlayheadPosition, totalDuration]);

    const stopScrubbing = useCallback(() => {
        isDraggingPlayheadRef.current = false;
        window.removeEventListener('mousemove', handleScrub);
        window.removeEventListener('mouseup', stopScrubbing);
    }, [handleScrub]);

    const startScrubbing = useCallback((e: React.MouseEvent) => {
        isDraggingPlayheadRef.current = true;
        // Trigger initial scrub
        if (timelineContainerRef.current) {
            const rect = timelineContainerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            setPlayheadPosition(Math.min(Math.max(0, x / PIXELS_PER_SECOND), totalDuration));
        }
        window.addEventListener('mousemove', handleScrub);
        window.addEventListener('mouseup', stopScrubbing);
    }, [handleScrub, stopScrubbing, totalDuration]);
    
    // Cleanup event listeners
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleScrub);
            window.removeEventListener('mouseup', stopScrubbing);
        };
    }, [handleScrub, stopScrubbing]);

    const renderTrack = (clips: Clip[], trackName: 'V1' | 'A1') => {
        let leftOffset = 0;
        return (
            <div className="h-full relative flex items-center" style={{ height: `${TRACK_HEIGHT}px` }}>
                <div className="absolute top-0 left-0 h-full w-12 bg-gray-800 flex items-center justify-center border-r border-gray-700 z-10">
                    <span className="font-bold text-gray-400">{trackName}</span>
                </div>
                <div className="relative h-full w-full ml-12">
                    {clips.map(clip => {
                        const style = {
                            left: `${leftOffset * PIXELS_PER_SECOND}px`,
                            width: `${clip.duration * PIXELS_PER_SECOND}px`,
                        };
                        leftOffset += clip.duration;
                        return (
                             <div
                                key={clip.id}
                                onClick={() => selectClip(clip.id)}
                                className={`absolute top-1/2 -translate-y-1/2 h-16 rounded-lg cursor-pointer border-2 p-2 flex items-center overflow-hidden transition-all duration-150 ${selectedClipId === clip.id ? 'border-purple-500 bg-purple-900/50' : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'}`}
                                style={style}
                                title={clip.name}
                            >
                                <div className="flex items-center gap-2">
                                    {clip.type === 'video' ? <CameraIcon className="w-4 h-4 text-gray-300 flex-shrink-0" /> : <MusicNoteIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                                    <span className="text-white text-xs font-medium truncate">{clip.name}</span>
                                </div>
                                {selectedClipId === clip.id && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteClipFromTimeline(clip.id); }}
                                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold hover:bg-red-500 z-20"
                                        title="Delete clip"
                                        aria-label="Delete clip"
                                    >X</button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderRuler = () => {
        const ticks = [];
        const tickInterval = 5; // seconds
        for (let i = 0; i <= totalDuration; i++) {
            const isMajorTick = i % tickInterval === 0;
            ticks.push(
                <div key={i} className="absolute h-full" style={{ left: `${i * PIXELS_PER_SECOND}px` }}>
                    <div className={`w-px ${isMajorTick ? 'h-4 bg-gray-300' : 'h-2 bg-gray-500'}`}></div>
                    {isMajorTick && <span className="absolute top-4 left-1 text-xs text-gray-400">{i}s</span>}
                </div>
            );
        }
        return <div className="relative w-full h-full ml-12">{ticks}</div>;
    };


    return (
        <div className="h-full w-full overflow-x-auto overflow-y-hidden bg-gray-900 rounded-md">
            <div 
                ref={timelineContainerRef}
                className="relative"
                style={{ width: `${totalDuration * PIXELS_PER_SECOND + 100}px`, minWidth: '100%' }}
                onMouseDown={startScrubbing}
            >
                {/* Ruler */}
                <div className="sticky top-0 h-5 bg-gray-800 z-20 border-b border-gray-700" style={{ height: `${RULER_HEIGHT}px`}}>
                    {renderRuler()}
                </div>
                 {/* Playhead */}
                <div
                    className="absolute top-0 w-0.5 bg-red-500 h-full z-20 cursor-col-resize"
                    style={{ left: `${playheadPosition * PIXELS_PER_SECOND + 48}px`, pointerEvents: 'none' }}
                >
                    <div className="absolute -top-1 -left-1.5 w-4 h-4 bg-red-500 rounded-full" style={{pointerEvents: 'all'}} onMouseDown={startScrubbing}></div>
                </div>
                {/* Tracks */}
                <div className="space-y-1 mt-1">
                    {renderTrack(timeline.video, 'V1')}
                    {renderTrack(timeline.audio, 'A1')}
                </div>
            </div>
        </div>
    );
};

export default Timeline;