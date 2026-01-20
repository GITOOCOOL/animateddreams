import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ComfySettings } from '../../types';
import { Play, X, AlertTriangle, Layers, Activity, Zap, Image as ImageIcon } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  workflowType: 'Text-to-Image' | 'Image-to-Image';
  settings: ComfySettings;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  workflowType, 
  settings 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Confirm Generation
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-black/40 rounded p-4 border border-slate-800">
            <div className="text-xs uppercase font-mono text-slate-500 mb-2">Active Workflow</div>
            <div className={`text-lg font-bold ${workflowType === 'Image-to-Image' ? 'text-pink-500' : 'text-cyan-500'}`}>
              {workflowType}
            </div>
          </div>

          <div className="space-y-3">
             <div className="text-xs uppercase font-mono text-slate-500 border-b border-slate-800 pb-1">Parameter Summary</div>
             
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                   <span className="text-slate-400 block text-xs flex items-center gap-1"><Layers className="w-3 h-3"/> Model</span>
                   <span className="text-white font-mono text-xs truncate block" title={settings.model}>{settings.model}</span>
                </div>
                <div>
                   <span className="text-slate-400 block text-xs flex items-center gap-1"><Activity className="w-3 h-3"/> Steps</span>
                   <span className="text-white font-mono">{settings.steps}</span>
                </div>
                <div>
                   <span className="text-slate-400 block text-xs flex items-center gap-1"><Zap className="w-3 h-3"/> CFG Scale</span>
                   <span className="text-white font-mono">{settings.cfg}</span>
                </div>
                {workflowType === 'Image-to-Image' && (
                  <div>
                    <span className="text-slate-400 block text-xs flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Denoise</span>
                    <span className="text-white font-mono">{settings.denoise}</span>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
           <button 
             onClick={onCancel}
             className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
           >
             Cancel
           </button>
           <button 
             onClick={onConfirm}
             className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white font-bold rounded flex items-center gap-2 shadow-lg shadow-green-900/20"
           >
             <Play className="w-4 h-4" />
             Launch Render
           </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmDialog;
