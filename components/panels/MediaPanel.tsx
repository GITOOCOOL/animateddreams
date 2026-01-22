import React from 'react';
import { Image as ImageIcon, Loader2, Activity, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressBar from '../shared/ProgressBar';
import EngineSelector from '../shared/EngineSelector';
import { ResultView } from './ResultView';

interface MediaPanelProps {
  imageUrl: string | null;
  isGeneratingImage: boolean;
  onGenerateImage: () => void;
  hasAnalysis: boolean;
  progress?: number;
  progressStatus?: string;
  onOpenSettings?: () => void;
  isModelSelected: boolean;
  settingsContent?: React.ReactNode;
  prompt?: string;
  
  // Workflow / Visualizer
  onShowWorkflow?: () => void;
  onOpenWorkflowSettings?: () => void;
  availableModels: string[];
  currentModel: string;
  onModelSelect: (model: string) => void;
  isComfyConnected: boolean;
  onCancel?: () => void;
  
  // Engine Selection
  availableEngines?: Array<{
    id: string;
    name: string;
    type: 'analysis' | 'image' | 'video' | 'dictation';
    isAvailable: boolean;
    isConfigured: boolean;
  }>;
  selectedEngineId?: string | null;
  onSelectEngine?: (engineId: string) => void;
  
  // Visualization Content (Graph)
  visualizationContent?: React.ReactNode;
  isVisualizing?: boolean;
}

const MediaPanel: React.FC<MediaPanelProps> = ({
  imageUrl,
  isGeneratingImage,
  onGenerateImage,
  hasAnalysis,
  progress = 0,
  progressStatus,
  onOpenSettings,
  isModelSelected,
  settingsContent,
  onShowWorkflow,
  onOpenWorkflowSettings,
  availableModels,
  currentModel,
  onModelSelect,
  isComfyConnected,
  onCancel,
  visualizationContent,
  isVisualizing = false,
  prompt,
  availableEngines = [],
  selectedEngineId,
  onSelectEngine
}) => {
  const [showFullscreen, setShowFullscreen] = React.useState(false);

  return (
    <div className="space-y-4 flex flex-col flex-1">
      {/* Header */}
        <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-widest uppercase flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Image Generation Module</span>
            </h3>
            {isGeneratingImage && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
       </div>

      {/* Main Display Area */}
      <div className="group relative bg-card border border-subtle rounded-lg overflow-hidden h-full min-h-[400px] flex items-center justify-center transition-all bg-[url('/grid-pattern.png')] flex-1 shadow-subtle">
        
        {/* GLOBAL VISUALIZATION OVERLAY (Workflow Graph) */}
        {isVisualizing && visualizationContent && (
             <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 animate-in fade-in duration-300 pt-6 px-6 pb-0">
                  {visualizationContent}
             </div>
        )}

        {/* IMAGE VIEW */}
        <div className="w-full h-full absolute inset-0">
            {imageUrl ? (
                <div 
                    className="w-full h-full relative cursor-zoom-in group/image"
                    onClick={() => setShowFullscreen(true)}
                >
                    <img src={imageUrl} alt="Dream visualization" className="w-full h-full object-contain" />
                    
                    <div className="absolute inset-0 border-2 border-cyan-500/0 group-hover/image:border-cyan-500/50 transition-all pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover/image:opacity-100 transition-opacity flex justify-between items-end">
                        <p className="text-cyan-400 text-xs font-mono">SOURCE: GENERATED_VISUAL</p>
                    </div>
                    
                    {/* Fullscreen Render */}
                    {showFullscreen && (
                        <div 
                            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200 flex items-center justify-center cursor-default"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-full max-w-7xl h-full max-h-[95vh] rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 relative">
                                <ResultView 
                                    imageUrl={imageUrl} 
                                    title="Generated Dream" 
                                    prompt={prompt || "No prompt available"} 
                                    onReset={() => {
                                        setShowFullscreen(false);
                                        if (onCancel) onCancel(); 
                                    }}
                                    onClose={() => setShowFullscreen(false)}
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Workflow View Button */}
                    {onShowWorkflow && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onShowWorkflow();
                            }}
                            className="absolute top-4 left-4 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-white/70 hover:text-cyan-400 transition-all opacity-0 group-hover/image:opacity-100 transform translate-y-2 group-hover/image:translate-y-0"
                            title="View Workflow Graph"
                        >
                            <Activity className="w-5 h-5" />
                        </button>
                    )}
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 opacity-30 group-hover:opacity-50 transition-opacity">
                    <ImageIcon className="w-16 h-16 text-dim mx-auto mb-4" />
                    <p className="text-dim font-mono text-[10px] uppercase tracking-widest mb-2">
                        {hasAnalysis ? "[ Neural Link Established ]" : "[ Awaiting Input Analysis ]"}
                    </p>
                    <div className="h-px w-20 bg-border-subtle mt-2"></div>
                </div>
            )}
        </div>
      </div>
      
      {/* Progress Bar (External) & Stats */}
      {(isGeneratingImage || progress > 0) && (
          <div className="w-full z-20">
               <div className="flex justify-between items-end px-1 mb-1">
                   <span className="text-[10px] font-mono text-white/90">
                       {progressStatus}
                   </span>
               </div>
               <div className="pointer-events-none">
                    <ProgressBar progress={progress} />
               </div>
          </div>
      )}

       {/* Control Bar */}
       <div className="flex items-center gap-3 p-1">
            
            {/* Model & Config */}
            <div className="flex-1 bg-surface border border-subtle rounded-lg px-3 py-2 flex items-center justify-between relative group/config">
                 {/* Popover Settings Panel */}
                {settingsContent && (
                    <div className="absolute bottom-full left-0 mb-4 w-[400px] z-50 origin-bottom-left">
                        {settingsContent}
                    </div>
                )}

                 <div className="flex items-center gap-4">
                    {/* Engine Selector */}
                    <div className="flex items-center gap-2">
                         <span className="text-[9px] text-slate-500 font-mono uppercase hidden sm:block">Engine:</span>
                         {availableEngines.length > 0 && onSelectEngine ? (
                            <EngineSelector
                                engines={availableEngines}
                                selectedEngineId={selectedEngineId || null}
                                onSelectEngine={onSelectEngine}
                                moduleType="image"
                            />
                         ) : (
                             <span className="text-xs text-red-500 font-mono">No Engines</span>
                         )}
                    </div>
                    
                    {/* Separator */}
                    <div className="w-px h-8 bg-border-subtle"></div>

                    {/* Model Display */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isComfyConnected ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                            <span className="text-[9px] text-dim font-mono uppercase">Checkpoint</span>
                        </div>
                        <span className="text-xs font-bold text-main font-mono truncate max-w-[120px]">
                            {currentModel ? currentModel.replace('.safetensors', '') : 'SELECT_MODEL'}
                        </span>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                     <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenSettings && onOpenSettings();
                        }}
                        className="text-dim hover:text-main bg-hover p-2 rounded-lg transition-all"
                        title="Configuration"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                 </div>
            </div>

            {/* Generate Action */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (isGeneratingImage && onCancel) {
                        onCancel();
                    } else if (hasAnalysis && !isGeneratingImage) {
                        onGenerateImage();
                    }
                }}
                disabled={!hasAnalysis && !isGeneratingImage}
                className={`
                    h-full px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2
                    ${hasAnalysis && !isGeneratingImage
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                        : isGeneratingImage 
                            ? 'bg-red-900/80 hover:bg-red-900 text-white border border-red-500/30'
                            : 'bg-card text-dim cursor-not-allowed'}
                `}
            >
                {isGeneratingImage ? 'CANCEL' : 'RENDER IMAGE'}
            </button>
       </div>
    </div>
  );
};
export default MediaPanel;