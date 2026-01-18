import React, { useState } from 'react';
import { Wrench, Terminal, Play, SkipForward, AlertCircle, CheckCircle, X } from 'lucide-react';
import LogConsole from './LogConsole';

interface DeveloperToolsProps {
    logs: {
        system: string[];
        ollama: string[];
        comfy: string[];
    };
    isOpen: boolean;
    onToggle: () => void;
    devSettings: {
        mockAnalysis: boolean;
        mockGeneration: boolean;
    };
    onUpdateSettings: (settings: any) => void;
}

const DeveloperTools: React.FC<DeveloperToolsProps> = ({
    logs,
    isOpen,
    onToggle,
    devSettings,
    onUpdateSettings
}) => {
    const [activeTab, setActiveTab] = useState<'controls' | 'system' | 'ollama' | 'comfy'>('controls');

    // Logs Mapping
    const getLogsForTab = () => {
        switch(activeTab) {
            case 'ollama': return logs.ollama;
            case 'comfy': return logs.comfy;
            default: return logs.system;
        }
    }

    if (!isOpen) return null;

    return (
        <div className="absolute top-full right-0 mt-4 z-50 w-[500px] bg-[#0F0F11] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[600px] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            {/* Notch */}
            <div className="absolute -top-2 right-3 w-4 h-4 bg-[#0F0F11] border-l border-t border-white/10 transform rotate-45"></div>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20 relative z-10">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <Wrench className="w-4 h-4 text-cyan-500" />
                    DEV_TOOLS
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-800 rounded p-0.5">
                        <button
                            onClick={() => setActiveTab('controls')}
                            className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${activeTab === 'controls' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Controls
                        </button>
                        <div className="w-px bg-slate-700 mx-1 my-1"></div>
                        <button
                            onClick={() => setActiveTab('system')}
                            className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${activeTab === 'system' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            System
                        </button>
                        <button
                            onClick={() => setActiveTab('ollama')}
                            className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${activeTab === 'ollama' ? 'bg-orange-900/50 text-orange-200' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Ollama
                        </button>
                        <button
                            onClick={() => setActiveTab('comfy')}
                            className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${activeTab === 'comfy' ? 'bg-purple-900/50 text-purple-200' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Comfy
                        </button>
                    </div>
                    <button onClick={onToggle} className="text-slate-500 hover:text-white ml-2">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'controls' ? (
                    <div className="p-4 space-y-6">
                        {/* Mock Settings */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">Test Configuration</h4>

                            <label className="flex items-center justify-between group cursor-pointer">
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Mock Analysis</span>
                                <input
                                    type="checkbox"
                                    checked={devSettings.mockAnalysis}
                                    onChange={(e) => onUpdateSettings({ ...devSettings, mockAnalysis: e.target.checked })}
                                    className="accent-cyan-500"
                                />
                            </label>
                            <p className="text-[10px] text-slate-500">Skips LLM APIs, returns immediate dummy analysis data.</p>

                            <label className="flex items-center justify-between group cursor-pointer mt-4">
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Mock Generation</span>
                                <input
                                    type="checkbox"
                                    checked={devSettings.mockGeneration}
                                    onChange={(e) => onUpdateSettings({ ...devSettings, mockGeneration: e.target.checked })}
                                    className="accent-purple-500"
                                />
                            </label>
                            <p className="text-[10px] text-slate-500">Skips ComfyUI/Veo, uses placeholder images/timers.</p>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">System State</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <button className="flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 transition-colors">
                                    <SkipForward className="w-3 h-3" /> Force Stop
                                </button>
                                <button className="flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 transition-colors">
                                    <AlertCircle className="w-3 h-3" /> Trigger Error
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-96 flex flex-col">
                        <LogConsole logs={getLogsForTab()} isOpen={true} onClose={() => { }} embedded={true} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeveloperTools;
