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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[85%] max-w-7xl max-h-[95vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-black/40">
          <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3">
            <Settings className="w-5 h-5 text-cyan-500" />
            Neural Configuration Matrix
          </h3>
          <button
            onClick={onToggle}
            className="text-slate-500 hover:text-white hover:bg-red-500/20 p-2 rounded-full transition-colors"
          >
            <Box className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Left Column: Model & LoRA */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Base Architecture</h4>

                {/* Model */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-cyan-500 uppercase flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Checkpoint Model
                  </label>
                  <select
                    value={settings.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className="w-full bg-black border border-slate-700 rounded-md p-3 text-sm text-slate-300 focus:border-cyan-500 outline-none transition-colors shadow-inner"
                  >
                    {modelOptions.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* LoRA */}
                <div className="space-y-3 pt-4">
                  <label className="text-xs font-mono text-yellow-500 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> LoRA Adapter</span>
                    <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">{availableLoras?.length || 0} Available</span>
                  </label>
                  <div className="p-4 bg-black/30 rounded-lg border border-slate-800 space-y-4">
                    <select
                      value={settings.lora || "None"}
                      onChange={(e) => handleChange('lora', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300 outline-none focus:border-yellow-500"
                    >
                      <option value="None">None (Pure Checkpoint)</option>
                      {availableLoras && availableLoras.length > 0 ? (
                        availableLoras.map(l => <option key={l} value={l}>{l}</option>)
                      ) : (
                        <option disabled>No LoRAs found in ComfyUI</option>
                      )}
                    </select>

                    {settings.lora && settings.lora !== "None" && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Adapter Strength</span>
                          <span className="text-yellow-500 font-mono">{settings.loraStrength || 1.0}</span>
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
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Generation Parameters</h4>

                {/* Steps */}
                <div className="space-y-3">
                  <label className="text-xs font-mono text-cyan-500 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-2"><Activity className="w-3 h-3" /> Steps (Sampling Depth)</span>
                    <span className="text-white font-mono">{settings.steps}</span>
                  </label>
                  <input
                    type="range" min="10" max="100" step="1"
                    value={settings.steps}
                    onChange={(e) => handleChange('steps', parseInt(e.target.value))}
                    className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* CFG */}
                <div className="space-y-3">
                  <label className="text-xs font-mono text-purple-500 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> CFG (Guidance Scale)</span>
                    <span className="text-white font-mono">{settings.cfg}</span>
                  </label>
                  <input
                    type="range" min="1" max="20" step="0.5"
                    value={settings.cfg}
                    onChange={(e) => handleChange('cfg', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Advanced & Visualizer */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Sampling Strategy</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-500 font-bold">Sampler Algorithm</label>
                    <select
                      value={settings.sampler}
                      onChange={(e) => handleChange('sampler', e.target.value)}
                      className="w-full bg-black border border-slate-700 rounded p-2 text-xs text-slate-300 outline-none focus:border-purple-500 transition-colors"
                    >
                      {SAMPLERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-500 font-bold">Scheduler</label>
                    <select
                      value={settings.scheduler}
                      onChange={(e) => handleChange('scheduler', e.target.value)}
                      className="w-full bg-black border border-slate-700 rounded p-2 text-xs text-slate-300 outline-none focus:border-purple-500 transition-colors"
                    >
                      {SCHEDULERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-mono text-pink-500 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Img2Img Denoise Strength</span>
                    <span className="text-white font-mono">{settings.denoise}</span>
                  </label>
                  <input
                    type="range" min="0.1" max="1.0" step="0.05"
                    value={settings.denoise}
                    onChange={(e) => handleChange('denoise', parseFloat(e.target.value))}
                    className="w-full accent-pink-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 italic">
                    Values &lt; 0.5 preserve structure. Values &gt; 0.7 allow significant hallucinations.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Output Dimensions</h4>

                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex justify-center items-end gap-1 mb-4 h-32 relative">
                    {/* Dimension Visualizer */}
                    <div
                      style={{
                        width: `${(settings.width / 2048) * 100}%`,
                        height: `${(settings.height / 2048) * 100}%`
                      }}
                      className="bg-cyan-500/20 border-2 border-cyan-500 relative transition-all duration-300"
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-cyan-500 font-mono">
                        {settings.width}x{settings.height}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">Width</label>
                      <input
                        type="range" min="512" max="2048" step="64"
                        value={settings.width}
                        onChange={(e) => handleChange('width', parseInt(e.target.value))}
                        className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400">Height</label>
                      <input
                        type="range" min="512" max="2048" step="64"
                        value={settings.height}
                        onChange={(e) => handleChange('height', parseInt(e.target.value))}
                        className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <WorkflowVisualizer settings={settings} workflowType="Text-to-Image" />
              </div>

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-black/40 flex justify-end gap-4">
          <button
            onClick={onToggle}
            className="px-6 py-2 text-slate-400 hover:text-white font-mono text-xs uppercase"
          >
            Cancel
          </button>
          <button
            onClick={onToggle}
            className="px-8 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider rounded shadow-lg shadow-cyan-500/20"
          >
            Apply Configuration
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;
