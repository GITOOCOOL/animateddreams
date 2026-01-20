import React from 'react';
import { Settings, Mic, Square, Loader2 } from 'lucide-react';
import EngineSelector from './EngineSelector';

interface DictationControlProps {
    localTranscriber: {
        isModelLoading: boolean;
        progress: number;
    };
    isRecording: boolean;
    isTranscribing: boolean;
    onRecordToggle: () => void;
    onOpenSettings: () => void;
    
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

export const DictationControl: React.FC<DictationControlProps> = ({
    localTranscriber,
    isRecording,
    isTranscribing,
    onRecordToggle,
    onOpenSettings,
    availableEngines = [],
    selectedEngineId,
    onSelectEngine
}) => {
    return (
        <div className="absolute bottom-2 right-2 lg:bottom-4 lg:right-4 flex flex-row items-center gap-2 lg:gap-2 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl p-2 lg:p-1.5 shadow-xl z-20 max-w-[calc(100%-1rem)]">
            
            {/* Status + Selector Group */}
            <div className="flex items-center gap-2">
                 {/* Provider Selector */}
                <div className="relative group flex-shrink-0 min-w-0">
                    {availableEngines.length > 0 && onSelectEngine ? (
                        <div className="scale-90 origin-left">
                            <EngineSelector
                                engines={availableEngines}
                                selectedEngineId={selectedEngineId || null}
                                onSelectEngine={onSelectEngine}
                                moduleType="dictation"
                            />
                        </div>
                    ) : (
                        <span className="text-[10px] text-red-500 font-mono px-2">Offline</span>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="w-px h-3 lg:h-4 bg-white/10 mx-1"></div>

            {/* Config + Dictate Group */}
            <div className="flex items-center gap-2">
                 {/* Settings Shortcut */}
                <button 
                    onClick={onOpenSettings}
                    className="p-2 lg:p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 bg-transparent lg:bg-white/5"
                    title="Configure Voice Settings"
                >
                    <Settings className="w-4 h-4 lg:w-3 lg:h-3" />
                </button>

                {/* Dictate Button */}
                <button
                    onClick={onRecordToggle}
                    disabled={isTranscribing}
                    className={`flex items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-3 lg:py-1.5 rounded-lg text-[10px] lg:text-[10px] font-bold uppercase tracking-wider transition-all flex-shrink-0 w-auto
                        ${isRecording 
                            ? 'text-red-500 shadow-none lg:bg-red-500 lg:text-white lg:shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' 
                            : 'bg-white/10 text-slate-300 hover:text-white lg:bg-white/10'}
                        ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {isTranscribing ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 lg:w-3 lg:h-3 animate-spin" />
                            {localTranscriber?.isModelLoading && (
                                <span className="text-[9px] opacity-75 hidden lg:inline">{Math.round(localTranscriber.progress)}%</span>
                            )}
                        </div>
                    ) : isRecording ? (
                        <Square className="w-4 h-4 lg:w-3 lg:h-3 fill-current" />
                    ) : (
                        <Mic className="w-4 h-4 lg:w-3 lg:h-3" />
                    )}
                    <span className="inline">
                        {isTranscribing 
                            ? (localTranscriber?.isModelLoading ? 'Loading' : 'Processing') 
                            : (isRecording ? 'Stop' : 'Dictate')}
                    </span>
                </button>
            </div>
        </div>
    );
};
