import React, { useState, useRef, useEffect } from 'react';
import { Download, Share2, Maximize2, RotateCcw, X, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { ImageViewer } from '../media/ImageViewer';

interface ResultViewProps {
  imageUrl: string;
  title: string | null;
  prompt: string;
  onReset: () => void;
  // Optional: If used in a modal (like Gallery), provide close handler
  onClose?: () => void; 
}

export const ResultView: React.FC<ResultViewProps> = ({ imageUrl, title, prompt, onReset, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [internalFullscreen, setInternalFullscreen] = useState(false); // Restore self-managed fullscreen
  const containerRef = useRef<HTMLDivElement>(null);

  // If we are "inline" (not in a modal provided by parent via onClose), allow expanding
  // onClose implies we are already in a modal/overlay
  const isInline = !onClose; 

  // Prevent browser zoom when inside component
  useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      
      const preventDefault = (e: WheelEvent) => {
          e.preventDefault();
      };
      
      container.addEventListener('wheel', preventDefault, { passive: false });
      return () => container.removeEventListener('wheel', preventDefault);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY * -0.002;
    const newScale = Math.min(Math.max(1, scale + delta), 8); 
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };
  
  // ... (drag handlers same)

  // Maximize Logic: If inline, open modal. If already modal, fit fit screen.
  const toggleMaximize = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isInline) {
          setInternalFullscreen(true);
      } else {
          // Already in modal/fullscreen, so this button acts as "Fit" or "Reset Zoom"
          if (scale === 1) setScale(2); // Toggle zoom
          else { setScale(1); setPosition({ x: 0, y: 0 }); }
      }
  };


  // ... Drag handlers (omitted from diff, assumed preserved)
  const startDrag = (e: React.MouseEvent) => {
      if (scale > 1) {
          setIsDragging(true);
          setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
  };
  const onDrag = (e: React.MouseEvent) => {
      if (isDragging && scale > 1) {
          e.preventDefault();
          setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
  };
  const endDrag = () => setIsDragging(false);
  const zoomIn = () => setScale(s => Math.min(s + 0.5, 8));
  const zoomOut = () => setScale(s => Math.max(1, s - 0.5));

  const handleSave = async () => { /* ... existing save logic ... */ };

  return (
    <>
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-[#050505] rounded-lg overflow-hidden border border-white/5 animate-in fade-in zoom-in-95 duration-300">
       {onClose && (
           <button onClick={onClose} className="absolute top-4 left-4 z-50 bg-black/60 hover:bg-red-500/80 text-white p-2 rounded-full backdrop-blur transition-colors"><X className="w-5 h-5" /></button>
       )}

      <div 
        ref={containerRef}
        className={`flex-1 relative overflow-hidden bg-black/50 ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
        onWheel={handleWheel}
        onMouseDown={startDrag}
        onMouseMove={onDrag}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onDoubleClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
        onClick={(e) => {
            // Click to expand if inline and not zoomed
            if (isInline && scale === 1 && !isDragging) {
                setInternalFullscreen(true);
            }
        }}
      >
        <img 
            src={imageUrl} 
            alt="Generated Dream" 
            className="absolute top-0 left-0 w-full h-full object-contain transition-transform duration-75 ease-out origin-center will-change-transform"
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` 
            }}
            draggable={false}
        />
        <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>

        <div className="absolute top-4 right-4 flex flex-col gap-2 z-40 pointer-events-auto shadow-2xl">
             <div className="bg-black/80 backdrop-blur-md rounded-lg p-1.5 flex flex-col gap-1 border border-white/10">
                 <button onClick={(e) => {e.stopPropagation(); zoomIn();}} className="p-2 hover:bg-white/10 rounded-md text-white transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
                 <div className="h-px bg-white/10 w-full"></div>
                 <button onClick={(e) => {e.stopPropagation(); zoomOut();}} className="p-2 hover:bg-white/10 rounded-md text-white transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
                 <div className="h-px bg-white/10 w-full"></div>
                 <button onClick={toggleMaximize} className="p-2 hover:bg-white/10 rounded-md text-white transition-colors" title={isInline ? "Fullscreen" : "Fit"}>
                     <Maximize2 className="w-4 h-4" />
                 </button>
             </div>
             <div className="bg-black/60 backdrop-blur-md rounded-full px-2 py-1 text-center text-white/50 text-[9px] font-mono border border-white/5 mt-1">{Math.round(scale * 100)}%</div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-16 flex items-end justify-between z-30 pointer-events-none">
         <div className="pointer-events-auto max-w-[60%]">
             {title && <h3 className="text-xl font-bold text-white mb-2 shadow-black drop-shadow-lg leading-tight">{title}</h3>}
             <div className="relative group/prompt">
                <p className="text-xs text-slate-300 line-clamp-2 bg-black/40 hover:bg-black/60 p-3 rounded-lg backdrop-blur-md border border-white/5 hover:border-white/10 transition-all cursor-text selection:bg-purple-500/50">{prompt}</p>
             </div>
         </div>
         <div className="flex items-center gap-3 pointer-events-auto">
             <button onClick={handleSave} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all border border-white/10"><Download className="w-5 h-5 text-white" /></button>
             <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all border border-white/10"><Share2 className="w-5 h-5 text-white" /></button>
             {onReset && (
                <button onClick={onReset} className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase shadow-lg flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> New Dream
                </button>
             )}
         </div>
      </div>
    </div>

    {/* Internal Fullscreen Modal */}
    {internalFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200 flex items-center justify-center cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-7xl h-full max-h-[95vh] rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 relative">
                <ResultView 
                    imageUrl={imageUrl} 
                    title={title} 
                    prompt={prompt} 
                    onReset={() => { setInternalFullscreen(false); onReset?.(); }}
                    onClose={() => setInternalFullscreen(false)} 
                />
            </div>
        </div>
    )}
    </>
  );
};
