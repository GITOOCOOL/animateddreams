import React from 'react';
import { Settings, Sliders, Activity, Zap, Layers, Image as ImageIcon, Box, X } from 'lucide-react';
import { ComfySettings, DreamAttachment, WorkflowPreset } from '../../types';
import WorkflowVisualizer from '../visualizers/WorkflowVisualizer';
import WorkflowSettingsPanel from '../settings/WorkflowSettingsPanel';
import SystemSettingsPanel from '../settings/SystemSettingsPanel';

interface SettingsPanelProps {
  settings: ComfySettings;
  onSettingsChange: (newSettings: ComfySettings) => void;
  onDone: () => void;
  availableModels: string[];
  availableLoras: string[];
  availableIPAdapters?: string[];
  availableNodeTypes?: string[]; // Discovery
  inputImage?: DreamAttachment;
  
  // Workflow Props
  workflowPresets?: WorkflowPreset[];
  activePresetId?: string;
  onSelectPreset?: (id: string) => void;
  onImportWorkflow?: (json: any, name: string) => void;
  initialTab?: 'gen' | 'workflow' | 'system';
}

const DEFAULT_MODELS = [
  'dreamshaper_8.safetensors',
  'juggernautXL_ragnarokBy.safetensors',
  'bigLust_v16.safetensors',
  'juggernaut_reborn.safetensors',
  'sd_xl_base_1.0.safetensors',
];

const SAMPLERS = [
  'dpmpp_2m',
  'dpmpp_sde',
  'euler',
  'euler_ancestral',
  'heun',
  'lms',
];

