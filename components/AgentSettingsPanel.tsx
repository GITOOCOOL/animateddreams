import React from 'react';
import { DualAgentSettings } from '../types';
import AgentConfigPanel from './AgentConfigPanel';

interface AgentSettingsPanelProps {
  settings: DualAgentSettings;
  onSettingsChange: (newSettings: DualAgentSettings) => void;
  availableModels: string[];
}

const AgentSettingsPanel: React.FC<AgentSettingsPanelProps> = ({ settings, onSettingsChange, availableModels }) => {
  
  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar">
       
       <div className="space-y-6 animate-in slide-in-from-top-4 fade-in duration-300">
           <AgentConfigPanel 
                label="Dream Analysis Agent"
                config={settings.psychologist}
                onChange={(newConfig) => onSettingsChange({ ...settings, psychologist: newConfig })}
                availableModels={availableModels}
           />
           
           {/* Visualizer Config Hidden (Single-Pass Mode Enabled) */}
       </div>
    </div>
  );
};

export default AgentSettingsPanel;
