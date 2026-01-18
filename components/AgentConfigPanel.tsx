import React from 'react';
import { Brain, Cpu, MessageSquare, Sliders } from 'lucide-react';
import { AgentConfig } from '../types';

interface AgentConfigPanelProps {
  label: string;
  config: AgentConfig;
  onChange: (newConfig: AgentConfig) => void;
  availableModels: string[]; // From Ollama usually
}

const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({ label, config, onChange, availableModels }) => {
  
  const handleChange = (key: keyof AgentConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <Brain className="w-4 h-4 text-purple-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">{label}</h4>
      </div>

      {/* Provider & Model */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Provider</label>
            <select
                value={config.provider}
                onChange={(e) => handleChange('provider', e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-purple-500"
            >
                <option value="ollama">Ollama (Local)</option>
                {/* Future: Gemini, Anthropic */}
            </select>
        </div>
        <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Model</label>
            {config.provider === 'ollama' && availableModels.length > 0 ? (
                <select
                    value={config.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-purple-500"
                >
                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                     {/* Allow custom entry if needed? Maybe toggle. For now strict list is safer for user request. */}
                </select>
            ) : (
                <input
                    type="text"
                    value={config.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    placeholder="e.g. llama3"
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-purple-500"
                />
            )}
        </div>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
            <span>Creativity (Temp)</span>
            <span className="text-white">{config.temperature}</span>
        </div>
        <input
            type="range" min="0" max="1" step="0.1"
            value={config.temperature}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg cursor-pointer"
        />
      </div>

       {/* System Prompt */}
       <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> System Instruction
            </label>
            <textarea
                value={config.systemPrompt || ''}
                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                rows={3}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-slate-400 focus:text-white outline-none focus:border-cyan-500 transition-colors resize-none"
            />
       </div>

    </div>
  );
};

export default AgentConfigPanel;
