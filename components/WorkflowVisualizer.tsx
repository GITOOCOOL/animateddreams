import React from 'react';
import { ComfySettings } from '../types';
import { Database, Image as ImageIcon, Zap, Cpu, Layers, Box, ArrowRight, Download, Activity } from 'lucide-react';

interface WorkflowVisualizerProps {
   settings: ComfySettings;
   workflowType: 'Text-to-Image' | 'Image-to-Image';
   activeNodeId?: string | null;
   inputImageUrl?: string | null;
   outputImageUrl?: string | null;
}

const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({ settings, workflowType, activeNodeId, inputImageUrl, outputImageUrl }) => {

   const isActive = (ids: string | string[]) => {
      if (!activeNodeId) return false;
      if (Array.isArray(ids)) return ids.includes(activeNodeId);
      return activeNodeId === ids;
   };

   const getNodeStyle = (ids: string | string[]) => {
      const active = isActive(ids);
      return `
        relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 min-w-[140px] z-10
        ${active
            ? 'bg-purple-900/50 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.5)] scale-110 animate-pulse'
            : 'bg-slate-900 border-slate-700 text-slate-400 opacity-80'}
      `;
   };

   const Connection = ({ vertical = false }: { vertical?: boolean }) => (
      <div className={`relative overflow-hidden group ${vertical ? 'w-0.5 h-8 my-1' : 'flex-1 h-0.5 mx-2'} bg-slate-800/50 rounded-full`}>
         <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent w-full ${vertical ? 'animate-flow-vertical' : 'animate-flow-horizontal'}`}></div>
         <style>{`
           @keyframes flow-horizontal {
             0% { transform: translateX(-100%); }
             100% { transform: translateX(100%); }
           }
           @keyframes flow-vertical {
             0% { transform: translateY(-100%); }
             100% { transform: translateY(100%); }
           }
           .animate-flow-horizontal {
             animation: flow-horizontal 1.5s linear infinite;
           }
           .animate-flow-vertical {
             animation: flow-vertical 1.5s linear infinite;
           }
         `}</style>
      </div>
   );

   return (
      <div className="w-full bg-black/20 rounded-xl p-8 overflow-x-auto">
         <div className="flex items-center justify-between min-w-[800px] gap-4 relative">

            {/* Step 1: Input Latent or Image */}
            <div className="flex flex-col gap-4">
               {workflowType === 'Image-to-Image' ? (
                  <div className={getNodeStyle("11")}>
                     <ImageIcon className="w-6 h-6 text-pink-400" />
                     <span className="text-[10px] font-mono uppercase font-bold">Load Image</span>
                     {inputImageUrl ? (
                        <div className="w-16 h-16 mt-1 rounded overflow-hidden border border-pink-500/50">
                           <img src={inputImageUrl} alt="Input" className="w-full h-full object-cover" />
                        </div>
                     ) : (
                        <span className="text-[8px] text-slate-500">Input Source</span>
                     )}
                  </div>
               ) : (
                  <div className={getNodeStyle("5")}>
                     <Box className="w-6 h-6 text-slate-400" />
                     <span className="text-[10px] font-mono uppercase font-bold">Empty Latent</span>
                     <span className="text-[8px] text-slate-500">{settings.width}x{settings.height}</span>
                  </div>
               )}

               {/* VAE Encode for Img2Img */}
               {workflowType === 'Image-to-Image' && (
                  <div className={getNodeStyle("10")}>
                     <Cpu className="w-6 h-6 text-pink-600" />
                     <span className="text-[10px] font-mono uppercase font-bold">VAE Encode</span>
                  </div>
               )}
            </div>

            <Connection />

            {/* Step 2: Model & Prompts */}
            <div className="flex flex-col gap-4 items-center">
               <div className={getNodeStyle(["4", "40"])}>
                  <Database className="w-6 h-6 text-cyan-400" />
                  <span className="text-[10px] font-mono uppercase font-bold">Checkpoint</span>
                  <span className="text-[8px] text-slate-500 truncate max-w-[100px]">{settings.model}</span>
               </div>

               {settings.lora && settings.lora !== 'None' && (
                  <>
                     <Connection vertical />
                     <div className={getNodeStyle("100")}>
                        <Zap className="w-6 h-6 text-yellow-400" />
                        <span className="text-[10px] font-mono uppercase font-bold">LoRA</span>
                        <span className="text-[8px] text-slate-500 truncate max-w-[100px]">{settings.lora}</span>
                     </div>
                  </>
               )}

               <Connection vertical />

               <div className="flex gap-2">
                  <div className={getNodeStyle("6")}>
                     <Layers className="w-5 h-5 text-green-400" />
                     <span className="text-[10px] font-mono uppercase font-bold">Positive</span>
                  </div>
                  <div className={getNodeStyle("7")}>
                     <Layers className="w-5 h-5 text-red-400" />
                     <span className="text-[10px] font-mono uppercase font-bold">Negative</span>
                  </div>
               </div>
            </div>

            <Connection />

            {/* Step 3: KSampler (The Brain) */}
            <div className={getNodeStyle("3")}>
               <Activity className={`w-8 h-8 ${isActive("3") ? 'text-purple-300 animate-spin-slow' : 'text-purple-600'}`} />
               <span className="text-[10px] font-mono uppercase font-bold">KSampler</span>
               <div className="text-[8px] text-slate-500 flex flex-col items-center">
                  <span>{settings.steps} Steps</span>
                  <span>CFG: {settings.cfg}</span>
                  <span>{settings.sampler}</span>
                  {workflowType === 'Image-to-Image' && <span className="text-pink-400">Denoise: {settings.denoise}</span>}
               </div>
            </div>

            <Connection />

            {/* Step 4: VAE Decode */}
            <div className={getNodeStyle("8")}>
               <Cpu className="w-6 h-6 text-cyan-600" />
               <span className="text-[10px] font-mono uppercase font-bold">VAE Decode</span>
            </div>

            <Connection />

            {/* Step 5: Save Image */}
            <div className={getNodeStyle("9")}>
               <Download className="w-6 h-6 text-green-500" />
               <span className="text-[10px] font-mono uppercase font-bold">Save Image</span>
               {outputImageUrl && (
                  <div className="w-20 h-20 mt-1 rounded overflow-hidden border border-green-500/50 shadow-lg shadow-green-900/50">
                     <img src={outputImageUrl} alt="Output" className="w-full h-full object-cover" />
                  </div>
               )}
            </div>

         </div>

         {/* Legend */}
         <div className="flex justify-center gap-6 mt-8 border-t border-slate-800 pt-4">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
               <span className="w-2 h-2 rounded-full bg-slate-700"></span> Idle
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
               <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> Processing
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
               <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Model Data
            </div>
         </div>
      </div>
   );
};

export default WorkflowVisualizer;
