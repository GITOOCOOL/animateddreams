import React from 'react';
import { Settings as SettingsIcon, Mic } from 'lucide-react';
import { useConnections } from '../../contexts/ConnectionContext';
import EngineConfigPanel from './EngineConfigPanel';
import { useEngineManager } from '../../hooks/useEngineManager';

const SystemSettingsPanel: React.FC = () => {
  const { connections, updateConnection } = useConnections();
  
  // Engine Manager
  const {
    engines,
    availablePresets,
    addEngine,
    updateEngine,
    deleteEngine,
    savePreset,
    loadPreset,
    testEngineConnection,
  } = useEngineManager();

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
      <h4 className="text-xs font-bold text-dim uppercase tracking-wider border-b border-subtle pb-2 flex items-center gap-2 mb-4 mt-8 first:mt-0">
          <Icon className="w-4 h-4 text-cyan-500" />
          {title}
      </h4>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        
        {/* Engine Configuration */}
        <div>
            <SectionHeader icon={SettingsIcon} title="Engine Configuration" />
            <EngineConfigPanel
                engines={engines}
                onAddEngine={addEngine}
                onUpdateEngine={updateEngine}
                onDeleteEngine={deleteEngine}
                onSavePreset={savePreset}
                onLoadPreset={loadPreset}
                onTestConnection={testEngineConnection}
                availablePresets={availablePresets}
            />
        </div>

    </div>
  );
};


export default SystemSettingsPanel;
