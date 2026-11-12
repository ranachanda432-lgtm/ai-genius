export type ToolType = 'home' | 'chat' | 'story' | 'code' | 'image';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface StoryItem {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  tone: string;
  length: string;
  content: string;
  createdAt: number;
}

export interface CodeItem {
  id: string;
  title: string;
  prompt: string;
  language: string;
  code: string;
  explanation?: string;
  createdAt: number;
}

export interface UploadedImage {
  dataUrl: string;
  mimeType: string;
  name: string;
  size: number;
}

export interface ImageItem {
  id: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  imageUrl: string;
  modelUsed?: string;
  uploadedImagePreview?: string;
  uploadedImageName?: string;
  createdAt: number;
}
