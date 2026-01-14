import React from 'react';
import { Settings, Sliders, Activity, Zap, Layers, Image as ImageIcon, Box } from 'lucide-react';
import { ComfySettings } from '../types';
import WorkflowVisualizer from './WorkflowVisualizer';

interface SettingsPanelProps {
  settings: ComfySettings;
  onSettingsChange: (newSettings: ComfySettings) => void;
  onDone: () => void;
  availableModels: string[];
  availableLoras: string[];
}

const DEFAULT_MODELS = [
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

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, onDone, availableModels, availableLoras }) => {
  const [showValidation, setShowValidation] = React.useState(false);

  const handleChange = (key: keyof ComfySettings, value: string | number) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
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
    <div className="w-full bg-[#0F0F11] border border-white/10 rounded-2xl p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
            <Settings className="w-4 h-4 text-cyan-500" />
            Neural Configuration
        </h3>

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

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                         <label className="text-[10px] uppercase font-bold text-yellow-500 flex items-center gap-2">
                            <Zap className="w-3 h-3" /> LoRA Adapter
                        </label>
                         <select
                            value={settings.lora || "None"}
                            onChange={(e) => handleChange('lora', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-yellow-500 hover:bg-black/70"
                        >
                            <option value="None">None</option>
                            {availableLoras && availableLoras.length > 0 ? (
                                availableLoras.map(l => <option key={l} value={l}>{l}</option>)
                            ) : (
                                <option disabled>No LoRAs</option>
                            )}
                        </select>
                    </div>
                    {settings.lora && settings.lora !== "None" && (
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between">
                                Strength <span className="text-yellow-500">{settings.loraStrength || 1.0}</span>
                            </label>
                             <input
                                type="range" min="0.1" max="2.0" step="0.1"
                                value={settings.loraStrength || 1.0}
                                onChange={(e) => handleChange('loraStrength', parseFloat(e.target.value))}
                                className="w-full accent-yellow-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                            />
                        </div>
                    )}
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
        </div>
        

        
        {/* Done Button */}
        <div className="pt-4 mt-auto">
            <button
                onClick={onDone}
                disabled={!settings.model}
                className={`
                    w-full py-2 rounded-lg font-bold uppercase text-[10px] tracking-widest transition-all
                    ${settings.model 
                        ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                        : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'}
                `}
            >
                {settings.model ? 'Confirm Configuration' : 'Select Model to Proceed'}
            </button>
        </div>
    </div>
  );
};

export default SettingsPanel;
