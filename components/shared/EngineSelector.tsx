import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Engine {
  id: string;
  name: string;
  type: 'analysis' | 'image' | 'video' | 'dictation';
  isAvailable: boolean;
  isConfigured: boolean;
}

interface EngineSelectorProps {
  engines: Engine[];
  selectedEngineId: string | null;
  onSelectEngine: (engineId: string) => void;
  moduleType: 'analysis' | 'image' | 'video' | 'dictation';
}

const EngineSelector: React.FC<EngineSelectorProps> = ({
  engines,
  selectedEngineId,
  onSelectEngine,
  moduleType
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedEngine = engines.find(e => e.id === selectedEngineId);
  const availableEngines = engines.filter(e => e.type === moduleType);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusColor = (engine: Engine) => {
    if (!engine.isConfigured) return 'bg-yellow-500';
    return engine.isAvailable ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-hover rounded-lg transition-all text-dim hover:text-main"
        title="Select Engine"
      >
        <div className={`w-2 h-2 rounded-full ${selectedEngine ? getStatusColor(selectedEngine) : 'bg-gray-500'}`}></div>
        <span className="text-xs font-mono">
          {selectedEngine ? selectedEngine.name : 'SELECT'}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-surface border border-subtle rounded-lg shadow-xl shadow-slate-200/50 dark:shadow-black/50 min-w-[200px] z-50 overflow-hidden">
          <div className="p-2">
            <div className="text-[9px] text-dim uppercase font-bold px-2 py-1 mb-1">
              Available Engines
            </div>
            {availableEngines.length > 0 ? (
              availableEngines.map((engine) => (
                <button
                  key={engine.id}
                  onClick={() => {
                    onSelectEngine(engine.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                    selectedEngineId === engine.id
                      ? 'bg-cyan-500/10 text-accent'
                      : 'hover:bg-hover text-main'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(engine)}`}></div>
                    <span className="text-xs font-mono">{engine.name}</span>
                  </div>
                  {selectedEngineId === engine.id && (
                    <Check className="w-3 h-3 text-accent" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-dim text-center">
                No engines configured
              </div>
            )}
          </div>
          <div className="border-t border-subtle p-2">
            <div className="text-[9px] text-dim/60 px-2 py-1">
              Configure engines in Settings
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngineSelector;
