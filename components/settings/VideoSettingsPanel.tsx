import React from 'react';
import { Settings, Film, Clock, Gauge, Sliders, Loader2 } from 'lucide-react';
import { VideoSettings } from '../../types';

interface VideoSettingsPanelProps {
  settings: VideoSettings;
  onSettingsChange: (newSettings: VideoSettings) => void;
  onDone: () => void;
}

// VIDEO_MODELS removed in favor of dynamic fetching

import { useConnections } from '../../contexts/ConnectionContext';

const VideoSettingsPanel: React.FC<VideoSettingsPanelProps> = ({ settings, onSettingsChange, onDone }) => {
  const { connections } = useConnections();
  const comfyHost = connections.runpodServerId 
        ? `https://${connections.runpodServerId}-8188.proxy.runpod.net` 
        : connections.comfyHost; // Fallback or local

  const handleChange = (key: keyof VideoSettings, value: string | number | boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const [availableCheckpoints, setAvailableCheckpoints] = React.useState<string[]>([]);
  const [availableIpAdapters, setAvailableIpAdapters] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Fetch models if we are not using Google Veo (or even if we are, to populate list)
    if (comfyHost) {
        import('../../services/comfyService').then(mod => {
            mod.getAvailableModels(comfyHost).then(models => {
                console.log("Loaded Checkpoints:", models);
                setAvailableCheckpoints(models);
            });
            // Fetch IP Adapters
            mod.getAvailableIPAdapters(comfyHost).then(models => {
                 setAvailableIpAdapters(models);
            });
        });
    }
  }, [comfyHost]);

  // Combine Presets + Real Models
  // Removed Google Veo as user requested purely local experience.
  const uniqueModels = React.useMemo(() => {
      const presets: string[] = []; // Empty presets
      const locals = availableCheckpoints.filter(m => !presets.includes(m));
      return [...presets, ...locals];
  }, [availableCheckpoints]);

  const toggleLowVram = () => {
    // ... (rest of function kept as reference, checking context)
    const newVal = !settings.lowVram;
    const bestSvdModel = availableCheckpoints.find(m => m.toLowerCase().includes('svd') || m.toLowerCase().includes('stable_video')) || 'stable_video_diffusion_xt';
    
    onSettingsChange({
      ...settings,
      lowVram: newVal,
      ...(newVal ? {
        fps: 7,
        duration: 2,
        width: 576,
        height: 576,
        model: settings.model || bestSvdModel // Preserve model if valid, else guess
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

        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
             {/* Model Selection */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-pink-500 flex items-center gap-2">
                    <Film className="w-3 h-3" /> Video Model
                </label>
                <select
                    value={settings.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className={`w-full bg-black/50 border rounded-lg p-3 text-xs outline-none focus:border-pink-500 hover:bg-black/70 transition-all ${!settings.model ? 'text-slate-500 border-pink-500/50' : 'text-slate-300 border-white/10'}`}
                >
                    <option value="" disabled>-- Select Video Checkpoint --</option>
                    {uniqueModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                {/* Helper text to show connection status */}
                <div className="flex justify-between px-1">
                    <span className="text-[9px] text-slate-600">
                        {comfyHost ? (availableCheckpoints.length > 0 ? `${availableCheckpoints.length} Local Models Found` : 'Scanning Local Models...') : 'Local Engine Offline'}
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
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-slate-300 outline-none focus:border-cyan-500 hover:bg-black/70 transition-all"
                    >
                        <option value="">Select a Checkpoint...</option>
                        {availableCheckpoints.map(m => (
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
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}
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
                               {/* Influence Strength */}
                               <div className="space-y-2">
                                  <div className="flex justify-between text-[10px] text-slate-400">
                                      <span>Strength</span>
                                      <span className="text-violet-400 font-mono">{settings.ipAdapterWeight || 0.6}</span>
                                  </div>
                                  <input
                                      type="range"
                                      min="0.1"
                                      max="1.5"
                                      step="0.05"
                                      value={settings.ipAdapterWeight || 0.6}
                                      onChange={(e) => handleChange('ipAdapterWeight', parseFloat(e.target.value))}
                                      className="w-full accent-violet-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                  />
                               </div>
                               
                               {/* Preset Selection & Model Validation */}
                               {(() => {
                                   const isSdxl = settings.model?.toLowerCase().includes("sdxl");
                                   // Check Compatibility
                                   // Warn if SDXL Checkpoint + "STANDARD" (SD1.5) Preset
                                   const isPresetMismatch = isSdxl && (settings.ipAdapterPreset?.includes("STANDARD") || settings.ipAdapterPreset?.includes("LIGHT"));
                                   
                                   const PRESETS = [
                                       "STANDARD (medium strength)",
                                       "VIT-G (medium strength)",
                                       "PLUS (high strength)",
                                       "PLUS FACE (portraits)",
                                       "LIGHT - SD1.5 only (low strength)",
                                       "FULL FACE - SD1.5 only (portraits stronger)"
                                   ];

                                   return (
                                       <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <div className="text-[10px] text-slate-400">Adapter Preset</div>
                                                {isPresetMismatch && <div className="text-[9px] text-red-400 font-bold animate-pulse">SDXL / SD1.5 Mismatch</div>}
                                            </div>
                                            <select
                                                value={settings.ipAdapterPreset || 'STANDARD (medium strength)'}
                                                onChange={(e) => handleChange('ipAdapterPreset', e.target.value)}
                                                className={`w-full bg-black/50 border rounded p-2 text-[10px] text-slate-300 outline-none focus:border-violet-500 ${isPresetMismatch ? 'border-red-500 text-red-100 bg-red-900/10' : 'border-white/10'}`}
                                            >
                                                {PRESETS.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                       </div>
                                   );
                               })()}
                               
                               {/* Compatibility Check for Base Model (Motion Module) */}
                               {(() => {
                                   const isSdxl = settings.model?.toLowerCase().includes("sdxl");
                                   // Simple check: If model says 'lightning' or 'sd1.5' but main model is 'sdxl'
                                   // Since we don't know exact metadata, we use string matching
                                   // Note: User's motion module is 'animatediff_lightning_4step_comfyui.safetensors' (implies SD1.5)
                                   
                                   // If we had the motion module selection here, we would check it.
                                   // Currently settings.baseModel is the Checkpoint for AnimateDiff logic path, 
                                   // but settings.model is the MAIN video checkpoint.
                                   
                                   // If main model is SDXL, warn about known SD1.5 limitations
                                   if (isSdxl) {
                                       return (
                                           <div className="p-2 border border-red-500/30 bg-red-500/10 rounded text-[9px] text-red-300 mt-2">
                                               Warning: You are using an SDXL model. Ensure your Motion Module and IP-Adapter are SDXL-compatible, or generation will fail.
                                           </div>
                                       )
                                   }
                                   return null;
                               })()}

                          </div>
                      )}
                 </div>
            )}

            {/* Parameters */}
            <div className={`space-y-4 transition-opacity duration-300 ${settings.lowVram ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2">Generation Parameters</h4>
                 
                 <div className="grid grid-cols-2 gap-6">
                    {/* Duration */}
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

                    {/* FPS */}
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

                 {/* Motion Bucket (Advanced) */}
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

        
        {/* Done Button */}

    </div>
  );
};

export default VideoSettingsPanel;
