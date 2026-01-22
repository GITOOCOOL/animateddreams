import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface EngineConfig {
  id: string;
  name: string;
  type: 'analysis' | 'image' | 'video' | 'dictation';
  provider: string;
  config: Record<string, any>;
  isEnabled: boolean;
  isDefault?: boolean;
}

export interface EngineStatus {
  id: string;
  isAvailable: boolean;
  isConfigured: boolean;
  lastChecked: number;
}

interface EngineContextType {
  engines: EngineConfig[];
  engineStatus: Map<string, EngineStatus>;
  availablePresets: string[];
  addEngine: (engine: EngineConfig) => void;
  updateEngine: (id: string, updatedEngine: EngineConfig) => void;
  deleteEngine: (id: string) => void;
  savePreset: (enginesToSave: EngineConfig[], presetName: string) => Promise<void>;
  loadPreset: (presetName: string) => Promise<void>;
  getEnginesForModule: (type: 'analysis' | 'image' | 'video' | 'dictation') => Array<{
    id: string;
    name: string;
    type: 'analysis' | 'image' | 'video' | 'dictation';
    isAvailable: boolean;
    isConfigured: boolean;
  }>;
  refreshEngineStatus: () => void;
  testEngineConnection: (engine: EngineConfig) => Promise<boolean>;
}

const EngineContext = createContext<EngineContextType | undefined>(undefined);

export const useEngineContext = () => {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error('useEngineContext must be used within an EngineProvider');
  }
  return context;
};