const SCHEDULERS = [
  'karras',
  'normal',
  'simple',
  'sgm_uniform',
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
    settings, onSettingsChange, onDone, availableModels, availableLoras, 
    availableIPAdapters, availableNodeTypes, inputImage,
    workflowPresets, activePresetId, onSelectPreset, onImportWorkflow,
    initialTab = 'gen'
}) => {
  const [activeTab, setActiveTab] = React.useState<'gen' | 'workflow' | 'system'>(initialTab);
  const [showValidation, setShowValidation] = React.useState(false);

  const handleChange = (key: keyof ComfySettings, value: string | number | boolean) => {
    const newSettings = { ...settings, [key]: value };

    // Auto-sync dimensions if "Use Original Size" is enabled
    if (key === 'useOriginalDimensions' && value === true && inputImage?.width && inputImage?.height) {
        newSettings.width = inputImage.width;
        newSettings.height = inputImage.height;
    }

    onSettingsChange(newSettings);

    // Clear validation if model is selected
    if (key === 'model' && value) setShowValidation(false);
  };

  const modelOptions = (availableModels && availableModels.length > 0) ? availableModels : DEFAULT_MODELS;
  
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col pr-2">
        
        {/* Helper Navigation */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 shrink-0">
             <button 
                onClick={() => setActiveTab('gen')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'gen' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
             >
                 <Sliders className="w-3 h-3" /> Generator
             </button>
             <button 
                onClick={() => setActiveTab('workflow')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'workflow' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
             >
                 <Layers className="w-3 h-3" /> Workflow
             </button>
             <button 
                onClick={() => setActiveTab('system')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'system' ? 'bg-slate-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
             >
                 <Settings className="w-3 h-3" /> System
             </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            
            {activeTab === 'system' && <SystemSettingsPanel />}

            {activeTab === 'workflow' && (
                workflowPresets && activePresetId && onSelectPreset && onImportWorkflow ? (
                    <WorkflowSettingsPanel 
                        presets={workflowPresets}
                        activePresetId={activePresetId}
                        onSelectPreset={onSelectPreset}
                        onImport={onImportWorkflow}
                    />
                ) : (
                    <div className="text-center p-10 text-slate-500">
                        Workflow Engine initialization failed.
                    </div>
                )
            )}

            {activeTab === 'gen' && (
            <div className="space-y-8 contents">
            
            {/* Model & Architecture */}
            <div className="space-y-4">
                <h4 className={`text-xs font-bold uppercase tracking-wider border-b pb-2 transition-colors ${showValidation && !settings.model ? 'text-red-500 border-red-500/50' : 'text-slate-500 border-white/5'}`}>
                    Base Architecture {showValidation && !settings.model && "(Required)"}
                </h4>
                
                <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold flex items-center gap-2 ${showValidation && !settings.model ? 'text-red-500' : 'text-cyan-500'}`}>
                        <Layers className="w-3 h-3" /> Checkpoint Model
                    </label>
                    <select
                        value={settings.model}
                        onChange={(e) => handleChange('model', e.target.value)}
                        className={`w-full bg-black/50 border rounded-lg p-3 text-xs outline-none transition-all hover:bg-black/70 
                            ${showValidation && !settings.model 
                                ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                                : !settings.model 
                                    ? 'border-yellow-500/50 text-yellow-500' 
                                    : 'border-white/10 text-slate-300 focus:border-cyan-500'
                            }`}
                    >
                        <option value="" disabled>Select Model</option>
                        {modelOptions.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-yellow-500 flex items-center gap-2">
                            <Zap className="w-3 h-3" /> LoRA Adapters
                        </label>
                        <button
                            onClick={() => {
                                const newLoras = [...(settings.loras || [])];
                                newLoras.push({ name: availableLoras[0] || "None", strength: 1.0 });
                                onSettingsChange({ ...settings, loras: newLoras });
                            }}
                            disabled={!availableLoras || availableLoras.length === 0}
                            className="text-[9px] bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            + ADD LORA
                        </button>
                    </div>

                    <div className="space-y-3">
                        {(!settings.loras || settings.loras.length === 0) && (
                            <div className="text-[10px] text-slate-600 italic text-center py-2 border border-dashed border-white/5 rounded-lg">
                                No LoRAs active. Add one to mix styles.
                            </div>
                        )}

                        {settings.loras?.map((lora, index) => (
                            <div key={index} className="bg-white/5 p-3 rounded-lg border border-white/5 hover:border-yellow-500/30 transition-colors animate-in slide-in-from-left-2 fade-in">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-bold text-slate-400">LAYER {index + 1}</span>
                                    <button 
                                        onClick={() => {
                                            const newLoras = settings.loras!.filter((_, i) => i !== index);
                                            onSettingsChange({ ...settings, loras: newLoras });
                                        }}
                                        className="text-slate-600 hover:text-red-500 transition-colors"
                                    >
                                        <div className="w-4 h-4 flex items-center justify-center">×</div>
                                    </button>
                                </div>
                                
                                <select
                                    value={lora.name}
                                    onChange={(e) => {
                                        const newLoras = [...settings.loras!];
                                        newLoras[index].name = e.target.value;
                                        onSettingsChange({ ...settings, loras: newLoras });
                                    }}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-yellow-500 mb-2"
                                >
                                    {availableLoras && availableLoras.length > 0 ? (
                                        availableLoras.map(l => <option key={l} value={l}>{l}</option>)
                                    ) : (
                                        <option disabled>No LoRAs Found</option>
                                    )}
                                </select>

                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-yellow-500 w-8 text-right font-mono">{lora.strength.toFixed(1)}</span>
                                    <input
                                        type="range" min="0.1" max="2.0" step="0.1"
                                        value={lora.strength}
                                        onChange={(e) => {
                                            const newLoras = [...settings.loras!];
                                            newLoras[index].strength = parseFloat(e.target.value);
                                            onSettingsChange({ ...settings, loras: newLoras });
                                        }}
                                        className="flex-1 accent-yellow-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Generation Params */}
            <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2">Generation Parameters</h4>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-cyan-500 flex justify-between">
                             <span>Steps</span> <span className="text-white">{settings.steps}</span>
                        </label>
                        <input
                            type="range" min="10" max="100" step="1"
                            value={settings.steps}
                            onChange={(e) => handleChange('steps', parseInt(e.target.value))}
                            className="w-full accent-cyan-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-purple-500 flex justify-between">
                             <span>CFG Scale</span> <span className="text-white">{settings.cfg}</span>
                        </label>
                        <input
                            type="range" min="1" max="20" step="0.5"
                            value={settings.cfg}
                            onChange={(e) => handleChange('cfg', parseFloat(e.target.value))}
                            className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Sampler</label>
                        <select
                            value={settings.sampler}
                            onChange={(e) => handleChange('sampler', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-purple-500"
                        >
                            {SAMPLERS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Scheduler</label>
                         <select
                            value={settings.scheduler}
                            onChange={(e) => handleChange('scheduler', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-purple-500"
                        >
                            {SCHEDULERS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                     </div>
                </div>

                {/* Denoise */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-[10px] uppercase font-bold text-pink-500 flex justify-between">
                         <span>Denoise (Img2Img)</span> <span className="text-white">{settings.denoise}</span>
                    </label>
                    <input
                        type="range" min="0.0" max="1.0" step="0.05"
                        value={settings.denoise !== undefined ? settings.denoise : 0.75}
                        onChange={(e) => handleChange('denoise', parseFloat(e.target.value))}
                        className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                </div>

                {/* Face Match (IP-Adapter) Toggle */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-2">
                            <span>Face Identity Match</span>
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-[8px] text-cyan-400 border border-cyan-400/30">PRO</span>
                        </label>
                        <button
                            onClick={() => handleChange('useIpAdapter', !settings.useIpAdapter)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${settings.useIpAdapter ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transform transition-transform duration-300 ${settings.useIpAdapter ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <p className="text-[9px] text-slate-500">
                        Uses IP-Adapter to strictly preserve face identity. 
                    </p>
                    
                    {settings.useIpAdapter && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                             <label className="text-[10px] uppercase font-bold text-cyan-500 flex items-center gap-2 mb-1">
                                IP Adapter Model
                            </label>
                            <select
                                value={settings.ipAdapterModel || ""}
                                onChange={(e) => handleChange('ipAdapterModel', e.target.value)}
                                className="w-full bg-cyan-950/30 border border-cyan-500/30 rounded-lg p-2 text-xs text-cyan-100 outline-none focus:border-cyan-400 mb-3"
                            >
                                <option value="" disabled>Select Adapter (Optional)</option>
                                <option value="">Auto-Detect (Based on Preset)</option>
                                {availableIPAdapters && availableIPAdapters.length > 0 ? (
                                    availableIPAdapters.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))
                                ) : (
                                    <option disabled>No Adapters Found</option>
                                )}
                            </select>

                            {/* Preset Selector */}
                            {(!settings.ipAdapterModel) && (() => {
                                   const isSdxl = settings.model?.toLowerCase().includes("sdxl") || settings.model?.toLowerCase().includes("ragnarok");
                                   const isPresetMismatch = isSdxl && (settings.ipAdapterPreset?.includes("STANDARD") || settings.ipAdapterPreset?.includes("LIGHT"));
                                   
                                   const PRESETS = [
                                       "STANDARD / SDXL (ViT-H)",
                                       "SD1.5 ONLY (ViT-G / Plus)",
                                       "PLUS (high strength)",
                                       "PLUS FACE (portraits)",
                                       "LIGHT - SD1.5 only (low strength)",
                                       "FULL FACE - SD1.5 only (portraits stronger)"
                                   ];


                                   return (
                                       <div className="space-y-1 mb-3 animate-in fade-in slide-in-from-top-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] uppercase font-bold text-cyan-500">Adapter Preset</label>
                                                {isPresetMismatch && (
                                                    <div className="flex items-center gap-1 text-[9px] text-red-500 font-bold bg-red-950/50 px-2 py-0.5 rounded border border-red-500/30 animate-pulse">
                                                        <Activity className="w-3 h-3" /> SDXL Conflict
                                                    </div>
                                                )}
                                            </div>
                                            <select
                                                value={settings.ipAdapterPreset || 'STANDARD (medium strength)'}
                                                onChange={(e) => handleChange('ipAdapterPreset', e.target.value)}
                                                className={`w-full bg-black/50 border rounded p-2 text-[10px] text-slate-300 outline-none focus:border-cyan-400 transition-colors 
                                                    ${isPresetMismatch ? 'border-red-500 text-red-100 bg-red-900/10' : 'border-white/10'}`}
                                            >
                                                {PRESETS.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                       </div>
                                   );
                               })()}
                            
                            <label className="text-[10px] uppercase font-bold text-cyan-500 flex justify-between mt-3">
                                <span>Face Strength</span> <span className="text-white">{settings.ipAdapterWeight ?? 0.8}</span>
                            </label>
                            <input
                                type="range" min="0.1" max="1.5" step="0.05"
                                value={settings.ipAdapterWeight ?? 0.8}
                                onChange={(e) => handleChange('ipAdapterWeight', parseFloat(e.target.value))}
                                className="w-full accent-cyan-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                            />
                        </div>
                    )}
                </div>
                {/* Original Size Toggle */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-2">
                            <span>Use Original Size</span>
                        </label>
                        <button
                            onClick={() => handleChange('useOriginalDimensions', !settings.useOriginalDimensions)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${settings.useOriginalDimensions ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transform transition-transform duration-300 ${settings.useOriginalDimensions ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Output Dims */}
            <div className="space-y-4">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2">Dimensions</h4>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 flex justify-between">
                            Width <span className="text-white">{settings.width}</span>
                        </label>
                         <input
                            type="range" min="512" max="2048" step="64"
                            value={settings.width}
                            onChange={(e) => handleChange('width', parseInt(e.target.value))}
                            className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 flex justify-between">
                            Height <span className="text-white">{settings.height}</span>
                        </label>
                         <input
                            type="range" min="512" max="2048" step="64"
                            value={settings.height}
                            onChange={(e) => handleChange('height', parseInt(e.target.value))}
                            className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>
                 </div>
            </div>
            
            {/* End of Gen Tab */}
            </div>
            )}
            
        </div>
    </div>
  );
};

export default SettingsPanel;
