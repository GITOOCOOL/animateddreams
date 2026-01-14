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
        <div className="w-full h-full relative group overflow-hidden rounded-xl bg-black border border-slate-800">
            {/* Main Image */}
            <div className="absolute inset-0 flex items-center justify-center">
                <img 
                    src={imageUrl} 
                    alt="Result" 
                    className="w-full h-full object-contain"
                />
                
                {/* Subtle Grid Overlay for 'Tech' feel */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
            </div>

            {/* Top Toolbar */}
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

            {/* Bottom Detail Panel */}
            <div className={`absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 transition-transform duration-300 flex flex-col ${showDetails ? 'translate-y-0' : 'translate-y-[85%]'}`}>
                
                {/* Drag/Toggle Handle */}
                <div 
                    className="w-full h-6 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setShowDetails(!showDetails)}
                >
                    <div className="w-12 h-1 bg-slate-600 rounded-full" />
                </div>

                <div className="px-6 pb-6 pt-2 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate leading-tight">{title || "Dream Realized"}</h3>
                            <p className="text-xs font-mono text-cyan-400 mt-1 line-clamp-2 opacity-80">
                                {prompt}
                            </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                             <button onClick={handleSave} className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20">
                                 <Download className="w-4 h-4" />
                             </button>
                             <button onClick={() => alert("Link copied!")} className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all">
                                 <Share2 className="w-4 h-4" />
                             </button>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowFullView(true)}
                        className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <Eye className="w-4 h-4" /> Inspect Image
                    </button>
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
