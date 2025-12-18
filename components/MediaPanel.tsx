import React from 'react';
import { Image as ImageIcon, Video, Loader2, Play, AlertCircle, Cpu } from 'lucide-react';

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
  onSelectKey
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
          {imageUrl ? (
            <>
              <img src={imageUrl} alt="Dream visualization" className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-cyan-500/0 group-hover:border-cyan-500/50 transition-all pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-cyan-400 text-xs font-mono">SOURCE: GEMINI-3-PRO-IMAGE</p>
              </div>
            </>
          ) : (
            <div className="text-center p-6 opacity-40">
              <ImageIcon className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">[ No Signal ]</p>
            </div>
          )}
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