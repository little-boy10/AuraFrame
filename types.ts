import { AspectRatio } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export enum AppTab {
  SCENE_CREATOR = 'Scene Creator',
  IMAGE_STUDIO = 'Image Studio',
  CONTENT_ANALYSIS = 'Content Analysis',
  AUDIO_SUITE = 'Audio Suite',
  CHATBOT = 'Chatbot',
  HISTORY = 'History',
}

export type HistoryItemType = 'image' | 'video' | 'audio' | 'text';

export interface HistoryItem {
    id: number;
    type: HistoryItemType;
    prompt: string;
    data: string; // data URLs for media, raw text for text
    timestamp: string;
    metadata?: Record<string, any>;
}
