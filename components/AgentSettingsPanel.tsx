import React from 'react';
import { AnalysisPipeline, AnalysisLayer, DreamAnalysis } from '../types';
import LayerConfigPanel from './LayerConfigPanel';
import AnalysisPipelineVisualizer from './AnalysisPipelineVisualizer';
import { Sparkles, Brain, Code } from 'lucide-react';

interface AgentSettingsPanelProps {
  pipeline: AnalysisPipeline;
  onPipelineChange: (newPipeline: AnalysisPipeline) => void;
  availableOllamaModels: string[];
  currentLayerId?: string;
  isAnalyzing: boolean;
  finalAnalysis: DreamAnalysis | null;
}

const AgentSettingsPanel: React.FC<AgentSettingsPanelProps> = ({ 
    pipeline, 
    onPipelineChange, 
    availableOllamaModels,
    currentLayerId,
    isAnalyzing,
    finalAnalysis
}) => {
  
  const handleUpdateLayers = (newLayers: AnalysisLayer[]) => {
      onPipelineChange({ ...pipeline, layers: newLayers });
  };

  return (
    <div className="flex flex-col h-full gap-4">
       
       <div className="flex-1 min-h-0 bg-[#0F0F11] border border-white/5 rounded-xl p-4 overflow-hidden shadow-2xl shadow-purple-900/5">
           <LayerConfigPanel 
                layers={pipeline.layers} 
                onUpdateLayers={handleUpdateLayers}
                availableOllamaModels={availableOllamaModels}
           />
       </div>

       <div className="h-auto shrink-0 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-100">
           <AnalysisPipelineVisualizer 
                layers={pipeline.layers} 
                currentLayerId={currentLayerId}
                isAnalyzing={isAnalyzing}
                finalAnalysis={finalAnalysis}
           />
       </div>
    </div>
  );
};

export default AgentSettingsPanel;
