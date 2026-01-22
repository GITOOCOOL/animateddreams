import React from 'react';
import { Video, Loader2, Play, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EngineSelector from '../shared/EngineSelector';

interface VideoPanelProps {
  videoUrl: string | null;
  isGeneratingVideo: boolean;
  onGenerateVideo: () => void;
  videoEnabled: boolean;
  onSelectKey: () => void;
  currentVideoModel?: string;
  onOpenVideoSettings?: () => void;
  hasAnalysis: boolean;

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
}

const VideoPanel: React.FC<VideoPanelProps> = ({
  videoUrl,
  isGeneratingVideo,
  onGenerateVideo,
  videoEnabled,
  onSelectKey,
  currentVideoModel,
  onOpenVideoSettings,
  hasAnalysis,
  availableEngines = [],
  selectedEngineId,
  onSelectEngine
}) => {
  return (
    <div className="flex flex-col gap-4 relative">
       {/* Header / Title */}
       <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400 tracking-widest uppercase flex items-center gap-2">
                <Video className="w-4 h-4 text-pink-400" />
                <span>Video Generation Module</span>
            </h3>
            {isGeneratingVideo && <Loader2 className="w-3 h-3 text-pink-400 animate-spin" />}
       </div>

      <div className="group relative bg-card border border-subtle rounded-2xl overflow-hidden min-h-[300px] flex items-center justify-center transition-all bg-[url('/grid-pattern.png')]">
        
        <AnimatePresence mode="wait">
            <motion.div className="w-full h-full absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {videoUrl ? (
                    <div className="w-full h-full relative group/video">
                        <video
                            src={videoUrl}
                            controls
                            autoPlay
                            loop
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4 bg-black/80 border border-pink-500/50 px-2 py-1 rounded text-[10px] text-pink-400 font-mono animate-pulse pointer-events-none">
                            ● LIVE_FEED: VEO-3.1
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 opacity-30 group-hover:opacity-50 transition-opacity">
                        <div className="w-16 h-16 bg-hover rounded-full flex items-center justify-center mx-auto mb-4 border border-subtle">
                            <Play className="w-6 h-6 text-dim ml-1" />
                        </div>
                        <p className="text-dim font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                            {videoEnabled ? "[ Awaiting Temporal Sequence ]" : "[ Authentication Required ]"}
                        </p>
                        {!videoEnabled && (
                            <button onClick={onSelectKey} className="mt-4 text-xs font-bold text-amber-600 dark:text-amber-500 border border-amber-500/30 bg-amber-100 dark:bg-amber-900/10 px-4 py-2 rounded uppercase hover:bg-amber-200 dark:hover:bg-amber-900/20 transition-colors">
                                Initiate Auth Protocol
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
      </div>

       {/* Control Bar */}
       <div className="flex items-center gap-3 p-1">
            {/* Model Info */}
            <div className="flex-1 bg-surface border border-subtle rounded-lg px-3 py-2 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                     {/* Engine Selector */}
                     <div className="flex items-center gap-2">
                         <span className="text-[9px] text-dim font-mono uppercase hidden sm:block">Engine:</span>
                         {availableEngines.length > 0 && onSelectEngine ? (
                            <EngineSelector
                                engines={availableEngines}
                                selectedEngineId={selectedEngineId || null}
                                onSelectEngine={onSelectEngine}
                                moduleType="video"
                            />
                         ) : (
                             <span className="text-xs text-red-500 font-mono">No Engines</span>
                         )}
                    </div>

                    <div className="w-px h-8 bg-border-subtle"></div>

                     {/* Model Name */}
                     <div className="flex flex-col">
                        <span className="text-[9px] text-dim font-mono uppercase">Target Model</span>
                        <span className="text-xs font-bold text-pink-600 dark:text-pink-400 font-mono truncate max-w-[120px]">
                            {currentVideoModel ? currentVideoModel.split('.')[0].toUpperCase() : 'SELECT_MODEL'}
                        </span>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                     <button
                        onClick={onOpenVideoSettings}
                        className="p-2 hover:bg-hover rounded-lg text-dim hover:text-main transition-colors"
                        title="Video Settings"
                     >
                        <Settings className="w-4 h-4" />
                     </button>
                 </div>
            </div>

            {/* Generate Button */}
           
               <button 
                  onClick={() => {
                       if (hasAnalysis && !isGeneratingVideo && videoEnabled) {
                           onGenerateVideo();
                       }
                  }}
                  disabled={!hasAnalysis || isGeneratingVideo || !videoEnabled}
                  className={`
                      h-full px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2
                      ${hasAnalysis && !isGeneratingVideo && videoEnabled
                          ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_20px_rgba(219,39,119,0.3)]' 
                          : 'bg-card text-dim cursor-not-allowed'}
                  `}
              >
                  {isGeneratingVideo 
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Rendering</> 
                    : <><Video className="w-4 h-4" /> Generate Video</>}
              </button>
       </div>
    </div>
  );
};

export default VideoPanel;
