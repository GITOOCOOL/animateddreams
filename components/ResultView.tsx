import React, { useState } from 'react';
import { Eye, Download, Share2, Sparkles, Maximize2, X } from 'lucide-react';
import { ImageViewer } from './ImageViewer';

interface ResultViewProps {
    imageUrl: string;
    title?: string;
    prompt?: string;
    onReset?: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ imageUrl, title, prompt, onReset }) => {
    const [showFullView, setShowFullView] = useState(false);
    const [showDetails, setShowDetails] = useState(true);

    const handleSave = async () => {
         try {
             const response = await fetch(imageUrl);
             const blob = await response.blob();
             const url = window.URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = `dream_${Date.now()}.png`;
             document.body.appendChild(a);
             a.click();
             window.URL.revokeObjectURL(url);
             document.body.removeChild(a);
         } catch(e) { window.open(imageUrl, '_blank'); }
    };

    return (

        <div className="w-full h-full flex flex-col group overflow-hidden rounded-xl bg-black border border-slate-800">
            {/* Main Image Area - Flex 1 to take remaining space */}
            <div className="relative flex-1 min-h-0 w-full bg-[#050505]">
                <div className="absolute inset-0 flex items-center justify-center p-2">
                    <img 
                        src={imageUrl} 
                        alt="Result" 
                        className="w-full h-full object-contain rounded-lg shadow-2xl"
                    />
                    
                    {/* Subtle Grid Overlay */}
                    <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                </div>

                {/* Top Toolbar (Overlay) */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-full">
                         <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" /> 
                         <span className="text-[10px] font-bold uppercase tracking-widest text-white">Synthesis Complete</span>
                     </div>
                     
                     <div className="flex gap-2">
                         <button 
                            onClick={() => setShowFullView(true)}
                            className="p-2 bg-black/50 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors"
                            title="Enter Fullscreen"
                         >
                             <Maximize2 className="w-4 h-4" />
                         </button>
                     </div>
                </div>
            </div>

            {/* Bottom Detail Panel - Static (Concatenated below image) */}
            <div className="bg-[#0F0F11] border-t border-white/10 flex-shrink-0 z-20">
                <div className="px-6 py-4 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate leading-tight">{title || "Dream Realized"}</h3>
                            <p className="text-xs font-mono text-cyan-400 mt-1 line-clamp-2 opacity-80">
                                {prompt}
                            </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                             <button onClick={handleSave} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all shadow-lg hover:shadow-cyan-500/20">
                                 <Download className="w-4 h-4" />
                             </button>
                             <button onClick={() => alert("Link copied!")} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all">
                                 <Share2 className="w-4 h-4" />
                             </button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowFullView(true)}
                            className="flex-1 py-2 bg-white text-black font-bold uppercase tracking-widest text-[10px] rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <Eye className="w-3 h-3" /> Inspect
                        </button>
                        {onReset && (
                             <button 
                                onClick={onReset}
                                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold uppercase tracking-widest text-[10px] rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-3 h-3" /> Close
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Full Screen Viewer */}
            <ImageViewer 
                isOpen={showFullView}
                onClose={() => setShowFullView(false)}
                imageUrl={imageUrl}
                title={title}
            />
        </div>
    );
};
