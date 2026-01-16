import React from 'react';
import { Image as ImageIcon, Video, Loader2, Play, AlertCircle, Cpu, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressBar from './ProgressBar';

interface MediaPanelProps {
  imageUrl: string | null;
  videoUrl: string | null;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  onGenerateImage: () => void;
  onGenerateVideo: () => void;
  hasAnalysis: boolean;
  videoEnabled: boolean;
  onSelectKey: () => void;
  progress?: number;
  onOpenSettings?: () => void;
  isModelSelected: boolean;
  settingsContent?: React.ReactNode;
  
  // New props for integrated selector
  onShowWorkflow?: () => void;
  availableModels: string[];
  currentModel: string;
  onModelSelect: (model: string) => void;
  isComfyConnected: boolean;
  onOpenVideoSettings?: () => void;
  
  // Visualization
  visualizationContent?: React.ReactNode;
  isVisualizing?: boolean;
}

const MediaPanel: React.FC<MediaPanelProps> = ({
  imageUrl,
  videoUrl,
  isGeneratingImage,
  isGeneratingVideo,
  onGenerateImage,
  onGenerateVideo,
  hasAnalysis,
  videoEnabled,
  onSelectKey,
  progress = 0,
  onOpenSettings,
  isModelSelected,
  settingsContent,
  onShowWorkflow,
  availableModels,
  currentModel,
  onModelSelect,
  isComfyConnected,
  onOpenVideoSettings,
  visualizationContent,
  isVisualizing = false
}) => {
  const [activeView, setActiveView] = React.useState<'image' | 'video'>('image');

  // Auto-switch to video view if video starts generating
  React.useEffect(() => {
    if (isGeneratingVideo) setActiveView('video');
  }, [isGeneratingVideo]);
  
  // Auto-switch to image view if image starts generating
  React.useEffect(() => {
    if (isGeneratingImage) setActiveView('image');
  }, [isGeneratingImage]);

  return (
    <div className="space-y-4 flex flex-col flex-1">
      
      {/* Unified Display Area */}
      <div className="group relative bg-black border border-slate-800 rounded-lg overflow-hidden h-full min-h-[350px] flex items-center justify-center transition-all bg-[url('/grid-pattern.png')] flex-1">
        
        <AnimatePresence mode="wait">
            {activeView === 'image' ? (
                /* IMAGE VIEW */
                <motion.div key="image-view" className="w-full h-full absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {isVisualizing && visualizationContent ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/95 z-20 p-6 animate-in fade-in duration-300">
                             {visualizationContent}
                        </div>
                    ) : imageUrl ? (
                        <div className="w-full h-full relative">
                            <img src={imageUrl} alt="Dream visualization" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 border-2 border-cyan-500/0 group-hover:border-cyan-500/50 transition-all pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                                <p className="text-cyan-400 text-xs font-mono">SOURCE: GENERATED_VISUAL</p>
                            </div>
                            {/* Workflow View Button */}
                            {onShowWorkflow && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowWorkflow();
                                    }}
                                    className="absolute top-4 left-4 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-white/70 hover:text-cyan-400 transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                                    title="View Workflow"
                                >
                                    <Activity className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 opacity-30 group-hover:opacity-50 transition-opacity">
                            <ImageIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-2">
                                {hasAnalysis ? "[ Ready to Render ]" : "[ Awaiting Analysis ]"}
                            </p>
                            <div className="h-px w-12 bg-slate-800"></div>
                        </div>
                    )}
                </motion.div>
            ) : (
                /* VIDEO VIEW */
                <motion.div key="video-view" className="w-full h-full absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {videoUrl ? (
                        <div className="w-full h-full relative">
                            <video
                                src={videoUrl}
                                controls
                                autoPlay
                                loop
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 right-4 bg-black/80 border border-pink-500/50 px-2 py-1 rounded text-[10px] text-pink-400 font-mono animate-pulse">
                                ● LIVE_FEED: VEO-3.1
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 opacity-30 group-hover:opacity-50 transition-opacity">
                            <div className="w-12 h-12 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-800">
                                <Play className="w-4 h-4 text-slate-700 ml-0.5" />
                            </div>
                            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">
                                {videoEnabled ? "[ Awaiting Sequence ]" : "[ Authentication Required ]"}
                            </p>
                            {!videoEnabled && (
                                <button onClick={onSelectKey} className="mt-4 text-xs font-bold text-amber-500 border border-amber-500/30 bg-amber-900/10 px-4 py-2 rounded uppercase hover:bg-amber-900/20 transition-colors">
                                    Initiate Auth Protocol
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* Progress Bar Overlay */}
        {(isGeneratingImage || isGeneratingVideo || progress > 0) && (
            <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-none">
                 <ProgressBar progress={progress} />
            </div>
        )}
      </div>

       {/* Bottom Controls */}
       <div className="flex flex-col items-stretch gap-4">
           
           {/* Image Module Control */}
           <div className={`
                flex-1 flex flex-col gap-1 p-3 rounded-lg border transition-colors cursor-pointer relative
                ${activeView === 'image' ? 'border-cyan-900/50 bg-cyan-900/5' : 'border-transparent hover:bg-white/5'}
           `}
                onClick={() => setActiveView('image')}
           >
                {/* Popover Settings Panel */}
                {settingsContent && (
                    <div className="absolute bottom-full left-0 mb-4 w-[400px] z-50 origin-bottom-left">
                        {settingsContent}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Image Module</span>
                    {activeView === 'image' && isGeneratingImage && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
                </div>
                
                <div className="flex items-start gap-3 mt-1">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${isComfyConnected ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                    
                    <div className="flex flex-col flex-1 w-full min-w-0">
                        <div className="flex items-center justify-between">
                             <span className={`text-xs font-mono font-bold ${isComfyConnected ? 'text-green-400' : 'text-red-400'}`}>
                                {isComfyConnected ? 'COMFY_NODE READY' : 'OFFLINE'}
                             </span>
                        </div>
                        
                        {/* Internal Layout: Stack on small screens (< 640px covers < 400px req) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 gap-2">
                            <span className="text-[10px] text-slate-400 font-mono truncate w-full sm:w-auto sm:max-w-[150px]">
                                {currentModel ? currentModel.replace('.safetensors', '') : 'No Model Selected'}
                            </span>
                            {isModelSelected ? (
                                <div className="flex items-center gap-1 self-start sm:self-auto">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenSettings && onOpenSettings();
                                        }}
                                        className="text-[9px] uppercase font-bold text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 px-2 py-0.5 rounded transition-all"
                                    >
                                        Config
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (hasAnalysis && !isVisualizing && !isGeneratingImage) onGenerateImage();
                                        }}
                                        disabled={!hasAnalysis || isVisualizing || isGeneratingImage}
                                        className={`
                                            text-[9px] uppercase font-bold px-2 py-0.5 rounded transition-all
                                            ${hasAnalysis && !isVisualizing && !isGeneratingImage
                                                ? 'text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)] animate-pulse cursor-pointer' 
                                                : 'text-slate-500 bg-slate-800 cursor-not-allowed opacity-50'}
                                        `}
                                    >
                                        {hasAnalysis ? (isVisualizing || isGeneratingImage ? 'BUSY' : 'RENDER') : 'WAITING'}
                                    </button>
                                </div>
                            ) : (
                                onOpenSettings && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenSettings();
                                        }}
                                        className="text-[9px] uppercase font-bold text-cyan-500 hover:text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/50 hover:border-cyan-500/50 transition-all self-start sm:self-auto"
                                    >
                                        Configure
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>
           </div>


           {/* Video Module Control */}
           <div
             onClick={() => {
                 setActiveView('video');
                 if (videoEnabled && !isGeneratingVideo && hasAnalysis) {
                     onGenerateVideo();
                 } else if (!videoEnabled) {
                     onSelectKey();
                 }
             }}
             className={`
                flex-1 flex flex-col gap-1 p-3 rounded-lg border transition-colors cursor-pointer relative
                ${activeView === 'video' ? 'border-pink-900/50 bg-pink-900/5' : 'border-transparent hover:bg-white/5'}
             `}
           >


                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Video Module</span>
                    {activeView === 'video' && isGeneratingVideo && <Loader2 className="w-3 h-3 text-pink-400 animate-spin" />}
                </div>
                
                <div className="flex items-center gap-3 mt-1">
                     <div className={`flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 ${activeView === 'video' ? 'text-pink-400' : 'text-slate-600'}`}>
                        {activeView === 'video' ? <Video className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                     </div>

                     <div className="flex flex-col flex-1 w-full min-w-0">
                         <div className="flex items-center justify-between">
                            <span className={`text-xs font-mono font-bold leading-none ${activeView === 'video' ? 'text-pink-400' : 'text-slate-500'}`}>
                                {videoEnabled ? 'ACTIVE: GOOGLE VEO' : 'LOCKED'}
                            </span>
                         </div>
                         
                         {/* Internal Layout: Stack on small screens */}
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 gap-2">
                            <span className="text-[9px] text-slate-600 font-mono truncate leading-tight w-full sm:w-auto">
                                High Fidelity Generation
                            </span>
                            {videoEnabled && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenVideoSettings && onOpenVideoSettings();
                                    }}
                                    className="text-[9px] uppercase font-bold text-pink-500 hover:text-pink-400 bg-pink-950/30 px-2 py-0.5 rounded border border-pink-900/50 hover:border-pink-500/50 transition-all self-start sm:self-auto"
                                >
                                    Configure
                                </button>
                            )}
                         </div>
                     </div>
                </div>
           </div>

       </div>
    </div>
  );
};
export default MediaPanel;