
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
  loras?: { name: string; strength: number }[];
  seed?: number; // Optional seed override
  useIpAdapter?: boolean; // Face Matching
  ipAdapterModel?: string; // Specific IP Adapter Model File
  useOriginalDimensions?: boolean; // Bypass resizing
  ipAdapterWeight?: number; // Strength of Face ID
  ipAdapterPreset?: string; // e.g. "VIT-G" or "STANDARD"
  customNodes?: { type: string; id: string; inputs: Record<string, any> }[];
}

export interface WorkflowPreset {
  id: string;
  name: string;
  description: string;
  workflow: Record<string, any>; // The ComfyUI JSON graph
  type: 'image' | 'video';
  version: string;
  // Optional mapping to help the engine find nodes if auto-detection fails
  nodeMapping?: {
     ksampler?: string;
     checkpoint?: string;
     positive?: string;
     negative?: string;
     image_input?: string;
     output?: string;
  };
}

export interface AgentConfig {
  model: string;
  temperature: number;
  systemPrompt?: string; 
  provider: 'ollama' | 'gemini' | 'raw'; // Explicitly added 'raw'
}

export interface AnalysisLayer {
  id: string; // Dynamic UUID
  name: string; // e.g. "Prompt Enhancer"
  role: string; // e.g. "Enhancer", "Critic" (Descriptive)
  enabled: boolean;
  config: AgentConfig; // The engine settings for this layer
}

export interface AnalysisPipeline {
  layers: AnalysisLayer[];
}

export interface VideoSettings {
  model: string;
  fps: number;
  duration: number; // Seconds (e.g., 6)
  motionBucketId: number; // For SVD, usually 127
  lowVram?: boolean; // Optimization for 8GB cards
  width?: number;
  height?: number;
  baseModel?: string; // Checkpoint for AnimateDiff
  useIpAdapter?: boolean; // Hybrid Mode
  ipAdapterWeight?: number; // Strength (0.0 - 1.0)
  ipAdapterModel?: string; // Model file (Optional, if manual loading used)
  ipAdapterPreset?: string; // User selected preset (e.g. "VIT-G")
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
  analysisStatus?: string; // Separate status for Analysis
  
  // Pipeline State
  currentLayerId?: string; // Which layer is currently active
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey?: () => Promise<boolean>;
      openSelectKey?: () => Promise<void>;
    };
  }
}
