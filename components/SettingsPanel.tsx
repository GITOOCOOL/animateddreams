import React from 'react';
import { Settings, Sliders, Activity, Zap, Layers, Image as ImageIcon, Box } from 'lucide-react';
import { ComfySettings } from '../types';
import WorkflowVisualizer from './WorkflowVisualizer';

interface SettingsPanelProps {
  settings: ComfySettings;
  onSettingsChange: (newSettings: ComfySettings) => void;
  isOpen: boolean;
  onToggle: () => void;
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

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, isOpen, onToggle, availableModels, availableLoras }) => {
  const handleChange = (key: keyof ComfySettings, value: string | number) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const modelOptions = (availableModels && availableModels.length > 0) ? availableModels : DEFAULT_MODELS;

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-8 right-8 z-50 bg-slate-900 border border-slate-700 p-3 rounded-full text-slate-400 hover:text-white hover:border-cyan-500 shadow-xl transition-all"
        title="Generation Settings"
      >
        <Sliders className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 z-50 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-black/40">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-500" />
          Neural Config
        </h3>
        <button onClick={onToggle} className="text-slate-500 hover:text-white">
          ×
        </button>
      </div>

      <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
        
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-cyan-500 uppercase flex items-center gap-2">
            <Layers className="w-3 h-3" /> Model Checkpoint
          </label>
          <select
            value={settings.model}
            onChange={(e) => handleChange('model', e.target.value)}
            className="w-full bg-black border border-slate-700 rounded p-2 text-xs text-slate-300 focus:border-cyan-500 outline-none"
          >
            {modelOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* LoRA Settings */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
            <label className="text-xs font-mono text-yellow-500 uppercase flex items-center justify-between">
                <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> LoRA Style</span>
                <span className="text-[9px] text-slate-700">({availableLoras?.length || 0})</span>
            </label>
            <div className="space-y-2">
                <select 
                    value={settings.lora || "None"}
                    onChange={(e) => handleChange('lora', e.target.value)}
                    className="w-full bg-black border border-slate-700 rounded p-2 text-xs text-slate-300 outline-none"
                >
                    <option value="None">None</option>
                    {availableLoras && availableLoras.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                
                {settings.lora && settings.lora !== "None" && (
                    <div className="pt-1">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Strength</span>
                            <span>{settings.loraStrength || 1.0}</span>
                        </div>
                        <input 
                            type="range" min="0.1" max="2.0" step="0.1"
                            value={settings.loraStrength || 1.0}
                            onChange={(e) => handleChange('loraStrength', parseFloat(e.target.value))}
                            className="w-full accent-yellow-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                        />
                    </div>
                )}
            </div>
        </div>

        {/* Steps Slider */}
        <div className="space-y-2 border-t border-slate-800 pt-4">
          <label className="text-xs font-mono text-cyan-500 uppercase flex items-center justify-between">
            <span className="flex items-center gap-2"><Activity className="w-3 h-3" /> Steps (Quality)</span>
            <span className="text-white">{settings.steps}</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="1"
            value={settings.steps}
            onChange={(e) => handleChange('steps', parseInt(e.target.value))}
            className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* CFG Scale Slider */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-purple-500 uppercase flex items-center justify-between">
             <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> CFG Scale (Creativity)</span>
             <span className="text-white">{settings.cfg}</span>
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={settings.cfg}
            onChange={(e) => handleChange('cfg', parseFloat(e.target.value))}
            className="w-full accent-purple-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Denoise Slider */}
        <div className="space-y-2 border-t border-slate-800 pt-4">
          <label className="text-xs font-mono text-pink-500 uppercase flex items-center justify-between">
             <span className="flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Img2Img Denoise</span>
             <span className="text-white">{settings.denoise}</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={settings.denoise}
            onChange={(e) => handleChange('denoise', parseFloat(e.target.value))}
            className="w-full accent-pink-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-[10px] text-slate-500">
            Lower = Closer to original image. Higher = More creative.
          </p>
        </div>
        
        {/* Advanced Sampler Settings */}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-4">
            <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500">Sampler</label>
                <select 
                    value={settings.sampler}
                    onChange={(e) => handleChange('sampler', e.target.value)}
                    className="w-full bg-black border border-slate-700 rounded p-1 text-xs text-slate-300 outline-none"
                >
                    {SAMPLERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500">Scheduler</label>
                 <select 
                    value={settings.scheduler}
                    onChange={(e) => handleChange('scheduler', e.target.value)}
                    className="w-full bg-black border border-slate-700 rounded p-1 text-xs text-slate-300 outline-none"
                >
                    {SCHEDULERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>

        {/* Dimensions */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
            <label className="text-[10px] uppercase text-slate-500 flex items-center gap-2">
                <Box className="w-3 h-3" /> Dimensions
            </label>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] text-slate-400">Width: {settings.width}px</label>
                   <input 
                      type="range" min="512" max="2048" step="64"
                      value={settings.width}
                      onChange={(e) => handleChange('width', parseInt(e.target.value))}
                      className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] text-slate-400">Height: {settings.height}px</label>
                   <input 
                      type="range" min="512" max="2048" step="64"
                      value={settings.height}
                      onChange={(e) => handleChange('height', parseInt(e.target.value))}
                      className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                   />
                </div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
               <span>Square 1024</span>
               <span>Portrait 832x1216</span>
               <span>Landscape 1216x832</span>
            </div>
        </div>

        {/* Visualizer */}
        <div className="border-t border-slate-800 pt-4">
             <WorkflowVisualizer settings={settings} workflowType="Text-to-Image" />
             <p className="text-[9px] text-slate-600 mt-2 text-center">* Workflow type may change automatically if input image is detected.</p>
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;
