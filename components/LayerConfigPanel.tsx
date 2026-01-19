import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, Sparkles, Brain, Bot, FileText, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { AnalysisLayer, AgentConfig } from '../types';
import { LAYER_PRESETS } from '../constants/presets';

interface LayerConfigPanelProps {
  layers: AnalysisLayer[];
  onUpdateLayers: (layers: AnalysisLayer[]) => void;
  availableOllamaModels: string[];
}

// Draggable Item Component
const SortableLayerItem: React.FC<{ 
  layer: AnalysisLayer, 
  index: number,
  onRemove: (id: string) => void, 
  onUpdate: (id: string, updates: Partial<AnalysisLayer>) => void,
  availableOllamaModels: string[]
}> = ({ 
  layer, 
  index,
  onRemove, 
  onUpdate, 
  availableOllamaModels 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [expanded, setExpanded] = useState(false);

  const handleConfigChange = (key: keyof AgentConfig, value: any) => {
      onUpdate(layer.id, { config: { ...layer.config, [key]: value } });
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-[#1a1a1c] border border-white/5 rounded-xl mb-3 overflow-hidden transition-colors hover:border-white/10 group">
      {/* Header / Drag Handle */}
      <div className="flex items-center p-3 gap-3 bg-black/20">
        <button {...attributes} {...listeners} className="text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5" />
        </button>
        
        <div className="flex-1 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${layer.enabled ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                <span className="text-xs font-bold">{index + 1}</span>
            </div>
            
            <input 
                value={layer.name}
                onChange={(e) => onUpdate(layer.id, { name: e.target.value })}
                className="bg-transparent text-sm font-bold text-slate-200 outline-none placeholder:text-slate-600 w-full"
                placeholder="Layer Name"
            />
        </div>

        <div className="flex items-center gap-1">
             <button 
                onClick={() => setExpanded(!expanded)} 
                className="p-2 text-slate-500 hover:text-white transition-colors"
            >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
            </button>
            <button 
                onClick={() => onRemove(layer.id)} 
                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                title="Remove Layer"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Expanded Config */}
      {expanded && (
          <div className="p-4 space-y-4 border-t border-white/5 bg-black/10 animate-in slide-in-from-top-1">
              
              <div className="grid grid-cols-2 gap-4">
                  {/* Engine Selector */}
                  <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-slate-500">Engine</label>
                       <select 
                            value={layer.config.provider}
                            onChange={(e) => handleConfigChange('provider', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-purple-500"
                        >
                            <option value="ollama">Ollama (Local)</option>
                            <option value="gemini">Gemini (Cloud)</option>
                            <option value="raw">Raw (Pass-through)</option>
                        </select>
                  </div>

                   {/* Model Selector */}
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-slate-500">Model</label>
                       {layer.config.provider === 'ollama' ? (
                            <select 
                                value={layer.config.model}
                                onChange={(e) => handleConfigChange('model', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-purple-500"
                            >
                                {availableOllamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                       ) : layer.config.provider === 'gemini' ? (
                           <select 
                                value={layer.config.model}
                                onChange={(e) => handleConfigChange('model', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-purple-500"
                            >
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                <option value="gemini-pro">Gemini Pro</option>
                            </select>
                       ) : (
                           <div className="w-full bg-black/50 border border-white/5 rounded-lg p-2 text-xs text-slate-600 italic">
                               N/A (Raw Mode)
                           </div>
                       )}
                  </div>
              </div>

               {/* System Prompt */}
               {layer.config.provider !== 'raw' && (
                   <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between">
                            System Prompt / Instructions
                            <span className="text-purple-500/50 text-[9px]">INSTRUCT Mode</span>
                        </label>
                        <textarea 
                            value={layer.config.systemPrompt || ''}
                            onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs font-mono text-slate-300 outline-none focus:border-purple-500 min-h-[100px]"
                            placeholder="You are an expert..."
                        />
                   </div>
               )}

              {/* Temp Slider */}
              {layer.config.provider !== 'raw' && (
                 <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between">
                         Creativity (Temp) <span className="text-white">{layer.config.temperature}</span>
                    </label>
                    <input 
                        type="range" min="0" max="1" step="0.1"
                        value={layer.config.temperature}
                        onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                        className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                 </div>
              )}

          </div>
      )}
    </div>
  );
};


const LayerConfigPanel: React.FC<LayerConfigPanelProps> = ({ layers, onUpdateLayers, availableOllamaModels }) => {
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
        const oldIndex = layers.findIndex((l) => l.id === active.id);
        const newIndex = layers.findIndex((l) => l.id === over.id);
        onUpdateLayers(arrayMove(layers, oldIndex, newIndex));
    }
  };

  const addLayer = (preset?: Partial<AnalysisLayer>) => {
    // Robust UUID generator safe for all contexts
    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const newLayer: AnalysisLayer = {
        id: generateId(), 
        name: preset?.name || "New Analysis Layer",
        role: preset?.role || "Processor",
        enabled: true,
        config: {
            provider: preset?.config?.provider || 'ollama',
            model: preset?.config?.model || availableOllamaModels[0] || 'llama3:latest',
            temperature: preset?.config?.temperature ?? 0.7,
            systemPrompt: preset?.config?.systemPrompt || "Analyze the previous output and refine it."
        }
    };
    onUpdateLayers([...layers, newLayer]);
  };

  const removeLayer = (id: string) => {
      onUpdateLayers(layers.filter(l => l.id !== id));
  };

  const updateLayer = (id: string, updates: Partial<AnalysisLayer>) => {
      onUpdateLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  return (
    <div className="flex flex-col h-full">
        <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 tracking-widest uppercase mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" /> Analysis Pipeline Stack
        </h3>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={layers.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {layers.map((layer, index) => (
                        <SortableLayerItem 
                            key={layer.id} 
                            layer={layer} 
                            index={index}
                            onRemove={removeLayer}
                            onUpdate={updateLayer}
                            availableOllamaModels={availableOllamaModels}
                        />
                    ))}
                </SortableContext>
            </DndContext>
            
            {layers.length === 0 && (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-slate-500 text-xs">
                    Pipeline is empty. Add a layer to start.
                </div>
            )}
        </div>

        <div className="relative mt-4">
            <div className="absolute inset-x-0 bottom-full mb-2 bg-[#1a1a1c] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-in slide-in-from-bottom-2 hidden group-focus-within:block data-[open=true]:block">
                 {/* This would be a dropdown, but for simplicity let's just make a grid of buttons for now or a select */}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                 {LAYER_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => addLayer(preset)}
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-left transition-colors flex flex-col gap-1 group"
                      >
                           <span className="text-[10px] font-bold uppercase text-purple-400 group-hover:text-purple-300">{preset.role}</span>
                           <span className="text-xs font-medium text-slate-300">{preset.name}</span>
                      </button>
                 ))}
                 <button
                    onClick={() => addLayer()}
                    className="col-span-2 p-3 bg-white/5 hover:bg-white/10 border border-white/5 border-dashed rounded-lg text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                 >
                     <Plus className="w-4 h-4" /> Custom Blank Layer
                 </button>
            </div>
    </div>
    </div>
  );
};

export default LayerConfigPanel;
