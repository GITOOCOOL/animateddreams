import React from 'react';
import { DreamAnalysis } from '../types';
import { BrainCircuit, Sparkles, Tag, Quote, Terminal } from 'lucide-react';

interface AnalysisCardProps {
  analysis: DreamAnalysis;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis }) => {
  return (
    <div className="relative group animate-fade-in">
      {/* Glow Backdrop */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-black border border-cyan-500/30 rounded-lg p-6 shadow-2xl overflow-hidden">
        {/* Decorative Header Line */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-6">
           <h2 className="text-3xl font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
             {analysis.title}
           </h2>
           <Terminal className="w-5 h-5 text-cyan-600 animate-pulse" />
        </div>

        {/* Summary */}
        <div className="mb-8 relative pl-4 border-l-2 border-purple-500">
          <p className="text-slate-300 italic font-light text-lg">
            "{analysis.summary}"
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Interpretation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-xs tracking-wider">
              <BrainCircuit className="w-4 h-4" />
              <span>Neural Interpretation</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed border border-slate-800 bg-slate-900/50 p-3 rounded">
              {analysis.interpretation}
            </p>
          </div>

          {/* Symbolism */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-pink-500 font-bold uppercase text-xs tracking-wider">
              <Tag className="w-4 h-4" />
              <span>Extracted Tokens</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.symbolism.map((symbol, idx) => (
                <span 
                  key={idx} 
                  className="px-2 py-1 bg-pink-900/20 border border-pink-500/40 text-pink-300 text-xs font-mono uppercase hover:bg-pink-500/20 transition-colors cursor-default"
                >
                  #{symbol}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* Visual Prompt Terminal */}
        <div className="bg-black border border-slate-800 rounded p-4 font-mono text-xs relative">
          <div className="absolute top-0 left-0 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 uppercase tracking-wider">
            Prompt_Stream_Output
          </div>
          <div className="flex items-start gap-3 mt-2 text-emerald-400/80">
            <span className="mt-1">$</span>
            <p className="opacity-90 leading-relaxed">
              {analysis.visualPrompt}
              <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 animate-pulse align-middle"></span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisCard;