import React from 'react';
import { Brain, Cpu, MessageSquare, ChevronDown, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ModelSelectorProps {
    currentModel: 'gemini' | 'ollama' | 'raw' | null;
    onSelect: (model: 'gemini' | 'ollama' | 'raw') => void;
    availability: {
        gemini: boolean;
        ollama: boolean;
        raw: boolean;
    };
    onConfigure?: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ currentModel, onSelect, availability, isChecking = { gemini: false, ollama: false, raw: false }, onConfigure }) => {
    
    // Config for options
    const options = [
        { id: 'gemini', label: 'Gemini 1.5 Pro', icon: Brain },
        { id: 'ollama', label: 'Ollama (Local)', icon: Cpu },
        { id: 'raw', label: 'Raw Input (Fast)', icon: MessageSquare },
    ];

    const selectedOption = options.find(o => o.id === currentModel) || options[0];
    // @ts-ignore
    const isLoading = currentModel ? isChecking[currentModel] : false;
    // @ts-ignore
    const isAvailable = currentModel ? availability[currentModel] : false;

    return (
        <div className="relative group min-w-[200px]">
             <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                    Analysis Engine
                </label>
                {onConfigure && (
                    <button 
                        onClick={onConfigure}
                        className="text-[9px] uppercase font-bold text-purple-400 hover:text-white bg-purple-900/20 hover:bg-purple-900/40 px-2 py-0.5 rounded transition-all"
                    >
                        Config
                    </button>
                )}
            </div>
            
            <div className="relative">
                <select
                    value={currentModel || ''}
                    onChange={(e) => onSelect(e.target.value as any)}
                    className={`
                        w-full appearance-none bg-[#1A1A1D] border rounded-xl py-2.5 pl-9 pr-10 text-xs font-bold text-slate-200 outline-none transition-all cursor-pointer
                        ${isLoading 
                            ? 'border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                            : isAvailable 
                                ? 'border-green-500/30 hover:border-green-500/50' 
                                : 'border-white/10 hover:border-white/30'}
                    `}
                >
                    <option value="" disabled>Select Engine</option>
                    {options.map(opt => (
                        <option key={opt.id} value={opt.id}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                
                {/* Left Icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                     {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                     ) : (
                        <selectedOption.icon className={`w-3.5 h-3.5 ${isAvailable ? 'text-slate-200' : 'text-slate-500'}`} />
                     )}
                </div>

                {/* Right Status Indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
                    {currentModel && !isLoading && (
                        isAvailable ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 opacity-50"></div>
                        )
                    )}
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                </div>
            </div>

            {/* Helper Text */}
             <div className="mt-1.5 flex items-center justify-between px-1">
                 <span className="text-[9px] text-slate-500">
                    {currentModel === 'gemini' && "Cloud Reasoning"}
                    {currentModel === 'ollama' && "Private Local LLM"}
                    {currentModel === 'raw' && "Direct Pass-through"}
                    {!currentModel && "Select engine to initialize"}
                 </span>
                 {currentModel && !isLoading && (
                     <span className={`text-[9px] font-mono font-bold ${isAvailable ? 'text-green-500' : 'text-red-500/70'}`}>
                        {isAvailable ? 'ONLINE' : 'OFFLINE'}
                     </span>
                 )}
            </div>
        </div>
    );
};

export default ModelSelector;
