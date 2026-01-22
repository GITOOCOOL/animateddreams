import React from 'react';
import { Settings, Sliders, Activity, Zap, Layers, Image as ImageIcon, Box, X, Download, Code, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ComfySettings, DreamAttachment, WorkflowPreset } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import WorkflowVisualizer from '../visualizers/WorkflowVisualizer';
import WorkflowSettingsPanel from '../settings/WorkflowSettingsPanel';
import SystemSettingsPanel from '../settings/SystemSettingsPanel';
import SaveWorkflowModal from '../settings/SaveWorkflowModal';
import WorkflowLibraryModal from '../settings/WorkflowLibraryModal';
import { generateWorkflowFromParameters, extractParametersFromWorkflow, WorkflowParameters } from '../../services/workflowGenerator';

interface SettingsPanelProps {
  settings: ComfySettings;
  onSettingsChange: (newSettings: ComfySettings) => void;
  onDone: () => void;
  availableModels: string[];
  availableLoras: string[];
  availableIPAdapters?: string[];
  availableSamplers: string[]; // New
  availableSchedulers: string[]; // New
  availableNodeTypes?: string[]; // Discovery
  inputImage?: DreamAttachment;
  
  // Workflow Props
  workflowPresets?: WorkflowPreset[];
  activePresetId?: string;
  onSelectPreset?: (id: string) => void;
  onImportWorkflow?: (json: any, name: string) => void;
  initialTab?: 'workflow' | 'system';
}



