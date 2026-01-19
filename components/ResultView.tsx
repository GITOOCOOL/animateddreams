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
        <div className="w-full h-full flex flex-col group relative">
            {/* Main Image Area */}
            <div className="relative flex-1 min-h-0 w-full bg-[#050505] cursor-zoom-in rounded-lg overflow-hidden border border-white/5" onClick={() => setShowFullView(true)}>
                <div className="absolute inset-0 flex items-center justify-center p-2">
                    <img 
                        src={imageUrl} 
                        alt="Result" 
                        className="w-full h-full object-contain shadow-2xl"
                    />
                    
                    {/* Subtle Grid Overlay */}
                    <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                </div>

                {/* Top Toolbar (Overlay) - Updated Layout */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-30 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                     
                     <button 
                        onClick={() => setShowFullView(true)}
                        className="p-2 bg-black/60 hover:bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/10 transition-colors"
                        title="Enter Fullscreen"
                     >
                         <Maximize2 className="w-4 h-4" />
                     </button>
                     
                     {/* Actions aligned vertically below */}
                     <button onClick={handleSave} className="p-2 bg-black/60 hover:bg-cyan-500/20 backdrop-blur-md text-white rounded-lg border border-white/10 transition-colors">
                         <Download className="w-4 h-4" />
                     </button>
                     
                     <button onClick={() => alert("Link copied!")} className="p-2 bg-black/60 hover:bg-purple-500/20 backdrop-blur-md text-white rounded-lg border border-white/10 transition-colors">
                         <Share2 className="w-4 h-4" />
                     </button>
                </div>
            </div>

            {/* Prompt Text - Independent Below Container */}
            <div className="flex-shrink-0 pt-2 pb-2 px-1">
                 <p className="text-[10px] font-mono text-cyan-400/80 text-center leading-relaxed max-w-[95%] mx-auto line-clamp-2">
                    {prompt}
                 </p>
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
