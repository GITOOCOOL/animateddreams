import React, { useEffect, useRef } from 'react';
import { Terminal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogConsoleProps {
    logs: string[];
    isOpen: boolean;
    onClose: () => void;
    embedded?: boolean;
}

const LogConsole: React.FC<LogConsoleProps> = ({ logs, isOpen, onClose, embedded = false }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isOpen]);

    if (embedded) {
        return (
            <div className="flex-1 overflow-y-auto p-3 space-y-1 text-slate-400 font-mono text-xs h-full bg-black/50 rounded-md border border-slate-800/50">
                {logs.length === 0 && (
                    <div className="text-center italic opacity-50 py-4">System Idle...</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="break-words border-b border-slate-800/30 pb-0.5 mb-0.5 last:border-0">
                        <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        <span className={log.includes('ERROR') ? 'text-red-400' : (log.includes('SUCCESS') ? 'text-green-400' : 'text-slate-300')}>
                            {log}
                        </span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-4 right-4 z-40 w-96 max-h-64 bg-black/90 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col font-mono text-xs"
                >
                    {/* Header */}
                    <div className="bg-slate-800 px-3 py-2 flex items-center justify-between border-b border-slate-700">
                        <div className="flex items-center gap-2 text-slate-300">
                            <Terminal className="w-3 h-3" />
                            <span className="font-bold">SYSTEM_LOGS</span>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Log Content */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 text-slate-400">
                        {logs.length === 0 && (
                            <div className="text-center italic opacity-50 py-4">System Idle...</div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className="break-words">
                                <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                <span className={log.includes('ERROR') ? 'text-red-400' : (log.includes('SUCCESS') ? 'text-green-400' : 'text-slate-300')}>
                                    {log}
                                </span>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LogConsole;
