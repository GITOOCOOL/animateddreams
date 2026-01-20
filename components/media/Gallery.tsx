import React, { useEffect, useState } from 'react';
import { getSavedDreams, SavedDream } from '../../services/storageService';
import { Calendar, AlignLeft, Eye, ImageIcon, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ResultView } from '../panels/ResultView';

interface GalleryProps {
    isOpen: boolean;
    onClose: () => void;
}

const Gallery: React.FC<GalleryProps> = ({ isOpen, onClose }) => {
    const { token } = useAuth();
    const [dreams, setDreams] = useState<SavedDream[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDream, setSelectedDream] = useState<SavedDream | null>(null);

    useEffect(() => {
        if (isOpen && token) {
            loadGallery();
        }
    }, [isOpen, token]);

    const loadGallery = async () => {
        setLoading(true);
        try {
            const data = await getSavedDreams();
            setDreams(data);
        } catch (error) {
            console.error("Failed to load gallery", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-sm overflow-y-auto p-4 md:p-8 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-50 bg-slate-800 hover:bg-slate-700 p-2 rounded-full text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
            
            <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    Memory_Archives
                </h2>
                <span className="text-slate-500 font-mono text-xs">{dreams.length} RECORDS FOUND</span>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dreams.map((dream) => (
                        <div key={dream.id} className="h-64 sm:h-80">
                            {dream.media && dream.media.length > 0 ? (
                                dream.media[0].type === 'image' ? (
                                    <ResultView
                                        imageUrl={dream.media[0].filePath}
                                        title={dream.analysis.title}
                                        prompt={dream.analysis.visualPrompt || dream.rawText}

                                        onReset={() => {}}
                                        // No onClose implies it handles its own internal fullscreen
                                        // But wait, Gallery used to open a big complex modal with details..
                                        // The user said: "when i click ... it should open in a full screen modal where every other picture cards are not visible , and the full screen modal be exactly same like that of the rendered output full screen modal"
                                        // This implies the simplified ResultView modal is what they want, NOT the old complex detail modal.
                                        // So ResultView internal handling is perfect.
                                    />
                                ) : (
                                    <div 
                                        onClick={() => setSelectedDream(dream)}
                                        className="w-full h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden group hover:border-purple-500 transition-all cursor-pointer relative"
                                    >
                                        <video src={dream.media[0].filePath} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-black/50 p-3 rounded-full backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform">
                                                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-700 bg-slate-900 rounded-lg border border-slate-800">
                                    <ImageIcon className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Old Detailed Modal is ONLY for Video now, since Image uses internal Smart Card modal */}
            {selectedDream && selectedDream.media[0]?.type === 'video' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
                    <div className="w-full max-w-7xl h-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 relative">
                        {/* If it's a video, use basic video player for now, else ResultView */}
                        {selectedDream.media[0]?.type === 'video' ? (
                             <div className="relative w-full h-full flex flex-col bg-black">
                                <button
                                    onClick={() => setSelectedDream(null)}
                                    className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-red-500 p-2 rounded-full text-white transition-colors border border-white/10"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <video
                                    src={selectedDream.media[0].filePath}
                                    controls
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black p-6">
                                     <h3 className="text-xl font-bold text-white">{selectedDream.analysis.title}</h3>
                                </div>
                             </div>
                        ) : (
                            <ResultView
                                imageUrl={selectedDream.media[0]?.filePath || ""}
                                title={selectedDream.analysis.title}
                                prompt={selectedDream.analysis.visualPrompt || selectedDream.rawText}
                                onReset={() => {}} // Not needed in gallery
                                onClose={() => setSelectedDream(null)}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
        </div>
    );
};

export default Gallery;
