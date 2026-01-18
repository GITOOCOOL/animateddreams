
export interface DreamAnalysis {
  title: string;
  summary: string;
  interpretation: string;
  symbolism: string[];
  visualPrompt: string; // Optimized prompt for image/video generation
  mood?: string; // Psychological mood (Dual Agent)
}

export interface DreamAttachment {
  id: string;
  file: File;
  previewUrl: string;
  base64: string; // Raw base64 data without prefix for API
  mimeType: string;
  width?: number;
  height?: number;
}

export interface ComfySettings {
  model: string;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  denoise: number;
  width: number;
  height: number;
  lora?: string;
  loraStrength?: number;
  seed?: number; // Optional seed override
  useIpAdapter?: boolean; // Face Matching
  useOriginalDimensions?: boolean; // Bypass resizing
}

export interface AgentConfig {
  model: string;
  temperature: number;
  systemPrompt?: string; // Optional override
  provider: 'ollama' | 'gemini';
}

export interface DualAgentSettings {
  useDualAgent: boolean; // Master toggle
  psychologist: AgentConfig;
  visualizer: AgentConfig;
}

export interface VideoSettings {
  model: string;
  fps: number;
  duration: number; // Seconds (e.g., 6)
  motionBucketId: number; // For SVD, usually 127
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
  showFallbackConfirmation?: boolean;
  
  // Progress State
  isLoading: boolean;
  progress: number; // For Neural Generation
  progressStatus: string;
  analysisProgress: number; // For Text Analysis
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey?: () => Promise<boolean>;
      openSelectKey?: () => Promise<void>;
    };
  }
}