const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
    settings, onSettingsChange, onDone, availableModels, availableLoras, 
    availableIPAdapters, availableSamplers, availableSchedulers, availableNodeTypes, inputImage,
    workflowPresets, activePresetId, onSelectPreset, onImportWorkflow,
    initialTab = 'workflow'
}) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'workflow' | 'system'>(initialTab);
  const [showValidation, setShowValidation] = React.useState(false);

  // Safety: Fallback to workflow if initialTab is invalid (e.g. 'gen' left over in state)
  React.useEffect(() => {
    if (activeTab !== 'workflow' && activeTab !== 'system') {
        setActiveTab('workflow');
    }
  }, [activeTab]);
  
  // Workflow Save/Load State
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [showLibraryModal, setShowLibraryModal] = React.useState(false);
  const [showRawJson, setShowRawJson] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  
  // Track Active Loaded Workflow
  const [activeWorkflow, setActiveWorkflow] = React.useState<{ id: string | number, name: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);


  const handleSaveWorkflow = async (name: string, description: string, isUpdate: boolean = false) => {
      const workflowJson = currentWorkflowJson;

      const method = (isUpdate && activeWorkflow) ? 'PUT' : 'POST';
      const url = (isUpdate && activeWorkflow) ? `/api/workflows/${activeWorkflow.id}` : '/api/workflows';

      const res = await fetch(url, {
          method,
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
              id: (isUpdate && activeWorkflow) ? activeWorkflow.id : ((window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `wf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
              name,
              description,
              type: 'image',
              workflow_json: workflowJson,
              thumbnail: null
          })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save workflow (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      if (!isUpdate) {
          setActiveWorkflow({ id: data.id || name, name });
      } else {
          setActiveWorkflow(prev => prev ? { ...prev, name } : null);
      }
      setHasUnsavedChanges(false);
  };

  const handleLoadWorkflow = (workflow: any) => {
      // 1. Extract settings from workflow
      const extracted = extractParametersFromWorkflow(workflow.workflow);
      
      // 2. Merge into current settings
      const newSettings = { ...settings };
      
      if (extracted.model) newSettings.model = extracted.model;
      if (extracted.steps) newSettings.steps = extracted.steps;
      if (extracted.cfg) newSettings.cfg = extracted.cfg;
      if (extracted.sampler) newSettings.sampler = extracted.sampler;
      if (extracted.scheduler) newSettings.scheduler = extracted.scheduler;
      if (extracted.width) newSettings.width = extracted.width;
      if (extracted.height) newSettings.height = extracted.height;
      if (extracted.denoise) newSettings.denoise = extracted.denoise;
      if (extracted.loras) newSettings.loras = extracted.loras;
      
      // 3. Set Active State
      setActiveWorkflow({ id: workflow.id, name: workflow.name });
      setHasUnsavedChanges(false);

      // Notify parent
      onSettingsChange(newSettings);
      setShowLibraryModal(false);
  };

  const handleUnloadWorkflow = () => {
    setActiveWorkflow(null);
    setHasUnsavedChanges(false);
  };
  const handleDownloadActive = () => {
    const params: WorkflowParameters = {
        model: settings.model || "unknown",
        steps: settings.steps,
        cfg: settings.cfg,
        sampler: settings.sampler,
        scheduler: settings.scheduler,
        width: settings.width,
        height: settings.height,
        denoise: settings.denoise,
        positivePrompt: "{positive_prompt}",
        negativePrompt: "{negative_prompt}",
        workflowType: inputImage ? 'img2img' : 'txt2img',
        seed: settings.seed,
        loras: settings.loras
    };
    const json = generateWorkflowFromParameters(params);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animated_dreams_workflow_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentWorkflowJson = React.useMemo(() => {
    const params: WorkflowParameters = {
        model: settings.model || "unknown",
        steps: settings.steps,
        cfg: settings.cfg,
        sampler: settings.sampler,
        scheduler: settings.scheduler,
        width: settings.width,
        height: settings.height,
        denoise: settings.denoise,
        positivePrompt: "{positive_prompt}",
        negativePrompt: "{negative_prompt}",
        workflowType: inputImage ? 'img2img' : 'txt2img',
        seed: settings.seed,
        loras: settings.loras
    };
    return generateWorkflowFromParameters(params);
  }, [settings, inputImage]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(currentWorkflowJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleChange = (key: keyof ComfySettings, value: string | number | boolean) => {
    const newSettings = { ...settings, [key]: value };

    // Auto-sync dimensions if "Use Original Size" is enabled
    if (key === 'useOriginalDimensions' && value === true && inputImage?.width && inputImage?.height) {
        newSettings.width = inputImage.width;
        newSettings.height = inputImage.height;
    }

    onSettingsChange(newSettings);

    // Track unsaved changes if a workflow is loaded
    if (activeWorkflow) {
      setHasUnsavedChanges(true);
    }

    // Clear validation if model is selected
    if (key === 'model' && value) setShowValidation(false);
  };

  const modelOptions = availableModels;
  
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col pr-2">
        
        {/* Helper Navigation */}
        <div className="flex bg-card p-1 rounded-lg border border-subtle shrink-0">
             <button 
                onClick={() => setActiveTab('workflow')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'workflow' ? 'bg-purple-600 text-main shadow-lg' : 'text-dim hover:text-main hover:bg-hover'}`}
             >
                 <Layers className="w-3 h-3" /> Workflow
             </button>
             <button 
                onClick={() => setActiveTab('system')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'system' ? 'bg-slate-600 text-main shadow-lg' : 'text-dim hover:text-main hover:bg-hover'}`}
             >
                 <Settings className="w-3 h-3" /> System
             </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            
            {activeTab === 'system' && <SystemSettingsPanel />}

            {activeTab === 'workflow' && (
            <div className="space-y-8 contents">
            
            {/* 1. Workflow Orchestration (Primary Focus) */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-subtle pb-2 bg-card/30 -mx-2 px-2 py-3 rounded-t-lg">
                    <div className="flex flex-col">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-dim mb-1">
                            Workflow Context
                        </label>
                        {activeWorkflow ? (
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${hasUnsavedChanges ? 'bg-yellow-400 animate-pulse' : 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]'}`} />
                                <span className={`text-xs font-bold ${hasUnsavedChanges ? 'text-yellow-500' : 'text-main'}`}>
                                    {activeWorkflow.name}
                                </span>
                                {hasUnsavedChanges && (
                                    <span className="text-[8px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded font-black border border-yellow-500/20">
                                        MODIFIED
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs font-bold text-dim flex items-center gap-2 italic">
                                <Box className="w-3 h-3" /> Manual Configuration
                            </span>
                        )}
                    </div>
                    
                    {/* Workflow Actions */}
                    <div className="flex gap-1.5">
                        <button 
                            onClick={() => setShowRawJson(true)}
                            className="p-1.5 bg-hover text-dim hover:text-main border border-subtle rounded transition-all"
                            title="View Raw JSON"
                        >
                            <Code className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={handleDownloadActive}
                            className="p-1.5 bg-hover text-dim hover:text-main border border-subtle rounded transition-all"
                            title="Download JSON"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => setShowLibraryModal(true)}
                            className="text-[10px] bg-accent/10 hover:bg-accent/20 text-accent border border-subtle-accent px-3 py-1.5 rounded transition-all font-black uppercase tracking-wider"
                        >
                            Library
                        </button>
                        <button 
                            onClick={() => setShowSaveModal(true)}
                            className={`text-[10px] border px-3 py-1.5 rounded transition-all font-black uppercase tracking-wider shadow-lg ${hasUnsavedChanges ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400' : 'bg-purple-600 text-main border-purple-500 hover:bg-purple-500'}`}
                        >
                           {activeWorkflow ? (hasUnsavedChanges ? 'Update' : 'Save as new') : 'Save'}
                        </button>
                    </div>
                </div>
                
                {activeWorkflow && (
                    <div className="flex items-center justify-between px-2 py-2 bg-accent/5 border border-subtle-accent rounded-lg animate-in fade-in slide-in-from-top-2">
                        <span className="text-[9px] text-dim italic">Changes since last sync: {hasUnsavedChanges ? 'Unsaved' : 'Synced'}</span>
                        <button 
                            onClick={handleUnloadWorkflow}
                            className="text-[9px] font-black text-dim hover:text-red-400 uppercase flex items-center gap-1 transition-colors"
                        >
                            <X className="w-3 h-3" /> Terminate Session
                        </button>
                    </div>
                )}
            </div>

            {/* 2. Neural Engine (Model Architecture) */}
            <div className="space-y-4">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-dim border-b border-subtle pb-2">Neural Engine</h4>
                
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className={`text-[10px] uppercase font-black flex items-center gap-2 ${showValidation && !settings.model ? 'text-red-500' : 'text-accent'}`}>
                             Checkpoint Architecture
                        </label>
                        {showValidation && !settings.model && <span className="text-[8px] text-red-500 font-bold animate-pulse">REQUIRED</span>}
                    </div>
                    <select
                        value={settings.model}
                        onChange={(e) => handleChange('model', e.target.value)}
                        className={`w-full bg-app border rounded-lg p-3 text-xs outline-none transition-all hover:bg-hover 
                            ${showValidation && !settings.model 
                                ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                                : !settings.model 
                                    ? 'border-yellow-500/50 text-yellow-500 anim-pulse' 
                                    : 'border-subtle text-main focus:border-accent'
                            }`}
                    >
                        <option value="" disabled>{availableModels.length > 0 ? "Select Checkpoint..." : "Connecting to Neural Core..."}</option>
                        {availableModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-yellow-500 flex items-center gap-2">
                            <Zap className="w-3 h-3" /> LoRA Adapters
                        </label>
                        <button
                            onClick={() => {
                                const newLoras = [...(settings.loras || [])];
                                newLoras.push({ name: availableLoras[0] || "None", strength: 1.0 });
                                onSettingsChange({ ...settings, loras: newLoras });
                            }}
                            disabled={!availableLoras || availableLoras.length === 0}
                            className="text-[9px] bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            + ADD LORA
                        </button>
                    </div>

                    <div className="space-y-3">
                        {(!settings.loras || settings.loras.length === 0) && (
                            <div className="text-[10px] text-slate-600 italic text-center py-2 border border-dashed border-white/5 rounded-lg">
                                No LoRAs active. Add one to mix styles.
                            </div>
                        )}

                        {settings.loras?.map((lora, index) => (
                            <div key={index} className="bg-card border-subtle">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-bold text-dim">LAYER {index + 1}</span>
                                    <button 
                                        onClick={() => {
                                            const newLoras = settings.loras!.filter((_, i) => i !== index);
                                            onSettingsChange({ ...settings, loras: newLoras });
                                        }}
                                        className="text-slate-600 hover:text-red-500 transition-colors"
                                    >
                                        <div className="w-4 h-4 flex items-center justify-center">×</div>
                                    </button>
                                </div>
                                
                                <select
                                    value={lora.name}
                                    onChange={(e) => {
                                        const newLoras = [...settings.loras!];
                                        newLoras[index].name = e.target.value;
                                        onSettingsChange({ ...settings, loras: newLoras });
                                    }}
                                    className="w-full bg-app border border-subtle rounded-lg p-2 text-xs text-main outline-none focus:border-yellow-500 mb-2"
                                >
                                    {availableLoras && availableLoras.length > 0 ? (
                                        availableLoras.map(l => <option key={l} value={l}>{l}</option>)
                                    ) : (
                                        <option disabled>No LoRAs Found</option>
                                    )}
                                </select>

                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-yellow-500 w-8 text-right font-mono">{lora.strength.toFixed(1)}</span>
                                    <input
                                        type="range" min="0.1" max="2.0" step="0.1"
                                        value={lora.strength}
                                        onChange={(e) => {
                                            const newLoras = [...settings.loras!];
                                            newLoras[index].strength = parseFloat(e.target.value);
                                            onSettingsChange({ ...settings, loras: newLoras });
                                        }}
                                        className="flex-1 accent-yellow-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Inference Parameters */}
            <div className="space-y-4">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-dim border-b border-subtle pb-2">Inference Strategy</h4>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-cyan-500 flex justify-between">
                             <span>Steps</span> <span className="text-main">{settings.steps}</span>
                        </label>
                        <input
                            type="range" min="10" max="100" step="1"
                            value={settings.steps}
                            onChange={(e) => handleChange('steps', parseInt(e.target.value))}
                            className="w-full accent-cyan-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-purple-500 flex justify-between">
                             <span>CFG Scale</span> <span className="text-main">{settings.cfg}</span>
                        </label>
                        <input
                            type="range" min="1" max="20" step="0.5"
                            value={settings.cfg}
                            onChange={(e) => handleChange('cfg', parseFloat(e.target.value))}
                            className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-dim">Sampler</label>
                        <select
                            value={settings.sampler}
                            onChange={(e) => handleChange('sampler', e.target.value)}
                            className="w-full bg-app border border-subtle rounded-lg p-2 text-xs text-main outline-none focus:border-purple-500"
                        >
                            {availableSamplers.length > 0 ? (
                                availableSamplers.map(s => <option key={s} value={s}>{s}</option>)
                            ) : (
                                <option disabled>Loading...</option>
                            )}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-dim">Scheduler</label>
                         <select
                            value={settings.scheduler}
                            onChange={(e) => handleChange('scheduler', e.target.value)}
                            className="w-full bg-app border border-subtle rounded-lg p-2 text-xs text-main outline-none focus:border-purple-500"
                        >
                            {availableSchedulers.length > 0 ? (
                                availableSchedulers.map(s => <option key={s} value={s}>{s}</option>)
                            ) : (
                                <option disabled>Loading...</option>
                            )}
                        </select>
                     </div>
                </div>

                {/* Denoise */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-[10px] uppercase font-bold text-pink-500 flex justify-between">
                         <span>Denoise (Img2Img)</span> <span className="text-main">{settings.denoise}</span>
                    </label>
                    <input
                        type="range" min="0.0" max="1.0" step="0.05"
                        value={settings.denoise !== undefined ? settings.denoise : 0.75}
                        onChange={(e) => handleChange('denoise', parseFloat(e.target.value))}
                        className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                </div>

                {/* Face Match (IP-Adapter) Toggle */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-2">
                            <span>Face Identity Match</span>
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-[8px] text-cyan-400 border border-cyan-400/30">PRO</span>
                        </label>
                        <button
                            onClick={() => handleChange('useIpAdapter', !settings.useIpAdapter)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${settings.useIpAdapter ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transform transition-transform duration-300 ${settings.useIpAdapter ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <p className="text-[9px] text-dim">
                        Uses IP-Adapter to strictly preserve face identity. 
                    </p>
                    
                    {settings.useIpAdapter && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                             <label className="text-[10px] uppercase font-bold text-cyan-500 flex items-center gap-2 mb-1">
                                IP Adapter Model
                            </label>
                            <select
                                value={settings.ipAdapterModel || ""}
                                onChange={(e) => handleChange('ipAdapterModel', e.target.value)}
                                className="w-full bg-cyan-950/30 border border-cyan-500/30 rounded-lg p-2 text-xs text-cyan-100 outline-none focus:border-cyan-400 mb-3"
                            >
                                <option value="" disabled>Select Adapter (Optional)</option>
                                <option value="">Auto-Detect (Based on Preset)</option>
                                {availableIPAdapters && availableIPAdapters.length > 0 ? (
                                    availableIPAdapters.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))
                                ) : (
                                    <option disabled>No Adapters Found</option>
                                )}
                            </select>

                            {/* Preset Selector */}
                            {(!settings.ipAdapterModel) && (() => {
                                   const isSdxl = settings.model?.toLowerCase().includes("sdxl") || settings.model?.toLowerCase().includes("ragnarok");
                                   const isPresetMismatch = isSdxl && (settings.ipAdapterPreset?.includes("STANDARD") || settings.ipAdapterPreset?.includes("LIGHT"));
                                   
                                   const PRESETS = [
                                       "STANDARD / SDXL (ViT-H)",
                                       "SD1.5 ONLY (ViT-G / Plus)",
                                       "PLUS (high strength)",
                                       "PLUS FACE (portraits)",
                                       "LIGHT - SD1.5 only (low strength)",
                                       "FULL FACE - SD1.5 only (portraits stronger)"
                                   ];


                                   return (
                                       <div className="space-y-1 mb-3 animate-in fade-in slide-in-from-top-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] uppercase font-bold text-cyan-500">Adapter Preset</label>
                                                {isPresetMismatch && (
                                                    <div className="flex items-center gap-1 text-[9px] text-red-500 font-bold bg-red-950/50 px-2 py-0.5 rounded border border-red-500/30 animate-pulse">
                                                        <Activity className="w-3 h-3" /> SDXL Conflict
                                                    </div>
                                                )}
                                            </div>
                                            <select
                                                value={settings.ipAdapterPreset || 'STANDARD (medium strength)'}
                                                onChange={(e) => handleChange('ipAdapterPreset', e.target.value)}
                                                className={`w-full bg-black/50 border rounded p-2 text-[10px] text-main outline-none focus:border-cyan-400 transition-colors 
                                                    ${isPresetMismatch ? 'border-red-500 text-red-100 bg-red-900/10' : 'border-white/10'}`}
                                            >
                                                {PRESETS.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                       </div>
                                   );
                               })()}
                            
                            <label className="text-[10px] uppercase font-bold text-cyan-500 flex justify-between mt-3">
                                <span>Face Strength</span> <span className="text-main">{settings.ipAdapterWeight ?? 0.8}</span>
                            </label>
                            <input
                                type="range" min="0.1" max="1.5" step="0.05"
                                value={settings.ipAdapterWeight ?? 0.8}
                                onChange={(e) => handleChange('ipAdapterWeight', parseFloat(e.target.value))}
                                className="w-full accent-cyan-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                            />
                        </div>
                    )}
                </div>
                {/* Original Size Toggle */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-dim flex items-center gap-2">
                            <span>Use Original Size</span>
                        </label>
                        <button
                            onClick={() => handleChange('useOriginalDimensions', !settings.useOriginalDimensions)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${settings.useOriginalDimensions ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transform transition-transform duration-300 ${settings.useOriginalDimensions ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. Output Geometry */}
            <div className="space-y-4">
                 <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-dim border-b border-subtle pb-2">Output Geometry</h4>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-dim flex justify-between">
                            Width <span className="text-main">{settings.width}</span>
                        </label>
                         <input
                            type="range" min="512" max="2048" step="64"
                            value={settings.width}
                            onChange={(e) => handleChange('width', parseInt(e.target.value))}
                            className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-dim flex justify-between">
                            Height <span className="text-main">{settings.height}</span>
                        </label>
                         <input
                            type="range" min="512" max="2048" step="64"
                            value={settings.height}
                            onChange={(e) => handleChange('height', parseInt(e.target.value))}
                            className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>
                 </div>
            </div>
            
            {/* End of Gen Tab */}
            </div>
            )}
            
        </div>

        {/* Modals */}
        <SaveWorkflowModal 
            isOpen={showSaveModal} 
            onClose={() => setShowSaveModal(false)} 
            onSave={handleSaveWorkflow}
            initialData={activeWorkflow ? { name: activeWorkflow.name } : undefined}
            allowUpdate={!!activeWorkflow}
        />
        <WorkflowLibraryModal 
            isOpen={showLibraryModal} 
            onClose={() => setShowLibraryModal(false)} 
            onLoad={handleLoadWorkflow} 
            onImport={onImportWorkflow}
        />

        {/* Local Raw JSON Viewer Overlay */}
        <AnimatePresence>
            {showRawJson && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-black/90 backdrop-blur-md"
                >
                    <motion.div 
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="w-full max-w-4xl bg-surface border border-subtle rounded-2xl flex flex-col max-h-full shadow-3xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-subtle flex items-center justify-between bg-card">
                            <div>
                                <h4 className="text-main font-bold flex items-center gap-2">
                                    <Code className="w-4 h-4 text-cyan-400" />
                                    Active Generator Workflow
                                </h4>
                                <p className="text-xs text-dim mt-1">Real-time API JSON payload based on current settings</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleCopyJson}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-main rounded-lg transition-all"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-cyan-500" />}
                                    {copied ? 'COPIED!' : 'COPY JSON'}
                                </button>
                                <button 
                                    onClick={() => setShowRawJson(false)}
                                    className="p-2 text-dim hover:text-main transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden p-6 bg-black/20">
                            <div className="bg-app/20 rounded-xl border border-subtle p-4 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed text-cyan-50/70 opacity-80">
                                <pre>{JSON.stringify(currentWorkflowJson, null, 2)}</pre>
                            </div>
                        </div>
                        <div className="bg-card border-t border-subtle text-center">
                            <button 
                                onClick={handleDownloadActive}
                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-main text-xs font-bold rounded-lg transition-all shadow-lg"
                            >
                                DOWNLOAD FILE
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default SettingsPanel;
