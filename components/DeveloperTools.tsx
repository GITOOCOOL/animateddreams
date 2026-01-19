import React, { useState } from 'react';
import { Wrench, Terminal, Play, SkipForward, AlertCircle, CheckCircle, X, Server, Database, Cloud, Cpu, Monitor, Network, ArrowRight } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'controls' | 'system' | 'ollama' | 'comfy' | 'arch'>('controls');

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
                            onClick={() => setActiveTab('arch')}
                            className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${activeTab === 'arch' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Arch
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
                ) : activeTab === 'arch' ? (
                    <div className="p-6 h-full overflow-y-auto">
                        <div className="flex flex-col gap-8">
                            {/* Client Layer */}
                            <div className="relative p-4 border border-slate-800 bg-slate-900/50 rounded-xl">
                                <span className="absolute -top-3 left-4 px-2 bg-[#0F0F11] text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Client Layer
                                </span>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <Monitor className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-200">React Frontend</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">Vite: 5173</span>
                                            <span className="text-[10px] text-slate-500">LocalHost</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Connection */}
                            <div className="flex justify-center -my-4 relative z-10 opacity-50">
                                <div className="bg-slate-800 p-1 rounded-full border border-slate-700">
                                    <ArrowRight className="w-4 h-4 text-slate-400 rotate-90" />
                                </div>
                            </div>

                            {/* Server Layer */}
                            <div className="relative p-4 border border-slate-800 bg-slate-900/50 rounded-xl">
                                <span className="absolute -top-3 left-4 px-2 bg-[#0F0F11] text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Server Layer
                                </span>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                        <Server className="w-6 h-6 text-green-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-slate-200">Express API</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-green-900/30 text-green-300 px-1.5 py-0.5 rounded border border-green-500/20">Port: 3001</span>
                                            <span className="text-[10px] text-slate-500">Node.js</span>
                                        </div>
                                    </div>
                                    
                                    {/* DB */}
                                    <div className="flex flex-col items-center gap-1">
                                         <Database className="w-4 h-4 text-slate-500" />
                                         <span className="text-[9px] text-slate-500 font-mono">SQLite</span>
                                    </div>
                                </div>
                            </div>

                             {/* Connection */}
                            <div className="flex justify-center -my-4 relative z-10 opacity-50">
                                <div className="bg-slate-800 p-1 rounded-full border border-slate-700">
                                    <ArrowRight className="w-4 h-4 text-slate-400 rotate-90" />
                                </div>
                            </div>

                            {/* AI Services Layer */}
                            <div className="relative p-4 border border-dashed border-slate-700 bg-slate-900/20 rounded-xl space-y-3">
                                <span className="absolute -top-3 left-4 px-2 bg-[#0F0F11] text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    AI Services
                                </span>
                                
                                {/* ComfyUI */}
                                <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <Cpu className="w-4 h-4 text-purple-400" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-300">ComfyUI</span>
                                            <span className="text-[9px] text-purple-400 font-mono">Image Gen</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ollama */}
                                <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <Terminal className="w-4 h-4 text-orange-400" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-300">Ollama</span>
                                            <span className="text-[9px] text-orange-400 font-mono">Local LLM</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Cloud */}
                                <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <Cloud className="w-4 h-4 text-cyan-400" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-300">Gemini</span>
                                            <span className="text-[9px] text-cyan-400 font-mono">Cloud LLM</span>
                                        </div>
                                    </div>
                                </div>
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
