import React from 'react';
import { Settings, Mic, Square, Loader2, ChevronDown } from 'lucide-react';

interface DictationControlProps {
    connections: {
        transcriptionProvider: string;
        transcriptionKey: string;
        [key: string]: any;
    };
    updateConnection: (key: string, value: any) => void;
    localTranscriber: {
        isModelLoading: boolean;
        progress: number;
    };
    isRecording: boolean;
    isTranscribing: boolean;
    onRecordToggle: () => void;
    onOpenSettings: () => void;
}

export const DictationControl: React.FC<DictationControlProps> = ({
    connections,
    updateConnection,
    localTranscriber,
    isRecording,
    isTranscribing,
    onRecordToggle,
    onOpenSettings
}) => {
    return (
        <div className="absolute bottom-2 right-2 lg:bottom-4 lg:right-4 flex flex-row items-center gap-2 lg:gap-2 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl p-2 lg:p-1.5 shadow-xl z-20 max-w-[calc(100%-1rem)]">
            
            {/* Status + Selector Group */}
            <div className="flex items-center gap-2">
                 {/* Status Dot */}
                <div 
                    className={`w-4 h-4 lg:w-2 lg:h-2 rounded-full flex-shrink-0
                        ${connections.transcriptionProvider === 'local' 
                            ? (localTranscriber.isModelLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]')
                            : (connections.transcriptionKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]')
                        }
                    `}
                    title={
                        connections.transcriptionProvider === 'local' 
                            ? (localTranscriber.isModelLoading ? 'Model Downloading...' : 'Local Model Ready')
                            : (connections.transcriptionKey ? 'API Key Set' : 'Missing API Key')
                    }
                />

                {/* Provider Selector */}
                <div className="relative group flex-shrink-0 min-w-0">
                    <select
                        value={connections.transcriptionProvider}
                        onChange={(e) => updateConnection('transcriptionProvider', e.target.value)}
                        className="appearance-none bg-transparent text-[10px] lg:text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white focus:outline-none pr-3 lg:pr-4 cursor-pointer text-left w-full max-w-[80px] lg:max-w-none truncate"
                    >
                        <option value="local" className="bg-slate-900 text-slate-300">WebGPU</option>
                        <option value="custom" className="bg-slate-900 text-slate-300">Custom</option>
                        <option value="groq" className="bg-slate-900 text-slate-300">Groq</option>
                        <option value="openai" className="bg-slate-900 text-slate-300">OpenAI</option>
                    </select>
                    <ChevronDown className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-white" />
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
                    disabled={isTranscribing || (connections.transcriptionProvider !== 'local' && !connections.transcriptionKey)}
                    className={`flex items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-3 lg:py-1.5 rounded-lg text-[10px] lg:text-[10px] font-bold uppercase tracking-wider transition-all flex-shrink-0 w-auto
                        ${isRecording 
                            ? 'text-red-500 shadow-none lg:bg-red-500 lg:text-white lg:shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' 
                            : 'bg-white/10 text-slate-300 hover:text-white lg:bg-white/10'}
                        ${isTranscribing || (connections.transcriptionProvider !== 'local' && !connections.transcriptionKey) ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {isTranscribing ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 lg:w-3 lg:h-3 animate-spin" />
                            {localTranscriber.isModelLoading && (
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
                            ? (localTranscriber.isModelLoading ? 'Loading' : 'Processing') 
                            : (isRecording ? 'Stop' : 'Dictate')}
                    </span>
                </button>
            </div>
        </div>
    );
};
