import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { UndoIcon } from '../icons/UndoIcon';
import { RedoIcon } from '../icons/RedoIcon';
import { ScissorsIcon } from '../icons/ScissorsIcon';

const Toolbar: React.FC = () => {
    const { appState, undo, redo, splitClip } = useAppContext();
    const { history, timeline, selectedClipId, playheadPosition } = appState.videoEditor;
    const { past, future } = history;
    
    const selectedClip = [...timeline.video, ...timeline.audio].find(c => c.id === selectedClipId);
    let isSplittable = false;

    if (selectedClip) {
        const track = timeline.video.includes(selectedClip) ? timeline.video : timeline.audio;
        let clipStartTime = 0;
        for (const clip of track) {
            if (clip.id === selectedClip.id) {
                const clipEndTime = clipStartTime + clip.duration;
                if (playheadPosition > clipStartTime && playheadPosition < clipEndTime) {
                    isSplittable = true;
                }
                break;
            }
            clipStartTime += clip.duration;
        }
    }


    return (
        <div className="flex items-center gap-4 bg-gray-700/50 p-2 rounded-md">
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
            
            <div className="w-px h-6 bg-gray-600"></div>

            <button
                onClick={splitClip}
                disabled={!isSplittable}
                className="flex items-center gap-2 p-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Split Clip at Playhead"
                aria-label="Split Clip"
            >
                <ScissorsIcon className="w-5 h-5"/>
                <span className="text-sm font-medium">Split</span>
            </button>
        </div>
    );
};

export default Toolbar;
