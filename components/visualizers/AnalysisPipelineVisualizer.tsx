import React from 'react';
import { ArrowRight, Circle, CheckCircle, Clock, Database, Brain, Sparkles, FileText, Code } from 'lucide-react';
import { AnalysisLayer, DreamAnalysis } from '../../types';

interface AnalysisPipelineVisualizerProps {
  layers: AnalysisLayer[];
  currentLayerId?: string;
  isAnalyzing: boolean;
  finalAnalysis: DreamAnalysis | null;
}

const AnalysisPipelineVisualizer: React.FC<AnalysisPipelineVisualizerProps> = ({ 
  layers, 
  currentLayerId, 
  isAnalyzing,
  finalAnalysis 
}) => {
  
  const getLayerIcon = (role: string) => {
      const lower = role.toLowerCase();
      if (lower.includes('enhance')) return Sparkles;
      if (lower.includes('critic')) return Brain;
      if (lower.includes('format')) return Code;
      if (lower.includes('symbol')) return FileText;
      return Circle;
  };

  return (
    <div className="w-full bg-app border border-subtle rounded-xl p-6 overflow-x-auto">
      <h4 className="text-xs font-bold text-dim uppercase tracking-wider mb-6 flex items-center gap-2">
        <Database className="w-4 h-4" /> Live Analysis Pipeline
      </h4>

      <div className="flex items-center min-w-max gap-4 p-4">
        
        {/* Start Node */}
        <div className="flex flex-col items-center gap-2 opacity-50">
            <div className="w-10 h-10 rounded-full bg-hover border-2 border-subtle flex items-center justify-center">
                <span className="text-[10px] font-bold text-dim">RAW</span>
            </div>
            <span className="text-[10px] text-dim font-mono">Input</span>
        </div>

        {/* Dynamic Layers */}
        {layers.map((layer, index) => {
            const Icon = getLayerIcon(layer.role);
            const isActive = currentLayerId === layer.id && isAnalyzing;
            const isPast = !isActive && isAnalyzing && layers.findIndex(l => l.id === currentLayerId) > index; 
            const isComplete = !isAnalyzing && finalAnalysis; // Assuming simpler completion logic for now

            // Determine State Color
            let borderColor = "border-subtle";
            let bgColor = "bg-card";
            let textColor = "text-dim";
            let glow = "";

            if (isActive) {
                borderColor = "border-purple-500";
                bgColor = "bg-purple-900/20";
                textColor = "text-purple-400";
                glow = "shadow-[0_0_20px_rgba(168,85,247,0.4)]";
            } else if (isPast || isComplete) {
                borderColor = "border-green-500/50";
                bgColor = "bg-green-900/10";
                textColor = "text-green-500";
            }

            return (
                <React.Fragment key={layer.id}>
                    {/* Arrow Connector */}
                    <div className={`transition-all duration-500 ${isActive ? 'text-purple-500 opacity-100' : 'text-dim opacity-50'}`}>
                        <ArrowRight className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                    </div>

                    {/* Node */}
                    <div className={`
                        relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-500
                        ${borderColor} ${bgColor} ${glow} min-w-[120px]
                    `}>
                        {isActive && (
                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 rounded-full animate-ping" />
                        )}
                        
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-purple-500 text-white' : 'bg-white/5 ' + textColor}`}>
                            {isActive ? <Clock className="w-5 h-5 animate-spin" /> : 
                             (isPast || isComplete) ? <CheckCircle className="w-5 h-5" /> : 
                             <Icon className="w-5 h-5" />}
                        </div>

                        <div className="flex flex-col items-center">
                            <span className={`text-xs font-bold uppercase tracking-wide ${textColor}`}>
                                {layer.name}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono mt-1">
                                {layer.config?.provider || 'Unknown'} : {(layer.config?.model || 'default').slice(0, 10)}...
                            </span>
                        </div>
                    </div>
                </React.Fragment>
            );
        })}

        {/* End Node */}
        <div className="text-dim opacity-50"><ArrowRight className="w-5 h-5" /></div>
        
        <div className={`flex flex-col items-center gap-2 transition-opacity duration-500 ${finalAnalysis ? 'opacity-100' : 'opacity-30'}`}>
             <div className="w-10 h-10 rounded-full bg-cyan-900/20 border-2 border-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-[10px] text-cyan-500 font-bold uppercase">JSON Ready</span>
        </div>

      </div>
    </div>
  );
};

export default AnalysisPipelineVisualizer;
