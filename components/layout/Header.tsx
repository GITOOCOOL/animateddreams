import React from 'react';
import { Sparkles, Terminal, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
    isComfyConnected: boolean;
    isRemote: boolean;
    onToggleDevTools: () => void;
    showLogs: boolean;
    onToggleLogs: () => void;
    onReset: () => void;
    onOpenGallery: () => void;
}

const Header: React.FC<HeaderProps> = ({
    isComfyConnected, isRemote, onToggleDevTools,
    showLogs, onToggleLogs, onReset, onOpenGallery
}) => {
    const { user, logout } = useAuth();

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
                    <h1 className="text-xl font-bold tracking-tight text-white">Animated<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Dreams</span></h1>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                        <div className={`w-1.5 h-1.5 rounded-full ${isComfyConnected ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                        {isComfyConnected ? 'System Online' : 'System Offline'}
                        {isRemote && <span className="text-yellow-500 ml-2">REMOTE</span>}
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
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border border-white/5 hover:border-white/10"
                >
                    Gallery
                </button>
                <button
                    onClick={onToggleLogs}
                    className={`p-2 rounded-lg transition-colors border ${showLogs ? 'bg-purple-900/20 text-purple-400 border-purple-500/30' : 'text-slate-500 hover:text-white border-transparent'}`}
                    title="System Logs"
                >
                    <Terminal className="w-4 h-4" />
                </button>
                <button onClick={onReset} className="p-2 text-slate-600 hover:text-red-400 transition-colors" title="Reset Interface">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
};

export default Header;
