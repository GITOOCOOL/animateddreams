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

    </div>
  );
};

export default VideoSettingsPanel;
