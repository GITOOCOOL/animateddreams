import React from 'react';
import { ComfySettings } from '../../types';
import { Database, Image as ImageIcon, Zap, Cpu, Layers, Box, ArrowRight, Download, Activity, Video } from 'lucide-react';

interface WorkflowVisualizerProps {
   settings: ComfySettings;
   workflowType: 'Text-to-Image' | 'Image-to-Image' | 'IP-Adapter' | 'Video-SVD' | 'Video-AnimateDiff';
   activeNodeId?: string | null;
   inputImageUrl?: string | null;
   outputImageUrl?: string | null;
   dynamicWorkflow?: any;
}

const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({ settings, workflowType, activeNodeId, inputImageUrl, outputImageUrl, dynamicWorkflow }) => {

   const containerRef = React.useRef<HTMLDivElement>(null);
   const contentRef = React.useRef<HTMLDivElement>(null);
   const [scale, setScale] = React.useState(1);
   const [position, setPosition] = React.useState({ x: 0, y: 0 });

   const fitToScreen = React.useCallback(() => {
       if (containerRef.current && contentRef.current) {
           const container = containerRef.current.getBoundingClientRect();
           const contentWidth = contentRef.current.offsetWidth;
           const contentHeight = contentRef.current.offsetHeight;
           
           if (container.width < 50 || container.height < 50) return;
           if (contentWidth === 0 || contentHeight === 0) return;

           const padding = 40;
           const allowedWidth = container.width - padding;
           const allowedHeight = container.height - padding;
           
           const ratioX = allowedWidth / contentWidth;
           const ratioY = allowedHeight / contentHeight;
           const newScale = Math.min(ratioX, ratioY, 1.2);
           
           setScale(newScale);
           setPosition({ x: 0, y: 0 });
       }
   }, []);

   React.useEffect(() => {
       const timer = setTimeout(fitToScreen, 10);
       const observer = new ResizeObserver(() => requestAnimationFrame(fitToScreen));
       
       if (containerRef.current) observer.observe(containerRef.current);
       if (contentRef.current) observer.observe(contentRef.current);
       
       return () => {
           observer.disconnect();
           clearTimeout(timer);
       };
   }, [fitToScreen, settings, workflowType, inputImageUrl, outputImageUrl, dynamicWorkflow]);

   const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2));
   const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.1));
   const handleReset = fitToScreen;

   const [isDragging, setIsDragging] = React.useState(false);
   const dragStart = React.useRef({ x: 0, y: 0 });

   const onPointerDown = (e: React.PointerEvent) => {
       setIsDragging(true);
       dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
   };
   const onPointerMove = (e: React.PointerEvent) => {
       if (isDragging) {
           setPosition({
               x: e.clientX - dragStart.current.x,
               y: e.clientY - dragStart.current.y
           });
       }
   };
   const onPointerUp = () => setIsDragging(false);

   // Helper for Dynamic Node Info
   const getNodeInfo = (classType: string) => {
       if (classType.includes('KSampler')) return { icon: Activity, label: 'KSampler', color: 'text-purple-400', border: 'border-purple-500' };
       if (classType.includes('Loader') && classType.includes('Check')) return { icon: Database, label: 'Model', color: 'text-cyan-400', border: 'border-cyan-500' };
       if (classType.includes('LoadImage')) return { icon: ImageIcon, label: 'Input', color: 'text-pink-400', border: 'border-pink-500' };
       if (classType.includes('Save')) return { icon: Download, label: 'Save', color: 'text-green-500', border: 'border-green-500' };
       if (classType.includes('SVD') || classType.includes('Video')) return { icon: Video, label: 'Video Gen', color: 'text-orange-400', border: 'border-orange-500' };
       if (classType.includes('Animate')) return { icon: Video, label: 'AnimateDiff', color: 'text-blue-400', border: 'border-blue-500' };
       if (classType.includes('IPAdapter')) return { icon: Cpu, label: 'IP-Adapter', color: 'text-yellow-400', border: 'border-yellow-500' };
       if (classType.includes('CLIP')) return { icon: Zap, label: 'CLIP', color: 'text-indigo-400', border: 'border-indigo-500' };
       if (classType.includes('VAE')) return { icon: Cpu, label: 'VAE', color: 'text-red-400', border: 'border-red-500' };
       return { icon: Box, label: classType.replace(/_/g, ' '), color: 'text-slate-400', border: 'border-slate-600' };
   };

   // Helper functions for Static Rendering
   const isActive = (ids: string | string[]) => {
      if (!activeNodeId) return false;
      if (Array.isArray(ids)) return ids.includes(activeNodeId);
      return activeNodeId === ids;
   };

   const getNodeStyle = (ids: string | string[]) => {
      const active = isActive(ids);
      return `
        relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 min-w-[140px] z-10 flex-shrink-0
        ${active
            ? 'bg-purple-900/50 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.5)] scale-110 animate-pulse'
            : 'bg-slate-900 border-slate-700 text-slate-400 opacity-80'}
      `;
   };

   const Connection = ({ vertical = false }: { vertical?: boolean }) => (
      <div className={`relative overflow-hidden group ${vertical ? 'w-0.5 h-8 my-1' : 'flex-1 h-0.5 mx-2 min-w-[20px]'} bg-slate-800/80 rounded-full`}>
         <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent w-full opacity-80 shadow-[0_0_10px_rgba(34,211,238,0.5)] ${vertical ? 'animate-flow-vertical' : 'animate-flow-horizontal'}`}></div>
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
             animation: flow-horizontal 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
           }
           .animate-flow-vertical {
             animation: flow-vertical 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
           }
         `}</style>
      </div>
   );

   // DYNAMIC RENDERER
   if (dynamicWorkflow) {
       const nodes = Object.entries(dynamicWorkflow).map(([id, data]: [string, any]) => ({ id, ...data }));
       
       return (
          <div 
            ref={containerRef}
            className="w-full h-full bg-black/40 rounded-xl border border-slate-800/50 backdrop-blur-sm relative overflow-hidden cursor-move"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
             <div 
                className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out origin-center"
                style={{ transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)` }}
             >
                 <div ref={contentRef} className="flex flex-wrap items-center justify-center gap-8 px-8 py-8 max-w-[1200px]">
                     {nodes.map((node) => {
                         const info = getNodeInfo(node.class_type);
                         const Icon = info.icon;
                         
                         return (
                            <React.Fragment key={node.id}>
                                <div className={`${getNodeStyle(node.id)} min-w-[120px]`}>
                                    <Icon className={`w-6 h-6 ${info.color}`} />
                                    <span className="text-[10px] font-mono uppercase font-bold truncate max-w-[140px]">{info.label}</span>
                                    <span className="text-[8px] text-slate-500">ID: {node.id}</span>
                                    {inputImageUrl && node.class_type === 'LoadImage' && (
                                        <div className="w-10 h-10 mt-1 rounded overflow-hidden border border-white/20">
                                            <img src={inputImageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                                <div className="text-slate-800"><ArrowRight className="w-4 h-4 opacity-20" /></div>
                            </React.Fragment>
                         );
                     })}
                 </div>
             </div>
             {/* Controls */}
             <div className="absolute top-4 right-4 flex flex-col gap-2 z-50 pointer-events-auto">
                 <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-white/10 text-lg transition-colors">+</button>
                 <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-white/10 text-lg transition-colors">-</button>
                 <button onClick={handleReset} className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-white/10 text-xs transition-colors">R</button>
             </div>
          </div>
       );
   }

   // STATIC RENDERER (Fallback)
   return (
      <div 
        ref={containerRef}
        className="w-full h-full bg-black/40 rounded-xl border border-slate-800/50 backdrop-blur-sm relative overflow-hidden cursor-move"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
         <div 
            className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out origin-center"
            style={{ transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)` }}
         >
             {/* Content Wrapper for measuring */}
             <div ref={contentRef} className="flex items-center justify-center gap-2 px-8 py-8">
             
                {/* Step 1: Input Latent or Image */}
                <div className="flex flex-col gap-4 flex-shrink-0">
                   {workflowType === 'Image-to-Image' || workflowType === 'IP-Adapter' ? (
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

                {/* Step 1.5: IP-Adapter Module */}
                {workflowType === 'IP-Adapter' && (
                    <>
                    <div className="flex flex-col gap-4 items-center flex-shrink-0 bg-cyan-900/10 p-3 rounded-xl border border-cyan-500/20">
                         {/* IPAdapter Model */}
                         <div className={getNodeStyle("21")}>
                             <Box className="w-5 h-5 text-yellow-400" />
                             <span className="text-[9px] font-mono uppercase font-bold">IP-Model</span>
                             <span className="text-[7px] text-slate-500">SDXL ViT-H</span>
                         </div>
                         
                         {/* CLIP Vision */}
                         <div className={getNodeStyle("22")}>
                             <Zap className="w-5 h-5 text-cyan-400" />
                             <span className="text-[9px] font-mono uppercase font-bold">CLIP Vision</span>
                             <span className="text-[7px] text-slate-500">ViT-H-14</span>
                         </div>
                         
                         <Connection vertical />

                         {/* IPAdapter Advanced Node */}
                         <div className={getNodeStyle("20")}>
                             <Cpu className="w-6 h-6 text-cyan-300" />
                             <span className="text-[10px] font-mono uppercase font-bold">IP-Adapter</span>
                             <span className="text-[8px] text-slate-500">Weight: 0.8</span>
                         </div>
                    </div>
                    <Connection />
                    </>
                )}
    
                {/* Step 2: Model & Prompts */}
                <div className="flex flex-col gap-4 items-center flex-shrink-0">
                   <div className={getNodeStyle(["4", "40"])}>
                      <Database className="w-6 h-6 text-cyan-400" />
                      <span className="text-[10px] font-mono uppercase font-bold">Checkpoint</span>
                      <span className="text-[8px] text-slate-500 truncate max-w-[100px]">{settings.model}</span>
                   </div>
    
                   {/* Legacy LoRA check removed */}{settings.loras && settings.loras.length > 0 && (
                      <>
                         <Connection vertical />
                         <div className={getNodeStyle("100")}>
                            <Zap className="w-6 h-6 text-yellow-400" />
                            <span className="text-[10px] font-mono uppercase font-bold">LoRA</span>
                            <span className="text-[8px] text-slate-500 truncate max-w-[100px]">{settings.loras.map(l => l.name).join(', ')}</span>
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
                <div className="flex-shrink-0">
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
                </div>
    
                <Connection />
    
                {/* Step 4: VAE Decode */}
                <div className="flex-shrink-0">
                   <div className={getNodeStyle("8")}>
                      <Cpu className="w-6 h-6 text-cyan-600" />
                      <span className="text-[10px] font-mono uppercase font-bold">VAE Decode</span>
                   </div>
                </div>
    
                <Connection />
    
                {/* Step 5: Save Image */}
                <div className="flex-shrink-0">
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
             </div> 
         </div>

         {/* Zoom Controls */}
         <div className="absolute top-4 right-4 flex flex-col gap-2 z-50 pointer-events-auto">
             <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-white/10 text-lg transition-colors">+</button>
             <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-white/10 text-lg transition-colors">-</button>
             <button onClick={handleReset} className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-white/10 text-xs transition-colors">R</button>
         </div>

         {/* Legend (Absolute positioned) */}
         <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6 pointer-events-none">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-black/50 px-2 rounded-full">
               <span className="w-2 h-2 rounded-full bg-slate-700"></span> Idle
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-black/50 px-2 rounded-full">
               <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> Processing
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-black/50 px-2 rounded-full">
               <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Data
            </div>
         </div>
      </div>
   );
};

export default WorkflowVisualizer;
