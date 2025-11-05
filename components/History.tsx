
import React, { useMemo } from 'react';
import { deleteHistoryItem, clearHistory } from '../services/historyService';
import { HistoryItem, HistoryItemType } from '../types';
import { useAppContext } from '../context/AppContext';

const History: React.FC = () => {
    const { appState, setAppState } = useAppContext();
    const { items: history, filter } = appState.history;

    const setFilter = (newFilter: HistoryItemType | 'all') => {
        setAppState(prev => ({ ...prev, history: { ...prev.history, filter: newFilter } }));
    };

    const filteredHistory = useMemo(() => {
        if (filter === 'all') {
            return history;
        }
        return history.filter(item => item.type === filter);
    }, [history, filter]);

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            deleteHistoryItem(id);
            setAppState(prev => ({ ...prev, history: { ...prev.history, items: prev.history.items.filter(item => item.id !== id) } }));
        }
    };

    const handleClearAll = () => {
        if (window.confirm('Are you sure you want to delete your ENTIRE history? This action cannot be undone.')) {
            clearHistory();
            setAppState(prev => ({ ...prev, history: { ...prev.history, items: [] } }));
        }
    };

    const renderItemContent = (item: HistoryItem) => {
        const previewContainerClasses = "w-full h-64 bg-black flex items-center justify-center rounded-t-lg";
        switch (item.type) {
            case 'image':
                return <div className={previewContainerClasses}><img src={item.data} alt={item.prompt} className="w-full h-full object-contain" /></div>;
            case 'video':
                return <div className={previewContainerClasses}><video src={item.data} controls loop className="w-full h-full object-contain" /></div>;
            case 'audio':
                return <div className="p-4 flex items-center justify-center h-64"><audio src={item.data} controls className="w-full" /></div>;
            case 'text':
                return <div className="p-4 h-64 overflow-y-auto"><p className="text-sm text-gray-300 whitespace-pre-wrap">{item.data}</p></div>;
            default:
                return null;
        }
    };

    const filters: { label: string, value: HistoryItemType | 'all' }[] = [
        { label: 'All', value: 'all' },
        { label: 'Images', value: 'image' },
        { label: 'Videos', value: 'video' },
        { label: 'Audio', value: 'audio' },
        { label: 'Text', value: 'text' },
    ];

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Generation History</h2>
                <p className="text-gray-400 mt-2">Review and manage your previously created assets.</p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-4">
                <div className="flex flex-wrap justify-center gap-2">
                    {filters.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === f.value ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                {history.length > 0 && (
                    <button onClick={handleClearAll} className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700">
                        Clear All History
                    </button>
                )}
            </div>

            {filteredHistory.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredHistory.map(item => (
                        <div key={item.id} className="bg-gray-800 rounded-lg shadow-lg flex flex-col border border-gray-700">
                            {renderItemContent(item)}
                            <div className="p-4 flex flex-col flex-grow">
                                <p className="text-xs text-gray-400 mb-2 capitalize">{item.type} &middot; {new Date(item.timestamp).toLocaleString()}</p>
                                <p className="text-sm text-gray-300 mb-2 flex-grow line-clamp-2" title={item.prompt}>
                                    <strong>Prompt:</strong> {item.prompt}
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs mb-3">
                                    {/* Media-specific metadata */}
                                    {item.metadata?.aspectRatio && <span className="flex items-center gap-1 bg-gray-700 text-gray-300 px-2 py-1 rounded-full">🖼️ {item.metadata.aspectRatio}</span>}
                                    {item.metadata?.resolution && <span className="flex items-center gap-1 bg-gray-700 text-gray-300 px-2 py-1 rounded-full">🎞️ {item.metadata.resolution}</span>}
                                    {item.metadata?.visualStyle && <span className="flex items-center gap-1 bg-gray-700 text-gray-300 px-2 py-1 rounded-full">🎨 {item.metadata.visualStyle}</span>}
                                    {item.metadata?.cameraMovement && <span className="flex items-center gap-1 bg-gray-700 text-gray-300 px-2 py-1 rounded-full">🎥 {item.metadata.cameraMovement}</span>}
                                    {item.metadata?.voice && <span className="flex items-center gap-1 bg-gray-700 text-gray-300 px-2 py-1 rounded-full" title={item.metadata.voice}>🔊 {item.metadata.voice.split('(')[0].trim()}</span>}
                                    {/* Script-specific metadata */}
                                    {item.metadata?.audience && <span className="flex items-center gap-1 bg-gray-700 text-gray-300 px-2 py-1 rounded-full" title={`Audience: ${item.metadata.audience}`}>👥 {item.metadata.audience}</span>}
                                    {item.metadata?.tone && <span className="flex items-center gap-1 bg-gray-700 text-gray-300 px-2 py-1 rounded-full" title={`Tone: ${item.metadata.tone}`}>🎭 {item.metadata.tone}</span>}
                                    {item.metadata?.platform && <span className="flex items-center gap-1 bg-gray-700 text-gray-300 px-2 py-1 rounded-full" title={`Platform: ${item.metadata.platform}`}>📺 {item.metadata.platform}</span>}
                                </div>
                                <button onClick={() => handleDelete(item.id)} className="mt-auto w-full bg-red-800/50 text-red-300 text-xs py-1 px-2 rounded hover:bg-red-700/50 transition-colors">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-800 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-400">Your history is empty.</h3>
                    <p className="text-gray-500 mt-2">Generated content will appear here.</p>
                </div>
            )}
        </div>
    );
};

export default History;