import React, { useEffect, useState } from 'react';
import { getSavedDreams, SavedDream } from '../services/storageService';
import { Calendar, AlignLeft, Eye, ImageIcon, X } from 'lucide-react';

const Gallery = () => {
    const [dreams, setDreams] = useState<SavedDream[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDream, setSelectedDream] = useState<SavedDream | null>(null);

    useEffect(() => {
        loadGallery();
    }, []);

    const loadGallery = async () => {
        setLoading(true);
        const data = await getSavedDreams();
        setDreams(data);
        setLoading(false);
    };

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="w-full">
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
                        <div
                            key={dream.id}
                            onClick={() => setSelectedDream(dream)}
                            className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden group hover:border-purple-500 transition-all cursor-pointer relative"
                        >
                            {/* Image Thumbnail */}
                            <div className="aspect-square bg-black relative overflow-hidden">
                                {dream.media && dream.media.length > 0 ? (
                                    dream.media[0].type === 'image' ? (
                                        <img
                                            src={dream.media[0].filePath}
                                            alt={dream.analysis.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <video src={dream.media[0].filePath} className="w-full h-full object-cover" />
                                    )
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-700">
                                        <ImageIcon className="w-12 h-12" />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                    <p className="text-white font-bold truncate">{dream.analysis.title}</p>
                                    <p className="text-purple-300 text-xs truncate">{dream.analysis.summary}</p>
                                </div>
                            </div>

                            {/* Mini Footer */}
                            <div className="p-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500 font-mono">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(dream.createdAt).toLocaleDateString()}
                                </span>
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                                    {dream.media[0]?.type === 'image' ? 'IMG' : 'VID'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedDream && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[90vh] rounded-xl flex flex-col md:flex-row overflow-hidden relative animate-in fade-in zoom-in duration-200">

                        <button
                            onClick={() => setSelectedDream(null)}
                            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-red-500 p-2 rounded-full text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Left: Image */}
                        <div className="w-full md:w-1/2 bg-black flex items-center justify-center p-4">
                            {selectedDream.media[0]?.type === 'image' ? (
                                <img
                                    src={selectedDream.media[0].filePath}
                                    className="max-w-full max-h-full object-contain shadow-2xl"
                                />
                            ) : (
                                <video
                                    src={selectedDream.media[0].filePath}
                                    controls
                                    className="max-w-full max-h-full"
                                />
                            )}
                        </div>

                        {/* Right: Data */}
                        <div className="w-full md:w-1/2 p-8 overflow-y-auto custom-scrollbar">
                            <h2 className="text-3xl font-black text-white mb-2">{selectedDream.analysis.title}</h2>
                            <p className="text-slate-400 mb-8 border-l-2 border-purple-500 pl-4 italic">
                                {selectedDream.analysis.summary}
                            </p>

                            <div className="space-y-6">

                                {/* Original Interpretation */}
                                <div className="bg-black/30 p-4 rounded-lg border border-slate-800">
                                    <h4 className="text-purple-400 font-bold mb-2 text-sm uppercase flex items-center gap-2">
                                        <Eye className="w-4 h-4" /> Psychological Interpretation
                                    </h4>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        {selectedDream.analysis.interpretation}
                                    </p>
                                </div>

                                {/* Metadata Comparison */}
                                <div className="grid grid-cols-1 gap-4">
                                    {/* Original User Input */}
                                    <div className="bg-slate-800/50 p-4 rounded-lg">
                                        <h4 className="text-cyan-400 font-bold mb-2 text-xs uppercase font-mono flex items-center gap-2">
                                            <AlignLeft className="w-3 h-3" /> Original Input
                                        </h4>
                                        <p className="text-slate-300 text-xs font-mono break-words">
                                            "{selectedDream.rawText}"
                                        </p>
                                    </div>

                                    {/* AI Visual Prompt */}
                                    <div className="bg-slate-800/50 p-4 rounded-lg">
                                        <h4 className="text-pink-400 font-bold mb-2 text-xs uppercase font-mono flex items-center gap-2">
                                            <ImageIcon className="w-3 h-3" /> AI Visual Prompt
                                        </h4>
                                        <p className="text-slate-400 text-xs font-mono break-words border-l border-pink-500/30 pl-2">
                                            {selectedDream.visualPrompt}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-800">
                                    <p className="text-slate-600 text-xs font-mono">
                                        ID: {selectedDream.id}<br />
                                        CREATED: {formatDate(selectedDream.createdAt)}
                                    </p>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default Gallery;
