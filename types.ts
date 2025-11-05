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
export type VideoResolution = '1080p' | '720p' | '4k' | '8k';

export type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

export type HistoryItemType = 'image' | 'video' | 'audio' | 'text';

export interface HistoryItem {
  id: number;
  type: HistoryItemType;
  prompt: string;
  data: string; // URL for image/video/audio, text for text
  timestamp: string;
  metadata?: Record<string, any>;
  operation?: any; // For long-running operations like video
}

export type VideoGenerationStyle = 'cinematic' | 'vibrant' | 'minimalist' | 'documentary' | 'vintage' | 'photorealistic';
export type CameraMovement = 'Static Shot' | 'Pan Left' | 'Pan Right' | 'Tilt Up' | 'Tilt Down' | 'Zoom In' | 'Zoom Out' | 'Dolly Zoom' | 'Tracking Shot';

export interface Clip {
  id: string;
  historyItemId: number;
  type: HistoryItemType;
  source: string; // URL
  name: string; // From history item prompt
  duration: number; // in seconds
  volume: number; // From 0 to 1
  effects?: {
    blur?: number; // in pixels
    grayscale?: number; // 0 to 1
    brightness?: number; // 0 to 2 (1 is default)
    contrast?: number; // 0 to 2 (1 is default)
    saturate?: number; // 0 to 2 (1 is default)
  }
}

export type TimelineTrack = Clip[];

export interface TimelineState {
  video: TimelineTrack;
  audio: TimelineTrack;
}