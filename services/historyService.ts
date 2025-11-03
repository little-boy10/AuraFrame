import { HistoryItem } from '../types';

const HISTORY_KEY = 'auraframe-studio-history';

export const getHistory = (): HistoryItem[] => {
    try {
        const historyJson = localStorage.getItem(HISTORY_KEY);
        if (historyJson) {
            return JSON.parse(historyJson);
        }
    } catch (error) {
        console.error("Failed to parse history from localStorage", error);
        localStorage.removeItem(HISTORY_KEY);
    }
    return [];
};

export const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>): void => {
    try {
        const history = getHistory();
        const newItem: HistoryItem = {
            ...item,
            id: Date.now(),
            timestamp: new Date().toISOString(),
        };
        // Prepend new item to show most recent first
        const newHistory = [newItem, ...history];
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
        console.error("Failed to add item to history", error);
        alert("Failed to save to history. Storage might be full.");
    }
};

export const deleteHistoryItem = (id: number): void => {
    const history = getHistory();
    const newHistory = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
};

export const clearHistory = (): void => {
    localStorage.removeItem(HISTORY_KEY);
};
