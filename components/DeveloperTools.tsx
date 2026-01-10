import React, { useState } from 'react';
import { Wrench, Terminal, Play, SkipForward, AlertCircle, CheckCircle, X } from 'lucide-react';
import LogConsole from './LogConsole';

interface DeveloperToolsProps {
    logs: string[];
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
    const [activeTab, setActiveTab] = useState<'controls' | 'logs'>('controls');

    if (!isOpen) return (
        <button
            onClick={onToggle}
            className="fixed bottom-4 right-4 z-50 p-3 bg-slate-900 border border-slate-700 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-lg group"
        >
            <Wrench className="w-5 h-5 group-hover:rotate-90 transition-transform" />
        </button>
    );

    return (
        <div className="fixed bottom-4 right-4 z-50 w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden max-h-[600px] animate-in slide-in-from-bottom-5 fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-black/40">
                <div className="flex items-center gap-2 font-mono text-sm font-bold text-slate-200">
                    <Wrench className="w-4 h-4 text-cyan-500" />
                    DEV_TOOLS
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-800 rounded p-0.5">
                        <button
                            onClick={() => setActiveTab('controls')}
                            className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${activeTab === 'controls' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Controls
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${activeTab === 'logs' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Logs
                        </button>
                    </div>
                    <button onClick={onToggle} className="text-slate-500 hover:text-white">
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
                    <div className="h-64 flex flex-col">
                        <LogConsole logs={logs} isOpen={true} onClose={() => { }} embedded={true} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeveloperTools;
