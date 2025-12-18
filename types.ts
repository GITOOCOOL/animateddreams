
export interface DreamAnalysis {
  title: string;
  summary: string;
  interpretation: string;
  symbolism: string[];
  visualPrompt: string; // Optimized prompt for image/video generation
}

export interface DreamAttachment {
  id: string;
  file: File;
  previewUrl: string;
  base64: string; // Raw base64 data without prefix for API
  mimeType: string;
}

export interface DreamState {
  rawText: string;
  attachments: DreamAttachment[];
  analysis: DreamAnalysis | null;
  generatedImageUrl: string | null;
  generatedVideoUrl: string | null;
  isAnalyzing: boolean;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  error: string | null;
}
