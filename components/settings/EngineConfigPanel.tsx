import React, { useState } from 'react';
import { Plus, Trash2, Save, Download, Upload, Check, X, Settings as SettingsIcon, Activity } from 'lucide-react';

interface EngineConfig {
  id: string;
  name: string;
  type: 'analysis' | 'image' | 'video' | 'dictation';
  provider: string;
  config: Record<string, any>;
  isEnabled: boolean;
  isDefault?: boolean;
}

interface EngineConfigPanelProps {
  engines: EngineConfig[];
  onAddEngine: (engine: EngineConfig) => void;
  onUpdateEngine: (id: string, engine: EngineConfig) => void;
  onDeleteEngine: (id: string) => void;
  onSavePreset: (engines: EngineConfig[], presetName: string) => void;
  onLoadPreset: (presetName: string) => void;
  onTestConnection: (engine: EngineConfig) => Promise<boolean>;
  availablePresets: string[];
}

const DEFAULT_ENGINE_TEMPLATES = {
  analysis: [
    { provider: 'ollama', label: 'Ollama (Local)', config: { host: 'http://localhost:11434', model: 'llama2' } },
    { provider: 'gemini', label: 'Google Gemini', config: { apiKey: '', model: 'gemini-pro' } },
    { provider: 'openai', label: 'OpenAI', config: { apiKey: '', model: 'gpt-4' } },
  ],
  image: [
    { provider: 'comfy-local', label: 'ComfyUI (Local)', config: { host: 'http://127.0.0.1:8188' } },
    { provider: 'comfy-runpod', label: 'ComfyUI (RunPod)', config: { serverId: '', apiKey: '' } },
    { provider: 'dalle', label: 'DALL-E', config: { apiKey: '' } },
  ],
  video: [
    { provider: 'comfy-svd', label: 'ComfyUI SVD (Local)', config: { host: 'http://127.0.0.1:8188', workflow: 'svd' } },
    { provider: 'veo', label: 'Google Veo', config: { apiKey: '' } },
    { provider: 'runway', label: 'Runway ML', config: { apiKey: '' } },
  ],
  dictation: [
    { provider: 'browser-local', label: 'Browser (Local)', config: { language: 'en-US' } },
    { provider: 'groq', label: 'Groq Whisper', config: { apiKey: '', model: 'whisper-large-v3' } },
    { provider: 'openai-whisper', label: 'OpenAI Whisper', config: { apiKey: '', model: 'whisper-1' } },
  ],
};

