import React from 'react';
import { ComfySettings } from '../types';
import { ArrowRight, Box, Type, Activity, Image as ImageIcon, FileImage, Cpu, Zap } from 'lucide-react';

interface WorkflowVisualizerProps {
  settings: ComfySettings;
  workflowType: 'Text-to-Image' | 'Image-to-Image';
}

const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({ settings, workflowType }) => {
  return (
    <div className="w-full bg-slate-950/50 rounded-lg border border-slate-800 p-4 space-y-4 font-mono text-xs overflow-x-auto">
      <div className="flex items-center text-slate-500 uppercase tracking-widest mb-2 gap-2">
        <Activity className="w-3 h-3 text-cyan-500" />
        Workflow Pipeline Visualization
      </div>
      
      <div className="flex items-center gap-2 min-w-max">
        
        {/* Step 1: Input/Model */}
        <div className="flex flex-col items-center gap-2">
           <div className={`p-3 rounded border ${workflowType === 'Image-to-Image' ? 'border-pink-500/50 bg-pink-900/10' : 'border-cyan-500/50 bg-cyan-900/10'} w-32`}>
              <div className="flex items-center gap-2 mb-1 text-slate-300">
                <Box className="w-3 h-3" />
                <span className="font-bold truncate">{workflowType === 'Image-to-Image' ? 'Load Image' : 'Empty Latent'}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                 {workflowType === 'Image-to-Image' ? 'User Upload' : `${settings.width}x${settings.height}`}
              </div>
           </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-700 mx-1 flex-shrink-0" />

        {/* Step 2: Checkpoint */}
        <div className="flex flex-col items-center gap-2">
           <div className="p-3 rounded border border-purple-500/50 bg-purple-900/10 w-40">
              <div className="flex items-center gap-2 mb-1 text-slate-300">
                <Cpu className="w-3 h-3" />
                <span className="font-bold">Checkpoint</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate" title={settings.model}>
                 {settings.model}
              </div>
           </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-700 mx-1 flex-shrink-0" />

        {/* Dynamic LoRA Step */}
        {settings.lora && settings.lora !== 'None' && (
            <>
                <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                <div className="p-3 rounded border border-yellow-500/50 bg-yellow-900/10 w-36">
                    <div className="flex items-center gap-2 mb-1 text-slate-300">
                        <Zap className="w-3 h-3 text-yellow-500" />
                        <span className="font-bold">LoRA</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate" title={settings.lora}>
                        {settings.lora}
                    </div>
                    <div className="text-[9px] text-yellow-500/80 mt-1">
                        Strength: {settings.loraStrength}
                    </div>
                </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-700 mx-1 flex-shrink-0" />
            </>
        )}

        {/* Step 3: Prompt */}
        <div className="flex flex-col items-center gap-2">
           <div className="p-3 rounded border border-green-500/50 bg-green-900/10 w-32">
              <div className="flex items-center gap-2 mb-1 text-slate-300">
                <Type className="w-3 h-3" />
                <span className="font-bold">CLIP Text</span>
              </div>
              <div className="text-[10px] text-slate-500">
                 Pos / Neg
              </div>
           </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-700 mx-1 flex-shrink-0" />

        {/* Step 4: KSampler */}
        <div className="flex flex-col items-center gap-2">
           <div className="p-3 rounded border border-orange-500/50 bg-orange-900/10 w-40">
              <div className="flex items-center gap-2 mb-1 text-slate-300">
                <Activity className="w-3 h-3" />
                <span className="font-bold">KSampler</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-500">
                 <span>Step: {settings.steps}</span>
                 <span>CFG: {settings.cfg}</span>
                 <span className="col-span-2 truncate">{settings.sampler}</span>
              </div>
           </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-700 mx-1 flex-shrink-0" />

        {/* Step 5: VAE Decode */}
        <div className="flex flex-col items-center gap-2">
           <div className="p-3 rounded border border-blue-500/50 bg-blue-900/10 w-32">
              <div className="flex items-center gap-2 mb-1 text-slate-300">
                <FileImage className="w-3 h-3" />
                <span className="font-bold">VAE Decode</span>
              </div>
              <div className="text-[10px] text-slate-500">
                 Latent -&gt; Pixel
              </div>
           </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-700 mx-1 flex-shrink-0" />

        {/* Step 6: Save */}
        <div className="flex flex-col items-center gap-2">
           <div className="p-3 rounded border border-slate-500/50 bg-slate-900/10 w-24">
              <div className="flex items-center gap-2 mb-1 text-slate-300">
                <ImageIcon className="w-3 h-3" />
                <span className="font-bold">Output</span>
              </div>
              <div className="text-[10px] text-slate-500">
                 Save Image
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default WorkflowVisualizer;
