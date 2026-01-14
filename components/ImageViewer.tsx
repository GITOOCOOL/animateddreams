import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Share2 } from 'lucide-react';

interface ImageViewerProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    title?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ isOpen, onClose, imageUrl, title }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen, imageUrl]);

    if (!isOpen) return null;

    const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
    const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
    const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

    const onPointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        }
    };

    const onPointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handleSave = async () => {
         try {
             // Fetch blob to strictly handle image saving
             const response = await fetch(imageUrl);
             const blob = await response.blob();
             const url = window.URL.createObjectURL(blob);
             
             const a = document.createElement('a');
             a.href = url;
             a.download = `animated_dream_${Date.now()}.png`; // Better filename
             document.body.appendChild(a);
             a.click();
             window.URL.revokeObjectURL(url);
             document.body.removeChild(a);
         } catch(e) {
             console.error("Save failed (fallback to new tab)", e);
             window.open(imageUrl, '_blank');
         }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Dream Generated',
                text: title || 'Check out this AI dreamer visualization!',
                url: imageUrl
            }).catch(e => console.log('Share failed', e));
        } else {
            navigator.clipboard.writeText(imageUrl);
            // Could add toast here
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col">
            {/* Header / Controls */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-50 pointer-events-none">
                 <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full pointer-events-auto flex items-center gap-4 shadow-xl">
                     <button onClick={handleZoomIn} className="text-white hover:text-cyan-400 transition-colors"><ZoomIn className="w-5 h-5"/></button>
                     <div className="w-px h-4 bg-white/20"></div>
                     <button onClick={handleZoomOut} className="text-white hover:text-cyan-400 transition-colors"><ZoomOut className="w-5 h-5"/></button>
                     <div className="w-px h-4 bg-white/20"></div>
                     <button onClick={handleReset} className="text-white hover:text-cyan-400 transition-colors"><RotateCcw className="w-4 h-4"/></button>
                 </div>

                 <button onClick={onClose} className="bg-black/50 backdrop-blur-md border border-white/10 p-3 rounded-full text-white hover:bg-red-500/20 hover:text-red-400 pointer-events-auto transition-all">
                     <X className="w-6 h-6" />
                 </button>
            </div>

            {/* Canvas */}
            <div 
                className="flex-1 overflow-hidden relative cursor-move flex items-center justify-center"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onWheel={(e) => {
                    // Optional wheel zoom
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if(e.deltaY < 0) handleZoomIn(); else handleZoomOut();
                    }
                }}
            >
                <div 
                    style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.1, 0.7, 1.0, 0.1)'
                    }}
                    className="will-change-transform shadow-2xl shadow-black/80"
                >
                    <img 
                      src={imageUrl} 
                      alt="Full View" 
                      className="max-h-[85vh] max-w-[90vw] object-contain pointer-events-none select-none" 
                      draggable={false}
                    />
                </div>
            </div>

            {/* Footer Actions */}
             <div className="absolute bottom-8 right-8 flex flex-col gap-4 pointer-events-auto z-50">
                 <button onClick={handleSave} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold p-4 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.4)] transition-all hover:scale-110 hover:-translate-y-1" title="Save to Device">
                    <Download className="w-6 h-6" />
                 </button>
                 <button onClick={handleShare} className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-full border border-slate-600 shadow-xl transition-all hover:scale-110 hover:-translate-y-1" title="Share">
                    <Share2 className="w-6 h-6" />
                 </button>
             </div>
        </div>
    );
};