const EngineConfigPanel: React.FC<EngineConfigPanelProps> = ({
  engines,
  onAddEngine,
  onUpdateEngine,
  onDeleteEngine,
  onSavePreset,
  onLoadPreset,
  onTestConnection,
  availablePresets,
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEngine, setEditingEngine] = useState<EngineConfig | null>(null);
  const [selectedType, setSelectedType] = useState<'analysis' | 'image' | 'video' | 'dictation'>('analysis');
  const [presetName, setPresetName] = useState('');
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [testingEngines, setTestingEngines] = useState<Set<string>>(new Set());
  const [engineStatus, setEngineStatus] = useState<Map<string, boolean>>(new Map());

  const handleAddEngine = (template: typeof DEFAULT_ENGINE_TEMPLATES.analysis[0]) => {
    const newEngine: EngineConfig = {
      id: `${template.provider}-${Date.now()}`,
      name: template.label,
      type: selectedType,
      provider: template.provider,
      config: { ...template.config },
      isEnabled: true,
    };
    onAddEngine(newEngine);
    setShowAddDialog(false);
  };

  const handleSaveEngine = () => {
    if (editingEngine) {
      onUpdateEngine(editingEngine.id, editingEngine);
      setEditingEngine(null);
    }
  };

  const handleTestConnection = async (engine: EngineConfig) => {
    setTestingEngines(prev => new Set(prev).add(engine.id));
    try {
      const isAvailable = await onTestConnection(engine);
      setEngineStatus(prev => new Map(prev).set(engine.id, isAvailable));
    } catch (error) {
      setEngineStatus(prev => new Map(prev).set(engine.id, false));
    } finally {
      setTestingEngines(prev => {
        const newSet = new Set(prev);
        newSet.delete(engine.id);
        return newSet;
      });
    }
  };

  const getEngineStatusColor = (engine: EngineConfig) => {
    if (testingEngines.has(engine.id)) return 'bg-yellow-500 animate-pulse';
    const status = engineStatus.get(engine.id);
    if (status === undefined) return 'bg-gray-500'; // Not tested yet
    return status ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500';
  };

  const enginesByType = {
    analysis: engines.filter(e => e.type === 'analysis'),
    image: engines.filter(e => e.type === 'image'),
    video: engines.filter(e => e.type === 'video'),
    dictation: engines.filter(e => e.type === 'dictation'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-main">Engine Connections</h3>
          <p className="text-sm text-dim mt-1">Configure AI engines for analysis, image, video generation, and voice transcription</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPresetDialog(true)}
            className="px-3 py-2 bg-card hover:bg-hover rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Presets
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-black text-xs font-bold uppercase flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Engine
          </button>
        </div>
      </div>

      {/* Engine Lists by Type */}
      {(['analysis', 'image', 'video', 'dictation'] as const).map((type) => (
        <div key={type} className="space-y-3">
          <h4 className="text-sm font-bold text-main uppercase tracking-wider">
            {type === 'analysis' ? 'Analysis Engines' : 
             type === 'image' ? 'Image Engines' : 
             type === 'video' ? 'Video Engines' : 
             'Dictation Engines'}
          </h4>
          
          {enginesByType[type].length > 0 ? (
            <div className="space-y-2">
              {enginesByType[type].map((engine) => (
                <div
                  key={engine.id}
                  className="bg-surface border border-subtle rounded-lg p-4 hover:border-subtle-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-3 h-3 rounded-full ${getEngineStatusColor(engine)}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-main">{engine.name}</span>
                          {engine.isDefault && (
                            <span className="text-[9px] px-2 py-0.5 bg-cyan-900/30 text-cyan-400 rounded uppercase font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-mono">{engine.provider}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestConnection(engine)}
                        disabled={testingEngines.has(engine.id)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                        title="Test Connection"
                      >
                        <Activity className={`w-4 h-4 text-dim ${testingEngines.has(engine.id) ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => setEditingEngine(engine)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        title="Configure"
                      >
                        <SettingsIcon className="w-4 h-4 text-dim" />
                      </button>
                      <button
                        onClick={() => onDeleteEngine(engine.id)}
                        className="p-2 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-subtle rounded-lg p-6 text-center">
              <p className="text-sm text-slate-500">No {type} engines configured</p>
            </div>
          )}
        </div>
      ))}

      {/* Add Engine Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-app/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-subtle-accent rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-subtle">
              <h3 className="text-xl font-bold text-main">Add New Engine</h3>
              <p className="text-sm text-dim mt-1">Select an engine type and provider</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Type Selection */}
              <div>
                <label className="text-sm font-bold text-main mb-2 block">Engine Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['analysis', 'image', 'video', 'dictation'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${
                        selectedType === type
                          ? 'bg-cyan-600 text-black'
                          : 'bg-card text-dim hover:bg-hover'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Templates */}
              <div>
                <label className="text-sm font-bold text-main mb-2 block">Select Provider</label>
                <div className="grid grid-cols-1 gap-2">
                  {DEFAULT_ENGINE_TEMPLATES[selectedType].map((template) => (
                    <button
                      key={template.provider}
                      onClick={() => handleAddEngine(template)}
                      className="bg-card hover:bg-hover border border-subtle rounded-lg p-4 text-left transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-main">{template.label}</div>
                          <div className="text-xs text-slate-500 font-mono mt-1">{template.provider}</div>
                        </div>
                        <Plus className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-subtle flex justify-end">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 bg-card hover:bg-hover rounded-lg text-sm font-bold uppercase transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Engine Dialog */}
      {editingEngine && (
        <div className="fixed inset-0 bg-app/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-subtle-accent rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-subtle">
              <h3 className="text-xl font-bold text-main">Configure Engine</h3>
              <p className="text-sm text-dim mt-1">{editingEngine.name}</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Engine Name */}
              <div>
                <label className="text-sm font-bold text-main mb-2 block">Engine Name</label>
                <input
                  type="text"
                  value={editingEngine.name}
                  onChange={(e) => setEditingEngine({ ...editingEngine, name: e.target.value })}
                  className="w-full bg-app border border-subtle rounded-lg px-4 py-2 text-main focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-main">Enabled</label>
                <button
                  onClick={() => setEditingEngine({ ...editingEngine, isEnabled: !editingEngine.isEnabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    editingEngine.isEnabled ? 'bg-green-600' : 'bg-hover'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    editingEngine.isEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              {/* Configuration Fields */}
              <div>
                <label className="text-sm font-bold text-main mb-2 block">Configuration</label>
                <div className="space-y-3">
                  {Object.entries(editingEngine.config).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-xs text-dim mb-1 block capitalize">{key}</label>
                      <input
                        type={key.toLowerCase().includes('key') || key.toLowerCase().includes('password') ? 'password' : 'text'}
                        value={value as string}
                        onChange={(e) => setEditingEngine({
                          ...editingEngine,
                          config: { ...editingEngine.config, [key]: e.target.value }
                        })}
                        className="w-full bg-app border border-subtle rounded-lg px-3 py-2 text-sm text-main focus:border-cyan-500 focus:outline-none font-mono"
                        placeholder={`Enter ${key}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-subtle flex justify-end gap-2">
              <button
                onClick={() => setEditingEngine(null)}
                className="px-4 py-2 bg-card hover:bg-hover rounded-lg text-sm font-bold uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEngine}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-black text-sm font-bold uppercase flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Dialog */}
      {showPresetDialog && (
        <div className="fixed inset-0 bg-app/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-subtle-accent rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-subtle">
              <h3 className="text-xl font-bold text-main">Engine Presets</h3>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Save Current as Preset */}
              <div>
                <label className="text-sm font-bold text-main mb-2 block">Save Current Configuration</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name..."
                    className="flex-1 bg-app border border-subtle rounded-lg px-3 py-2 text-sm text-main focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (presetName.trim()) {
                        onSavePreset(engines, presetName);
                        setPresetName('');
                      }
                    }}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-black text-sm font-bold uppercase transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Load Preset */}
              {availablePresets.length > 0 && (
                <div>
                  <label className="text-sm font-bold text-main mb-2 block">Load Preset</label>
                  <div className="space-y-2">
                    {availablePresets.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          onLoadPreset(preset);
                          setShowPresetDialog(false);
                        }}
                        className="w-full bg-card hover:bg-hover border border-subtle rounded-lg p-3 text-left transition-colors flex items-center justify-between group"
                      >
                        <span className="text-sm text-main">{preset}</span>
                        <Upload className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-subtle flex justify-end">
              <button
                onClick={() => setShowPresetDialog(false)}
                className="px-4 py-2 bg-card hover:bg-hover rounded-lg text-sm font-bold uppercase transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngineConfigPanel;
