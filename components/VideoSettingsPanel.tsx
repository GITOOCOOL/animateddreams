import React from 'react';
import { Settings, Film, Clock, Gauge, Sliders } from 'lucide-react';
import { VideoSettings } from '../types';

interface VideoSettingsPanelProps {
  settings: VideoSettings;
  onSettingsChange: (newSettings: VideoSettings) => void;
  onDone: () => void;
}

const VIDEO_MODELS = [
  'Google Veo',
  'stable_video_diffusion_xt',
  'animatediff_v3',
];

const VideoSettingsPanel: React.FC<VideoSettingsPanelProps> = ({ settings, onSettingsChange, onDone }) => {
  const handleChange = (key: keyof VideoSettings, value: string | number) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="w-full bg-[#0F0F11] border border-white/10 rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-pink-500" />
            Video Configuration
        </h3>

        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
             {/* Model Selection */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-pink-500 flex items-center gap-2">
                    <Film className="w-3 h-3" /> Video Model
                </label>
                <select
                    value={settings.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-slate-300 outline-none focus:border-pink-500 hover:bg-black/70 transition-all"
                >
                    {VIDEO_MODELS.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            </div>

            {/* Parameters */}
            <div className="space-y-4">
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
        <div className="pt-4 mt-auto">
            <button
                onClick={onDone}
                disabled={!settings.model}
                className={`
                    w-full py-2 rounded-lg font-bold uppercase text-[10px] tracking-widest transition-all
                    ${settings.model 
                        ? 'bg-pink-900/50 text-pink-400 border border-pink-500/50 hover:bg-pink-500 hover:text-black shadow-[0_0_15px_rgba(236,72,153,0.2)]' 
                        : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'}
                `}
            >
                {settings.model ? 'Confirm Video Settings' : 'Select Model to Proceed'}
            </button>
        </div>
    </div>
  );
};

export default VideoSettingsPanel;
