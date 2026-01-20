import React from 'react';
import { AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface FallbackDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  error?: string | null;
}

export const FallbackDialog: React.FC<FallbackDialogProps> = ({ isOpen, onConfirm, onCancel, error }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
        <div className="bg-[#1a1a1c] border border-red-900/50 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-center animate-in zoom-in-95">
            <div className="mx-auto w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center border border-red-500/30">
                <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Analysis Failed</h3>
                <p className="text-sm text-slate-400">
                    The cognitive engine encountered a critical error.
                </p>
                {/* Error Display */}
                {error && (
                    <div className="text-xs font-mono text-center text-red-400 bg-red-950/30 p-2 rounded border border-red-900/50 w-full break-words max-h-24 overflow-y-auto custom-scrollbar">
                        {error}
                    </div>
                )}
                <p className="text-sm text-slate-300 mt-2">
                    Would you like to bypass analysis? You can configure parameters before generation.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2">
                    <RotateCcw className="w-3 h-3" /> Cancel
                </button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2">
                     Bypass Analysis <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    </div>
  );
};
