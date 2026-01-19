import React from 'react';
import { Settings, Sliders, Activity, Zap, Layers, Image as ImageIcon, Box, X } from 'lucide-react';
import { ComfySettings, DreamAttachment } from '../types';
import WorkflowVisualizer from './WorkflowVisualizer';

interface SettingsPanelProps {
  settings: ComfySettings;
  onSettingsChange: (newSettings: ComfySettings) => void;
  onDone: () => void;
  availableModels: string[];
  availableLoras: string[];
  availableIPAdapters?: string[];
  availableNodeTypes?: string[]; // Discovery
  inputImage?: DreamAttachment;
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

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, onDone, availableModels, availableLoras, availableIPAdapters, availableNodeTypes, inputImage }) => {
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

  const handleDone = () => {
    if (!settings.model) {
        setShowValidation(true);
        // Shake animation effect could be added here or via CSS class
        return;
    }
    onDone();
  };

  const modelOptions = (availableModels && availableModels.length > 0) ? availableModels : DEFAULT_MODELS;
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col pr-2">

        <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
            
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

                {/* Denoise (Image-to-Image) */}
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

                            {/* Preset Selector (Hidden if specific model is manually selected, to avoid confusion) */}
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
                                            {isPresetMismatch ? (
                                                <p className="text-[9px] text-red-400 font-bold">
                                                    Warning: Selected preset requires SD1.5. Use 'STANDARD / SDXL'.
                                                </p>
                                            ) : (
                                                <p className="text-[9px] text-slate-500 italic">
                                                    'STANDARD' works for most SDXL models (uses ViT-H).
                                                </p>
                                            )}
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
                    <p className="text-[9px] text-slate-500">
                        Bypasses auto-resizing. Use strict input dimensions (Caution: May cause stripes if not SDXL-friendly).
                    </p>
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

            {/* Custom Workflow Modules (Expert) */}
            <div className="space-y-4 pt-4 border-t border-white/5">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                     <span>Custom Modules (Expert)</span>
                     <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded">BETA</span>
                 </h4>
                 
                 <div className="space-y-3">
                     {/* Add Node Control */}
                     <div className="flex gap-2">
                        <input 
                            list="node-types" 
                            placeholder="Type node class name..."
                            className="bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 w-full outline-none focus:border-purple-500"
                            id="node-search"
                        />
                        <datalist id="node-types">
                            {availableNodeTypes?.map(type => <option key={type} value={type} />)}
                        </datalist>
                        <button 
                            onClick={() => {
                                const input = document.getElementById('node-search') as HTMLInputElement;
                                const type = input.value;
                                if (type) {
                                    const newNodes = [...(settings.customNodes || [])];
                                    // Generate ID starting from 500
                                    const id = (500 + newNodes.length).toString(); 
                                    newNodes.push({ type, id, inputs: {} });
                                    onSettingsChange({ ...settings, customNodes: newNodes });
                                    input.value = '';
                                }
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-3 rounded-lg text-xs font-bold"
                        >
                            ADD
                        </button>
                     </div>

                     {/* List of Added Nodes */}
                     {settings.customNodes?.map((node, index) => (
                         <div key={node.id} className="bg-white/5 p-3 rounded-lg border border-white/5 relative group">
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-[10px] font-bold text-cyan-400">{node.type} <span className="text-slate-500">#{node.id}</span></span>
                                 <button 
                                    onClick={() => {
                                        const newNodes = settings.customNodes!.filter(n => n.id !== node.id);
                                        onSettingsChange({ ...settings, customNodes: newNodes });
                                    }}
                                    className="text-slate-600 hover:text-red-500"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                             </div>
                             <textarea
                                placeholder='JSON Params e.g. {"value": 1.0, "text": "foo"}'
                                className="w-full bg-black/30 text-[10px] font-mono p-2 rounded border border-white/5 outline-none focus:border-cyan-500 text-slate-300 min-h-[60px]"
                                defaultValue={JSON.stringify(node.inputs || {}, null, 2)}
                                onBlur={(e) => {
                                    try {
                                        const parsed = JSON.parse(e.target.value);
                                        const newNodes = [...settings.customNodes!];
                                        newNodes[index].inputs = parsed;
                                        onSettingsChange({ ...settings, customNodes: newNodes });
                                    } catch (err) {
                                        // Ignore invalid JSON for now or show error border
                                        e.target.style.borderColor = 'red';
                                    }
                                }}
                                onFocus={(e) => e.target.style.borderColor = ''}
                             />
                         </div>
                     ))}
                 </div>
            </div>
        </div>
        

        
        {/* Done Button */}

    </div>
  );
};

export default SettingsPanel;
