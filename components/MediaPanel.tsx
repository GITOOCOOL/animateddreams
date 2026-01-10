import React from 'react';
import { Image as ImageIcon, Video, Loader2, Play, AlertCircle, Cpu } from 'lucide-react';
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
  showSettingsPrompt?: boolean;
  onOpenSettings?: () => void;
  onDismissSettingsPrompt?: () => void;
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
  showSettingsPrompt,
  onOpenSettings,
  onDismissSettingsPrompt
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-xl font-bold uppercase text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-neon-blue" />
          Visual_Output_Modules
        </h3>
        {!videoEnabled && (
          <button
            onClick={onSelectKey}
            className="text-xs font-mono text-amber-400 hover:text-amber-300 border border-amber-500/30 px-2 py-1 rounded bg-amber-900/10 uppercase tracking-tight"
          >
            [ Unlock Veo Access ]
          </button>
        )}
      </div>

      {/* Settings Prompt Banner */}
      <AnimatePresence>
        {showSettingsPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-purple-900/20 border-l-4 border-purple-500 p-4 rounded-r flex flex-col items-center justify-center gap-4 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="bg-purple-500/20 p-2 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-purple-200 uppercase tracking-wide">Optimization Suggestion</h4>
                  <p className="text-xs text-purple-300/80 mt-1 max-w-sm">
                    Analysis complete. We recommend reviewing your render settings (Steps, CFG, Model) before synthesis to match the complexity of this dream.
                  </p>
                  {onOpenSettings && (
                    <button
                      onClick={onOpenSettings}
                      className="mt-3 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded transition-colors uppercase tracking-wider shadow-lg shadow-purple-900/50"
                    >
                      Open Settings Panel
                    </button>
                  )}
                </div>
              </div>
              {onDismissSettingsPrompt && (
                <button onClick={onDismissSettingsPrompt} className="text-slate-500 hover:text-white transition-colors absolute top-2 right-2">
                  <span className="sr-only">Dismiss</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={onGenerateImage}
          disabled={!hasAnalysis || isGeneratingImage}
          className={`
            flex-1 relative overflow-hidden group px-4 py-4 rounded-sm font-bold uppercase tracking-wider transition-all border
            ${!hasAnalysis
              ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
              : isGeneratingImage
                ? 'bg-slate-800 border-cyan-900 text-cyan-500 cursor-wait'
                : 'bg-slate-900 border-cyan-500 text-cyan-400 hover:bg-cyan-900/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]'
            }
          `}
        >
          <div className="flex items-center justify-center gap-2 relative z-10">
            {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            <span>{isGeneratingImage ? 'Rendering...' : 'Render_Still'}</span>
          </div>
          {/* Button Tech Deco */}
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-50"></div>
        </button>

        <button
          onClick={videoEnabled ? onGenerateVideo : onSelectKey}
          disabled={(!videoEnabled && false) || !hasAnalysis || isGeneratingVideo}
          className={`
            flex-1 relative overflow-hidden group px-4 py-4 rounded-sm font-bold uppercase tracking-wider transition-all border
            ${!hasAnalysis
              ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
              : isGeneratingVideo
                ? 'bg-slate-800 border-pink-900 text-pink-500 cursor-wait'
                : 'bg-slate-900 border-pink-500 text-pink-400 hover:bg-pink-900/20 hover:shadow-[0_0_15px_rgba(244,114,182,0.3)]'
            }
          `}
        >
          <div className="flex items-center justify-center gap-2 relative z-10">
            {isGeneratingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            <span>{isGeneratingVideo ? 'Processing...' : 'Render_Veo_Seq'}</span>
          </div>
          {/* Button Tech Deco */}
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-50"></div>
        </button>
      </div>

      {/* Display Area */}
      <div className="grid grid-cols-1 gap-8">

        {/* Image Card */}
        <div className="group relative bg-black border border-slate-800 rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isGeneratingImage ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 p-8"
              >
                <div className="w-full max-w-xs space-y-4">
                  <div className="mx-auto w-16 h-16 border-4 border-cyan-900/30 border-t-cyan-400 rounded-full animate-spin"></div>
                  <p className="text-cyan-400 font-mono text-xs text-center animate-pulse tracking-widest">
                    LATENT_DIFFUSION_IN_PROGRESS...
                  </p>
                  <ProgressBar progress={progress} label="SAMPLING" statusText="Denoising latents..." color="cyan" />
                </div>
              </motion.div>
            ) : imageUrl ? (
              <motion.div key="image" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
                <img src={imageUrl} alt="Dream visualization" className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-2 border-cyan-500/0 group-hover:border-cyan-500/50 transition-all pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-cyan-400 text-xs font-mono">SOURCE: GENERATED_VISUAL</p>
                </div>
              </motion.div>
            ) : (
              <div key="empty" className="text-center p-6 opacity-40">
                <ImageIcon className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">[ No Signal ]</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Card */}
        <div className="group relative bg-black border border-slate-800 rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
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
            <div className="text-center p-6 opacity-40">
              <div className="w-16 h-16 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                <Play className="w-6 h-6 text-slate-700 ml-1" />
              </div>
              <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
                {videoEnabled ? "[ Awaiting Sequence ]" : "[ Authentication Required ]"}
              </p>
            </div>
          )}
        </div>

      </div>

      {!videoEnabled && (
        <div className="flex items-start gap-3 bg-amber-900/10 text-amber-500 p-4 rounded border border-amber-500/20 font-mono text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            WARNING: Premium endpoint (Veo) requires billing authorization.
            <button onClick={onSelectKey} className="underline ml-2 font-bold hover:text-amber-400">
              [ INITIATE AUTH PROTOCOL ]
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default MediaPanel;