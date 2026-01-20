import React from 'react';
import { X } from 'lucide-react';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
    isOpen, onClose, title, children
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-[#0F0F11] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col">
                 
                 <div className="flex items-center justify-between p-6 pb-2 border-b border-white/5 bg-black/20 shrink-0">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-white">{title}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                     {children}
                 </div>
             </div>
        </div>
    );
};

export default SettingsDialog;
