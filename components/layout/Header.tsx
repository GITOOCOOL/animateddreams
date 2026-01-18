import React from 'react'; 
import { Sparkles, Terminal, LogOut, RefreshCw, Wrench, Settings, Image, Box } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DeveloperTools from '../DeveloperTools';
import { useConnections } from '../../contexts/ConnectionContext';

interface HeaderProps {
    isComfyConnected: boolean;
    isRemote: boolean;
    onToggleDevTools: () => void;
    onReset: () => void;
    onOpenGallery: () => void;
    showDevTools: boolean;
    logs: string[];
    devSettings: {
        mockAnalysis: boolean;
        mockGeneration: boolean;
    };
    onUpdateSettings: (settings: any) => void;
    onOpenSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({
    isComfyConnected, isRemote, onToggleDevTools,
    onReset, onOpenGallery, showDevTools, logs, devSettings, onUpdateSettings, onOpenSettings
}) => {
    const { user, logout } = useAuth();
    const { connections } = useConnections();
    const isRunPod = !!connections.runpodServerId;

    return (
        <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className="relative group cursor-pointer" onClick={onToggleDevTools}>
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative bg-black border border-white/10 p-2 rounded-lg">
                        <Sparkles className="w-6 h-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400" />
                    </div>
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white mb-1">Animated<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Dreams</span></h1>
                    <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                         {isRunPod ? (
                            <span className="flex items-center gap-1 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded bg-cyan-500/5">
                                <Box className="w-3 h-3" /> RUNPOD
                            </span>
                        ) : isComfyConnected ? (
                            <span className="flex items-center gap-1 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded bg-purple-500/5">
                                <Wrench className="w-3 h-3" /> LOCAL
                            </span>
                        ) : (
                             <span className="flex items-center gap-1 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded bg-red-500/5">
                                <LogOut className="w-3 h-3" /> OFFLINE
                            </span>
                        )}
                        {isRemote && !isRunPod && <span className="text-yellow-500 border border-yellow-500/20 px-1 rounded bg-yellow-500/5">REMOTE UI</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {user && (
                    <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-xs font-bold text-slate-300">{user.username}</span>
                        <button onClick={logout} className="ml-2 text-slate-500 hover:text-red-400">
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                <button
                    onClick={onOpenGallery}
                    className="p-2 text-slate-500 hover:text-cyan-400 transition-colors bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
                    title="Open Gallery"
                >
                    <Image className="w-4 h-4" />
                </button>
                <div className="relative">
                    <button
                        onClick={onToggleDevTools}
                        className={`p-2 transition-colors ${showDevTools ? 'text-cyan-400 bg-cyan-900/20 rounded' : 'text-slate-500 hover:text-cyan-400'}`}
                        title="Developer Tools"
                    >
                        <Wrench className="w-4 h-4" />
                    </button>
                    <DeveloperTools 
                        isOpen={showDevTools} 
                        onToggle={onToggleDevTools}
                        logs={logs}
                        devSettings={devSettings}
                        onUpdateSettings={onUpdateSettings}
                    />
                </div>
                <button onClick={onReset} className="p-2 text-slate-600 hover:text-red-400 transition-colors" title="Reset Interface">
                    <RefreshCw className="w-4 h-4" />
                </button>
                    
                <div className="h-6 w-px bg-white/10 mx-1"></div>

                <button 
                    onClick={onOpenSettings}
                    className="p-2 text-slate-400 hover:text-cyan-400 transition-colors bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 rounded-lg hover:border-cyan-500/50 shadow-sm hover:shadow-cyan-500/10"
                    title="System Settings"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
};

export default Header;
