import React from 'react';
import { Brain, Thermometer, MessageSquare, Terminal } from 'lucide-react';

// Define the shape of Analysis Settings (can be moved to types later)
export interface AnalysisSettings {
    temperature: number;
    systemPrompt: string;
    modelOverride: string;
}

interface AnalysisSettingsPanelProps {
    settings: AnalysisSettings;
    onSettingsChange: (newSettings: AnalysisSettings) => void;
}

const AnalysisSettingsPanel: React.FC<AnalysisSettingsPanelProps> = ({ settings, onSettingsChange }) => {
    
    const handleChange = (key: keyof AnalysisSettings, value: any) => {
        onSettingsChange({
            ...settings,
            [key]: value
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Temperature */}
            <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between">
                    <span>Creativity (Temperature)</span> 
                    <span className="text-white">{settings.temperature}</span>
                </label>
                <div className="flex items-center gap-3">
                    <Thermometer className="w-4 h-4 text-slate-600" />
                    <input
                        type="range" min="0" max="1" step="0.1"
                        value={settings.temperature}
                        onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                        className="flex-1 accent-purple-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                </div>
            </div>

            {/* System Prompt */}
            <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
                    <Terminal className="w-3 h-3" /> System Prompt Override
                </label>
                <textarea 
                    value={settings.systemPrompt}
                    onChange={(e) => handleChange('systemPrompt', e.target.value)}
                    className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-slate-300 focus:border-purple-500 outline-none font-mono resize-none leading-relaxed"
                    placeholder="Define the persona and rules for the AI analyst..."
                />
                <p className="text-[9px] text-slate-600 italic">
                    * Overrides the default "Dream Analyst" persona.
                </p>
            </div>
        </div>
    );
};

export default AnalysisSettingsPanel;
