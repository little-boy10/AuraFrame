// Fix: Replaced incorrect component code with actual type definitions.
export enum AppTab {
  SCENE_CREATOR = 'Scene Creator',
  IMAGE_STUDIO = 'Image Studio',
  VIDEO_EDITOR = 'Video Editor',
  SCRIPT_WRITER = 'Script Writer',
  VIRAL_CATALYST = 'Viral Catalyst',
  AUDIO_SUITE = 'Audio Suite',
  CHATBOT = 'Chatbot',
  HISTORY = 'History',
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
export type VideoResolution = '720p' | '1080p' | '4k' | '8k';
export type VideoGenerationStyle = 'photorealistic' | 'cinematic' | 'vibrant' | 'minimalist' | 'documentary' | 'vintage';
export type CameraMovement = 'Static Shot' | 'Pan Left' | 'Pan Right' | 'Tilt Up' | 'Tilt Down' | 'Zoom In' | 'Zoom Out' | 'Dolly Zoom' | 'Tracking Shot';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  file?: {
    name: string;
    type: string;
    dataUrl: string;
  };
}

export type HistoryItemType = 'image' | 'video' | 'audio' | 'text';

export interface HistoryItem {
  id: number;
  timestamp: string;
  type: HistoryItemType;
  prompt: string;
  data: string; // URL or text content
  metadata?: any;
  operation?: any; // For video polling
}

export interface Clip {
  id: string;
  historyItemId: number;
  type: 'video' | 'audio';
  source: string; // data URL
  name: string;
  duration: number; // in seconds
  volume: number;
  effects?: {
      blur?: number;
      grayscale?: number;
      brightness?: number;
      contrast?: number;
      saturate?: number;
  };
}

export interface TimelineState {
  video: Clip[];
  audio: Clip[];
}
