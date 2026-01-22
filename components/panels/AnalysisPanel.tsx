import React from 'react';
import { DreamAnalysis } from '../../types';
import { BrainCircuit, Loader2, Sparkles, Terminal, Activity, X, Settings } from 'lucide-react';
import AnalysisCard from '../shared/AnalysisCard';
import EngineSelector from '../shared/EngineSelector';
import ProgressBar from '../shared/ProgressBar';
import AnalysisPipelineVisualizer from '../visualizers/AnalysisPipelineVisualizer';
import { motion, AnimatePresence } from 'framer-motion';

interface AnalysisPanelProps {
  analysis: DreamAnalysis | null;
  isLoading: boolean;
  status: string;
  editablePrompt?: string;
  onPromptChange?: (val: string) => void;
  onAnalyze?: () => void;
  
  // Engine Selection (New unified system)
  availableEngines?: Array<{
    id: string;
    name: string;
    type: 'analysis' | 'image' | 'video' | 'dictation';
    isAvailable: boolean;
    isConfigured: boolean;
  }>;
  selectedEngineId?: string | null;
  onSelectEngine?: (engineId: string) => void;
  
  onConfigureAnalysis?: () => void;
  
  // Progress & Pipeline
  analysisProgress?: number;
  onCancelAnalysis?: () => void;
  analysisPipeline?: any;
  currentLayerId?: string;
  
  // Input validation
  canAnalyze?: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
    analysis, 
    isLoading, 
    status,
    editablePrompt, 
    onPromptChange,
    onAnalyze,
    availableEngines = [],
    selectedEngineId,
    onSelectEngine,
    onConfigureAnalysis,
    analysisProgress,
    onCancelAnalysis,
    analysisPipeline,
    currentLayerId,
    canAnalyze = true
}) => {
  return (
    <div className="flex flex-col gap-4 h-full">
        {/* Module Header */}
        <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-widest uppercase flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
                <span>Prompt Analysis Module</span>
            </h3>
            {isLoading && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
        </div>
        
        {/* Analysis Progress Bar */}
        {isLoading && analysisProgress !== undefined && (
            <div className="mb-4 px-1">
                <ProgressBar 
                    progress={analysisProgress} 
                    label="ANALYZING TEXT PATTERNS" 
                    statusText={status || 'Processing...'}
                    color="purple"
                />
                
                {onCancelAnalysis && (
                    <div className="mt-2 flex items-center justify-end">
                        <button
                            onClick={onCancelAnalysis}
                            className="text-[10px] font-bold uppercase text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                            <X className="w-3 h-3" /> Cancel Analysis
                        </button>
                    </div>
                )}

                {/* Live Pipeline Visualizer */}
                {analysisPipeline && (
                    <div className="mt-4 bg-surface border border-subtle rounded-xl p-4 shadow-lg shadow-purple-900/5 animate-in slide-in-from-top-2">
                        <AnalysisPipelineVisualizer 
                            layers={analysisPipeline.layers} 
                            currentLayerId={currentLayerId}
                            isAnalyzing={isLoading}
                            finalAnalysis={analysis}
                        />
                    </div>
                )}
            </div>
        )}
        
        {/* Module Content */}
        <div className="flex-1 relative">
            <AnimatePresence mode="wait">
                {analysis ? (
                    <motion.div 
                        key="content"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <AnalysisCard 
                            analysis={analysis}
                            editablePrompt={editablePrompt}
                            onPromptChange={onPromptChange}
                        />
                    </motion.div>
                ) : (
                    <motion.div 
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group relative bg-card border border-subtle rounded-2xl overflow-hidden min-h-[150px] flex items-center justify-center transition-all bg-[url('/grid-pattern.png')]"
                    >
                         <div className="text-center p-6 opacity-40 group-hover:opacity-60 transition-opacity">
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                                    <p className="text-cyan-600 dark:text-cyan-400 font-mono text-[10px] uppercase tracking-widest leading-relaxed animate-pulse">
                                        {status || "Processing Neural Inputs..."}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-hover rounded-full flex items-center justify-center border border-subtle">
                                        <Terminal className="w-5 h-5 text-dim" />
                                    </div>
                                    <p className="text-dim font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                                        [ Awaiting Linguistic Input ]
                                    </p>
                                </div>
                            )}
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Control Bar */}
        <div className="flex items-center gap-3 p-1">
            {/* Model & Config */}
            <div className="flex-1 bg-surface border border-subtle rounded-lg px-2 py-2 flex items-center justify-between relative group/config">
                <div className="flex items-center gap-2">
                     <span className="text-[9px] text-dim font-mono uppercase hidden sm:block mr-2">Engine:</span>
                    {/* Engine Selector Dropdown */}
                    {onSelectEngine && availableEngines.length > 0 ? (
                        <EngineSelector
                            engines={availableEngines}
                            selectedEngineId={selectedEngineId || null}
                            onSelectEngine={onSelectEngine}
                            moduleType="analysis"
                        />
                    ) : (
                         <span className="text-xs text-red-500 font-mono">No Engines</span>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Settings Wheel */}
                    {onConfigureAnalysis && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onConfigureAnalysis();
                            }}
                            className="text-dim hover:text-main bg-hover p-2 rounded-lg transition-all"
                            title="Configuration"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Analyze Action */}
            {onAnalyze && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isLoading && canAnalyze) {
                            onAnalyze();
                        }
                    }}
                    disabled={!canAnalyze || isLoading}
                    className={`
                        h-full px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2
                        ${canAnalyze && !isLoading
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                            : 'bg-card text-dim cursor-not-allowed'}
                    `}
                >
                    {isLoading ? <Activity className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isLoading ? 'ANALYZING' : 'ANALYZE'}
                </button>
            )}
        </div>
    </div>
  );
};

export default AnalysisPanel;
