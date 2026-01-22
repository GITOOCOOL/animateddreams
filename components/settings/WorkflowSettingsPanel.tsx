import React, { useState } from 'react';
import { WorkflowPreset } from '../../types';
import { FileJson, Upload, ChevronRight, Check } from 'lucide-react';

interface WorkflowSettingsPanelProps {
    presets: WorkflowPreset[];
    activePresetId: string;
    onSelectPreset: (id: string) => void;
    onImport: (json: any, name: string) => void;
}

const WorkflowSettingsPanel: React.FC<WorkflowSettingsPanelProps> = ({ presets, activePresetId, onSelectPreset, onImport }) => {
    const [isImporting, setIsImporting] = useState(false);
    const [importText, setImportText] = useState('');

    const handleImport = () => {
        try {
            const json = JSON.parse(importText);
            onImport(json, 'Custom Workflow ' + (presets.length + 1));
            setIsImporting(false);
            setImportText('');
        } catch (e) {
            alert('Invalid JSON');
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full text-main">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-subtle pb-4">
                <div>
                     <h3 className="text-xl font-bold text-main">Workflow Engine</h3>
                     <p className="text-sm text-dim">Manage pipeline presets and custom graphs.</p>
                </div>
            </div>

            {/* Presets List */}
            <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[300px]">
                {presets.map(preset => (
                    <div 
                        key={preset.id}
                        onClick={() => onSelectPreset(preset.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                            activePresetId === preset.id 
                            ? 'bg-purple-900/20 border-purple-500' 
                            : 'bg-slate-800/20 border-subtle hover:bg-slate-800/50'
                        }`}
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold ${activePresetId === preset.id ? 'text-purple-400' : 'text-main'}`}>
                                    {preset.name}
                                </span>
                                {preset.id.startsWith('standard') && <span className="text-[10px] bg-slate-700 px-1 rounded">DEFAULT</span>}
                            </div>
                            <p className="text-xs text-dim mt-1">{preset.description}</p>
                        </div>
                        {activePresetId === preset.id && <Check className="w-5 h-5 text-purple-400" />}
                    </div>
                ))}
            </div>

            {/* Import Section */}
            <div className="mt-4 pt-4 border-t border-subtle">
                <button 
                    onClick={() => setIsImporting(!isImporting)}
                    className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                    <Upload className="w-4 h-4" /> Import Custom Workflow (JSON)
                </button>
                
                {isImporting && (
                    <div className="mt-4 flex flex-col gap-2">
                        <textarea 
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                            placeholder="Paste ComfyUI API Format JSON here..."
                            className="w-full h-48 bg-black/50 border border-subtle rounded-lg p-3 font-mono text-xs text-slate-400 focus:outline-none focus:border-cyan-500/50"
                        />
                        <button 
                            onClick={handleImport}
                            className="bg-cyan-900/50 hover:bg-cyan-900 text-cyan-200 py-2 rounded-lg text-xs font-bold transition-colors border border-cyan-500/20"
                        >
                            Load Workflow
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkflowSettingsPanel;