export const EngineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [engines, setEngines] = useState<EngineConfig[]>([]);
  const [engineStatus, setEngineStatus] = useState<Map<string, EngineStatus>>(new Map());
  const [availablePresets, setAvailablePresets] = useState<string[]>([]);

  const checkEngineStatus = useCallback(async (engine: EngineConfig) => {
    try {
      let isAvailable = false;
      let isConfigured = true;

      // Check if engine is properly configured
      if (engine.provider === 'ollama') {
        isConfigured = !!engine.config.host && !!engine.config.model;
        if (isConfigured) {
          try {
            const host = engine.config.host;
            // A request is truly local if it matches the current browser's originhost
            const isLocal = host.includes(window.location.hostname);
            const useProxy = !isLocal || (host.includes('127.0.0.1') && window.location.hostname !== '127.0.0.1');
            
            const url = useProxy ? `/api/engines/proxy/api/tags` : `${host}/api/tags`;
            const headers: Record<string, string> = useProxy ? { 'x-comfy-host': host } : {};

            const response = await fetch(url, { 
              method: 'GET',
              headers,
              signal: AbortSignal.timeout(3000)
            });
            isAvailable = response.ok;
          } catch {
            isAvailable = false;
          }
        }
      } else if (engine.provider === 'gemini') {
        isConfigured = !!engine.config.apiKey;
        isAvailable = isConfigured; 
      } else if (engine.provider.startsWith('comfy')) {
        isConfigured = !!engine.config.host || !!engine.config.serverId;
        if (isConfigured && engine.config.host) {
          try {
            const host = engine.config.host;
            const isLocal = host.includes(window.location.hostname);
            const useProxy = !isLocal || (host.includes('127.0.0.1') && window.location.hostname !== '127.0.0.1');
            
            const url = useProxy ? `/api/engines/proxy/system_stats` : `${host}/system_stats`;
            const headers: Record<string, string> = useProxy ? { 'x-comfy-host': host } : {};

            const response = await fetch(url, {
              headers,
              signal: AbortSignal.timeout(3000)
            });
            isAvailable = response.ok;
          } catch {
            isAvailable = false;
          }
        }
      } else if (engine.provider === 'browser') {
        isAvailable = true; // Browser API always assumed available if supported
        if (typeof window !== 'undefined' && !((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) {
            isAvailable = false;
        }
      }

      setEngineStatus(prev => new Map(prev).set(engine.id, {
        id: engine.id,
        isAvailable,
        isConfigured,
        lastChecked: Date.now(),
      }));
    } catch (error) {
      console.error(`Failed to check status for engine ${engine.id}:`, error);
    }
  }, []);

  const saveEnginesToStorage = (enginesToSave: EngineConfig[]) => {
    try {
      localStorage.setItem('engine_configs', JSON.stringify(enginesToSave));
    } catch (error) {
      console.error('Failed to save engine configs:', error);
    }
  };

  // Load engines from localStorage on mount
  useEffect(() => {
    const loadEngines = () => {
      try {
        const saved = localStorage.getItem('engine_configs');
        if (saved) {
          const parsed = JSON.parse(saved);
          setEngines(parsed);
          parsed.forEach((engine: EngineConfig) => {
            checkEngineStatus(engine);
          });
        } else {
          // Initialize with default engines
          const defaultEngines: EngineConfig[] = [
            {
              id: 'ollama-default',
              name: 'Ollama (Local)',
              type: 'analysis',
              provider: 'ollama',
              config: { host: 'http://localhost:11434', model: 'llama2' },
              isEnabled: true,
              isDefault: true,
            },
            {
              id: 'comfy-local-default',
              name: 'ComfyUI (Local)',
              type: 'image',
              provider: 'comfy-local',
              config: { host: 'http://127.0.0.1:8188' },
              isEnabled: true,
              isDefault: true,
            },
             {
              id: 'browser-speech',
              name: 'Browser Speech',
              type: 'dictation',
              provider: 'browser',
              config: {},
              isEnabled: true,
              isDefault: true,
            },
          ];
          setEngines(defaultEngines);
          saveEnginesToStorage(defaultEngines);
        }
      } catch (error) {
        console.error('Failed to load engine configs:', error);
      }
    };

    loadEngines();
    loadPresets();
  }, [checkEngineStatus]);

  const loadPresets = async () => {
    try {
      const response = await fetch('/api/engines/presets');
      if (response.ok) {
        const presets = await response.json();
        setAvailablePresets(presets);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const addEngine = useCallback((engine: EngineConfig) => {
    setEngines(prev => {
      const newEngines = [...prev, engine];
      saveEnginesToStorage(newEngines); // Save inside callback to ensure consistency
      return newEngines;
    });
    checkEngineStatus(engine);
  }, [checkEngineStatus]);

  const updateEngine = useCallback((id: string, updatedEngine: EngineConfig) => {
    setEngines(prev => {
        const newEngines = prev.map(e => e.id === id ? updatedEngine : e);
        saveEnginesToStorage(newEngines);
        return newEngines;
    });
    checkEngineStatus(updatedEngine);
  }, [checkEngineStatus]);

  const deleteEngine = useCallback((id: string) => {
    setEngines(prev => {
        const newEngines = prev.filter(e => e.id !== id);
        saveEnginesToStorage(newEngines);
        return newEngines;
    });
    setEngineStatus(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const savePreset = useCallback(async (enginesToSave: EngineConfig[], presetName: string) => {
    try {
      const response = await fetch('/api/engines/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: presetName, engines: enginesToSave }),
      });
      
      if (response.ok) {
        loadPresets();
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  }, []);

  const loadPreset = useCallback(async (presetName: string) => {
    try {
      const response = await fetch(`/api/engines/presets/${presetName}`);
      if (response.ok) {
        const preset = await response.json();
        setEngines(preset.engines);
        saveEnginesToStorage(preset.engines);
        preset.engines.forEach((engine: EngineConfig) => {
          checkEngineStatus(engine);
        });
      }
    } catch (error) {
      console.error('Failed to load preset:', error);
    }
  }, [checkEngineStatus]);

  const getEnginesForModule = useCallback((type: 'analysis' | 'image' | 'video' | 'dictation') => {
    return engines
      .filter(e => e.type === type && e.isEnabled)
      .map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        isAvailable: engineStatus.get(e.id)?.isAvailable || false,
        isConfigured: engineStatus.get(e.id)?.isConfigured || false,
      }));
  }, [engines, engineStatus]);

  const refreshEngineStatus = useCallback(() => {
    engines.forEach(engine => {
      if (engine.isEnabled) {
        checkEngineStatus(engine);
      }
    });
  }, [engines, checkEngineStatus]);

  const testEngineConnection = useCallback(async (engine: EngineConfig): Promise<boolean> => {
     // Re-implement the same logic as useEngineManager or checkEngineStatus
     // For now, simpler to just assume checkEngineStatus logic is correct and redundant here,
     // but the UI explicitly calls this for feedback.
     
    try {
      let isAvailable = false;

      if (engine.provider === 'ollama') {
        if (!engine.config.host) return false;
        const host = engine.config.host;
        const isLocal = host.includes(window.location.hostname);
        const useProxy = !isLocal || (host.includes('127.0.0.1') && window.location.hostname !== '127.0.0.1');
        
        const url = useProxy ? `/api/engines/proxy/api/tags` : `${host}/api/tags`;
        const headers: Record<string, string> = useProxy ? { 'x-comfy-host': host } : {};

        const response = await fetch(url, { 
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(5000)
        });
        isAvailable = response.ok;
      } else if (engine.provider === 'gemini' || engine.provider === 'openai') {
        isAvailable = !!engine.config.apiKey;
      } else if (engine.provider.startsWith('comfy')) {
        if (!engine.config.host && !engine.config.serverId) return false;
        if (engine.config.host) {
          const host = engine.config.host;
          const isLocal = host.includes(window.location.hostname);
          const useProxy = !isLocal || (host.includes('127.0.0.1') && window.location.hostname !== '127.0.0.1');
          
          const url = useProxy ? `/api/engines/proxy/system_stats` : `${host}/system_stats`;
          const headers: Record<string, string> = useProxy ? { 'x-comfy-host': host } : {};

          const response = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(5000)
          });
          isAvailable = response.ok;
        } else {
          isAvailable = !!engine.config.serverId;
        }
      } else if (engine.provider === 'browser') {
        isAvailable = true;
      }

      return isAvailable;
    } catch (error) {
      console.error(`Failed to test connection for engine ${engine.id}:`, error);
      return false;
    }
  }, []);

  return (
    <EngineContext.Provider value={{
      engines,
      engineStatus,
      availablePresets,
      addEngine,
      updateEngine,
      deleteEngine,
      savePreset,
      loadPreset,
      getEnginesForModule,
      refreshEngineStatus,
      testEngineConnection
    }}>
      {children}
    </EngineContext.Provider>
  );
};
