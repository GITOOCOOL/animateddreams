import React from 'react';
import { Settings, Film, Clock, Gauge, Sliders, Loader2 } from 'lucide-react';

import { WorkflowPreset, VideoSettings } from '../../types';
import WorkflowSettingsPanel from './WorkflowSettingsPanel';
import { useConnections } from '../../contexts/ConnectionContext';

interface VideoSettingsPanelProps {
  settings: VideoSettings;
  onSettingsChange: (newSettings: VideoSettings) => void;
  onDone: () => void;
  
  // Workflow Integration
  workflowPresets?: WorkflowPreset[];
  activePresetId?: string;
  onSelectPreset?: (id: string) => void;
  onImportWorkflow?: (json: any, name: string) => void;
  availableModels: string[];
  availableIPAdapters: string[];
}

const VideoSettingsPanel: React.FC<VideoSettingsPanelProps> = ({ 
    settings, onSettingsChange, onDone,
    workflowPresets, activePresetId, onSelectPreset, onImportWorkflow,
    availableModels, availableIPAdapters
}) => {
  const [activeTab, setActiveTab] = React.useState<'gen' | 'workflow'>('gen');
  const { connections } = useConnections();
  const comfyHost = connections.runpodServerId 
        ? `https://${connections.runpodServerId}-8188.proxy.runpod.net` 
        : connections.comfyHost;

  const handleChange = (key: keyof VideoSettings, value: string | number | boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const toggleLowVram = () => {
    const newVal = !settings.lowVram;
    const bestSvdModel = availableModels.find(m => m.toLowerCase().includes('svd') || m.toLowerCase().includes('stable_video')) || 'stable_video_diffusion_xt';
    
    onSettingsChange({
      ...settings,
      lowVram: newVal,
      ...(newVal ? {
        fps: 7,
        duration: 2,
        width: 576,
        height: 576,
        model: settings.model || bestSvdModel
      } : {
        fps: 10,
        duration: 3,
        width: 1024,
        height: 576
      })
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col pr-2">

        {/* Tab Navigation */}
        <div className="flex bg-card p-1 rounded-lg border border-subtle mb-4 shrink-0">
            <button
                onClick={() => setActiveTab('gen')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all
                ${activeTab === 'gen' ? 'bg-pink-600 text-white shadow-lg' : 'text-dim hover:text-main hover:bg-hover'}`}
            >
                <Film className="w-3 h-3" /> Generator
            </button>
            <button
                onClick={() => setActiveTab('workflow')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all
                ${activeTab === 'workflow' ? 'bg-pink-600 text-white shadow-lg' : 'text-dim hover:text-main hover:bg-hover'}`}
            >
                <Sliders className="w-3 h-3" /> Workflow
            </button>
        </div>

        {activeTab === 'workflow' ? (
             <WorkflowSettingsPanel
                  presets={workflowPresets || []}
                  activePresetId={activePresetId || ''}
                  onSelectPreset={onSelectPreset || (() => {})}
                  onImport={onImportWorkflow || (() => {})}
             />
        ) : (
             <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
             {/* Model Selection */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-pink-500 flex items-center gap-2">
                    <Film className="w-3 h-3" /> Video Model
                </label>
                <select
                    value={settings.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className={`w-full bg-app border rounded-lg p-3 text-xs outline-none focus:border-pink-500 hover:bg-hover transition-all ${!settings.model ? 'text-slate-500 border-pink-500/50' : 'text-main border-subtle'}`}
                >
                    <option value="" disabled>{availableModels.length > 0 ? "-- Select Video Checkpoint --" : "Connecting to Neural Core..."}</option>
                    {availableModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <div className="flex justify-between px-1">
                    <span className="text-[9px] text-slate-600">
                        {comfyHost ? (availableModels.length > 0 ? `${availableModels.length} Local Models Found` : 'Scanning Local Models...') : 'Local Engine Offline'}
                    </span>
                </div>
            </div>

            {/* Base Model Selection (For AnimateDiff) */}
            {(settings.model.toLowerCase().includes('animate')) && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] uppercase font-bold text-cyan-500 flex items-center gap-2">
                        <Loader2 className="w-3 h-3" /> Base Checkpoint (SD 1.5)
                    </label>
                    <select
                        value={settings.baseModel || ''}
                        onChange={(e) => handleChange('baseModel', e.target.value)}
                        className="w-full bg-app border border-subtle rounded-lg p-3 text-xs text-main outline-none focus:border-cyan-500 hover:bg-hover transition-all"
                    >
                        <option value="">Select a Checkpoint...</option>
                        {availableModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Low VRAM Preset */}
             <div 
                onClick={toggleLowVram}
                className={`
                    flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                    ${settings.lowVram 
                        ? 'bg-green-500/10 border-green-500/50 text-green-400' 
                        : 'bg-card border-subtle text-dim hover:bg-hover'}
                `}
             >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${settings.lowVram ? 'bg-green-500/20' : 'bg-white/5'}`}>
                        <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider">Performance Mode</div>
                        <div className="text-[10px] opacity-70">Optimized for 8GB VRAM (GTX 1070)</div>
                    </div>
                </div>
                <div className={`w-3 h-3 rounded-full border ${settings.lowVram ? 'bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'border-slate-600'}`} />
             </div>

             {/* IP-Adapter / Reference Image Control */}
            {(settings.model.toLowerCase().includes('animate')) && (
                 <div className={`space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-left-2`}>
                      <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold text-violet-400 flex items-center gap-2">
                              <Sliders className="w-3 h-3" /> Image Influence
                          </label>
                          <button
                             onClick={() => handleChange('useIpAdapter', !settings.useIpAdapter)}
                             className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${settings.useIpAdapter ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}
                          >
                              {settings.useIpAdapter ? 'ENABLED' : 'DISABLED'}
                          </button>
                      </div>

                      {settings.useIpAdapter && (
                          <div className="space-y-4 pl-2 border-l-2 border-violet-500/20 mt-2">
                               <div className="space-y-2">
                                  <div className="flex justify-between text-[10px] text-slate-400">
                                      <span>Strength</span>
                                      <span className="text-violet-400 font-mono">{settings.ipAdapterWeight || 0.6}</span>
                                  </div>
                                  <input
                                      type="range" width="100%" min="0.1" max="1.5" step="0.05"
                                      value={settings.ipAdapterWeight || 0.6}
                                      onChange={(e) => handleChange('ipAdapterWeight', parseFloat(e.target.value))}
                                      className="w-full accent-violet-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                  />
                               </div>
                               
                               <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <div className="text-[10px] text-slate-400">Adapter Preset</div>
                                    </div>
                                    <select
                                        value={settings.ipAdapterPreset || 'STANDARD (medium strength)'}
                                        onChange={(e) => handleChange('ipAdapterPreset', e.target.value)}
                                        className={`w-full bg-black/50 border rounded p-2 text-[10px] text-slate-300 outline-none focus:border-violet-500 border-white/10`}
                                    >
                                        <option value="STANDARD (medium strength)">STANDARD (medium strength)</option>
                                        <option value="VIT-G (medium strength)">VIT-G (medium strength)</option>
                                        <option value="PLUS (high strength)">PLUS (high strength)</option>
                                        <option value="PLUS FACE (portraits)">PLUS FACE (portraits)</option>
                                        <option value="LIGHT - SD1.5 only (low strength)">LIGHT - SD1.5 only (low strength)</option>
                                        <option value="FULL FACE - SD1.5 only (portraits stronger)">FULL FACE - SD1.5 only (portraits stronger)</option>
                                    </select>
                               </div>
                          </div>
                      )}
                 </div>
            )}

            {/* Parameters */}
            <div className={`space-y-4 transition-opacity duration-300 ${settings.lowVram ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2">Generation Parameters</h4>
                 
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 flex justify-between">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</span>
                            <span className="text-white">{settings.duration}s</span>
                        </label>
                         <input
                            type="range" min="1" max="10" step="1"
                            value={settings.duration}
                            onChange={(e) => handleChange('duration', parseInt(e.target.value))}
                            className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 flex justify-between">
                            <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> FPS</span> 
                            <span className="text-white">{settings.fps}</span>
                        </label>
                         <input
                            type="range" min="8" max="60" step="1"
                            value={settings.fps}
                            onChange={(e) => handleChange('fps', parseInt(e.target.value))}
                            className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between">
                         <span className="flex items-center gap-1"><Sliders className="w-3 h-3" /> Motion Bucket ID</span> 
                         <span className="text-white">{settings.motionBucketId}</span>
                    </label>
                     <input
                        type="range" min="1" max="255" step="1"
                        value={settings.motionBucketId}
                        onChange={(e) => handleChange('motionBucketId', parseInt(e.target.value))}
                        className="w-full accent-slate-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                 </div>
            </div>
            </div>
        )}
    </div>
  );
};

export default VideoSettingsPanel;
