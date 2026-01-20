
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
type ArchitectureView = 'client' | 'server' | 'ai' | 'workflow';

interface ArchitectureViewerProps {
  onClose: () => void;
  initialView?: ArchitectureView;
}

export const ArchitectureViewer: React.FC<ArchitectureViewerProps> = ({ onClose, initialView = 'client' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [currentView, setCurrentView] = useState<ArchitectureView>(initialView);
  
  // Native State for Pan/Zoom
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false, 
      theme: 'dark',
      securityLevel: 'loose',
    });
  }, []); // Init once

  // Render when view changes
  useEffect(() => {
    const renderDiagram = async () => {
      try {
          // Reset Zoom on view change
          setScale(1);
          setPosition({x:0, y:0});

          let definition = '';

          if (currentView === 'client') {
            definition = `
graph TB
    %% Client Layer (The Monolith)
    classDef default fill:#1a1a1a,stroke:#fff,stroke-width:1px,color:#fff;
    classDef godmode fill:#330000,stroke:#ff0000,stroke-width:2px,color:#fff;
    classDef component fill:#003333,stroke:#00ffff,stroke-width:1px,color:#fff;
    
    subgraph GlobalState ["1. Global State & The God Hook"]
        direction TB
        Ctx[ConnectionContext] --> DreamHook
        DreamHook["useDreamEngine (The Monolith)"]:::godmode
        
        DreamHook --> DreamState["State: isGenerating, analysis, error"]
        DreamHook --> Logs[LogConsole]
        DreamHook --> ComfyService[comfyService.ts]
        DreamHook --> AutoSave["Auto-Save Logic"]
    end

    %% Force Vertical Gap
    DreamHook ===> App

    subgraph UIComposition ["2. App.tsx (The Conduit)"]
        direction TB
        App[App Component]:::component
        App --> Header
        App --> MainLayout
    end

    %% Force Vertical Gap
    MainLayout ===> Panels

    subgraph Structure ["3. Component Structure (Refactored)"]
        direction TB
        
        subgraph Panels ["components/panels"]
            direction TB
            Input["PromptBox (in App)"]
            Settings[SettingsPanel]
            Media[MediaPanel]
            Results[ResultView]
            DevTools[DeveloperTools]
        end
        
        subgraph SubPanels ["components/settings"]
            direction TB
            AgentCfg[AgentSettings]
            VideoCfg[VideoSettings]
            SystemCfg[SystemSettings]
        end

        subgraph Visuals ["components/visualizers"]
            direction TB
            Arch[ArchitectureViewer]
            Workflow[WorkflowVisualizer]
            Pipeline[AnalysisPipelineVisualizer]
        end

        subgraph Dialogs ["components/dialogs"]
            Login[LoginDialog]
            Confirm[ConfirmDialog]
        end
    end

    %% Explicit Data Flow Connections
    App -- "Passes Engine" --> Settings
    App -- "Passes Engine" --> Media
    App -- "Drills State" --> Results
    
    %% Relationships
    Settings --> SubPanels
    Media --> Workflow
    App --> Arch
    App --> Pipeline
`;
          } else if (currentView === 'server') {
              definition = `
graph TB
    %% Server Layer
    classDef default fill:#1a1a1a,stroke:#ccc,stroke-width:1px,color:#fff;
    classDef express fill:#112211,stroke:#00ff00,stroke-width:2px,color:#fff;
    classDef db fill:#221133,stroke:#aa00ff,stroke-width:2px,color:#fff;
    classDef route fill:#222,stroke:#666,stroke-width:1px,stroke-dasharray: 5 5,color:#aaa;

    subgraph Entry ["Entry Point"]
        Client[React Client] -- "HTTP (Fetch)" --> Server["Express Server (Port 3001)"]:::express
        Server --> Middleware[CORS / JSON Body Parser]
    end

    subgraph Routes ["API Routes"]
        Middleware --> AuthRoute["/api/auth (Auth Routes)"]:::route
        Middleware --> DreamRoute["/api/db/dreams (Dream Routes)"]:::route
        Middleware --> AIRoute["/api/ai (AI Proxy Routes)"]:::route
    end
    
    subgraph Controllers ["Logic & Storage"]
        AuthRoute --> AuthParams[Login / Register / Profile]
        DreamRoute --> DreamCRUD[Create / Read / Delete Dreams]
        AIRoute --> AIProxy[Availability / Analyze Proxy]
        
        DreamCRUD --> SQLite[(SQLite Database)]:::db
        AuthParams --> SQLite
        
        DreamCRUD --> FileSystem[disk: /saved_dreams]
    end
`;
          } else if (currentView === 'ai') {
              definition = `
graph TB
    %% AI Services Layer
    classDef default fill:#1a1a1a,stroke:#ccc,stroke-width:1px,color:#fff;
    classDef service fill:#003344,stroke:#00aaff,stroke-width:2px,color:#fff;
    classDef external fill:#442200,stroke:#ffaa00,stroke-width:2px,color:#fff;

    subgraph Client ["Client Side Orchestrator"]
        DreamEngine[useDreamEngine] --> ComfyService[comfyService.ts]
        DreamEngine --> OllamaService[ollamaService.ts]
        DreamEngine --> GeminiService[geminiService.ts]
    end

    subgraph Adapters ["Service Adapters"]
        ComfyService -- "WebSocket / HTTP" --> ComfyUI[ComfyUI Instance]:::service
        OllamaService -- "HTTP (Direct/Proxy)" --> Ollama[Ollama Local API]:::service
        GeminiService -- "HTTP" --> BackendProxy[Express Backend /api/ai]
    end

    subgraph External ["External AI Providers"]
        BackendProxy -- "API Key" --> GoogleGemini[Google Gemini API]:::external
        ComfyUI -- "Downloads" --> HuggingFace[Hugging Face / CivitAI]:::external
        Ollama -- "Inference" --> Llama3[Llama 3 / Mistral Model]:::external
    end
`;
          } else if (currentView === 'workflow') {
              definition = `
graph LR
    %% Dream Workflow Architecture
    classDef default fill:#1a1a1a,stroke:#ccc,stroke-width:1px,color:#fff;
    classDef user fill:#000,stroke:#fff,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    classDef input fill:#222,stroke:#666,stroke-width:1px,color:#aaa;
    classDef analysis fill:#003344,stroke:#00aaff,stroke-width:2px,color:#fff;
    classDef generation fill:#220033,stroke:#ff00ff,stroke-width:2px,color:#fff;
    classDef storage fill:#112211,stroke:#00ff00,stroke-width:2px,color:#fff;

    User((User)):::user

    subgraph Input ["1. Input Phase"]
        direction TB
        Txt[Text Prompt]:::input
        Img[Image Attachment]:::input
        Audio[Dictation / Mic]:::input
        
        Audio -.-> |Transcribe| Txt
    end

    subgraph Pipeline ["2. Analysis Pipeline (Agentic)"]
        direction LR
        
        Router{Input Type?}
        
        subgraph Layers ["Sequential Layers"]
            Vision[Layer 1: Vision Analysis]:::analysis
            Enhancer[Layer 2: Prompt Enhancer]:::analysis
            Formatter[Layer 3: JSON Formatter]:::analysis
        end
        
        DreamData[Structured Dream Analysis]
    end

    subgraph Engine ["3. Generation Engine"]
        direction TB
        Comfy[ComfyUI Host]:::generation
        
        subgraph Workflows ["Comfy Workflows"]
            T2I[Text-to-Image]
            I2I[Image-to-Image]
            IPA[IP-Adapter Control]
            Vid[SVD Video]
        end
    end
    
    subgraph Output ["4. Storage & Display"]
        direction TB
        FileSystem[Disk: /saved_dreams]:::storage
        Gallery[Gallery UI]
    end

    %% Flow Connections
    User --> Txt
    User --> Img
    User --> Audio
    
    Txt --> Router
    Img --> Router
    
    Router -- "Has Image" --> Vision
    Router -- "Text Only" --> Enhancer
    
    Vision --> Enhancer
    Enhancer --> Formatter
    Formatter -- "JSON" --> DreamData
    
    DreamData -- "visualPrompt" --> Comfy
    Img -- "Source Image" --> Comfy
    
    Comfy --> T2I
    Comfy --> I2I
    Comfy --> IPA
    Comfy --> Vid
    
    T2I & I2I & IPA & Vid --> FileSystem
    FileSystem --> Gallery
`;
          }
            
          const { svg } = await mermaid.render(`architecture-${currentView}`, definition);
          // Strip fixed width/height to allow CSS scaling
          const cleanSvg = svg.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"');
          setSvgContent(cleanSvg);
          
      } catch (error) {
        console.error('Mermaid render error:', error);
        setSvgContent(`<div class="text-red-500 p-4">Failed to render diagram: ${error}</div>`);
      }
    };

    renderDiagram();
  }, [currentView]);

  // Handlers
  const handleWheel = (e: React.WheelEvent) => {
      const zoomSensitivity = 0.001;
      const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomSensitivity), 5);
      setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
          setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-[100] bg-[#1a1a1a] flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-6">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <span className="text-cyan-500">SYSTEM_ARCHITECTURE</span>
            </h2>
            
            {/* Tab Switcher */}
            <div className="flex bg-slate-900 rounded p-1 border border-white/10">
                <button 
                    onClick={() => setCurrentView('client')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${currentView === 'client' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    CLIENT
                </button>
                <div className="w-px bg-slate-800 mx-1"></div>
                <button 
                    onClick={() => setCurrentView('server')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${currentView === 'server' ? 'bg-green-900/50 text-green-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    SERVER
                </button>
                <div className="w-px bg-slate-800 mx-1"></div>
                <button 
                    onClick={() => setCurrentView('ai')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${currentView === 'ai' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    AI SERVICES
                </button>
                <div className="w-px bg-slate-800 mx-1"></div>
                <button 
                    onClick={() => setCurrentView('workflow')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${currentView === 'workflow' ? 'bg-orange-900/50 text-orange-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    WORKFLOW
                </button>
            </div>
        </div>
        
        <div className="flex items-center gap-4"> 
            <div className="flex bg-slate-800 rounded p-1">
                <button onClick={() => setScale(s => Math.min(s + 0.2, 5))} className="p-2 hover:bg-slate-700 rounded text-slate-300"> <ZoomIn className="w-4 h-4" /> </button>
                <div className="w-px bg-slate-700 my-1"></div>
                <button onClick={() => { setScale(1); setPosition({x:0,y:0}); }} className="p-2 hover:bg-slate-700 rounded text-slate-300"> <RotateCcw className="w-4 h-4" /> </button>
                <div className="w-px bg-slate-700 my-1"></div>
                <button onClick={() => setScale(s => Math.max(s - 0.2, 0.1))} className="p-2 hover:bg-slate-700 rounded text-slate-300"> <ZoomOut className="w-4 h-4" /> </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full"> <X className="w-6 h-6" /> </button>
        </div>
      </div>

      {/* Diagram Canvas */}
      <div 
        className="flex-1 overflow-hidden relative bg-[url('/grid-pattern.png')] cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={containerRef}
      >
        <div 
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                width: '100%',
                height: '100%'
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
      
      {/* Legend / Info Footer */}
      <div className="p-2 bg-black/60 border-t border-white/10 text-[10px] text-slate-500 font-mono flex justify-between">
         <span>SCROLL to Zoom • DRAG to Pan</span>
         <span className="flex gap-4">
            {currentView === 'client' && (
                <>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#330000] border border-[#ff0000]"></span> God Object</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#003333] border border-[#00ffff]"></span> Component</span>
                    <span className="text-red-400">Showing Client Coupling Issues</span>
                </>
            )}
            {currentView === 'server' && (
                <>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#112211] border border-[#00ff00]"></span> Express</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#221133] border border-[#aa00ff]"></span> Database</span>
                    <span className="text-green-400">Showing Express/DB Flow</span>
                </>
            )}
            {currentView === 'ai' && (
                <>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#003344] border border-[#00aaff]"></span> AI Service</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#442200] border border-[#ffaa00]"></span> External API</span>
                    <span className="text-purple-400">Showing AI Service Integration</span>
                </>
            )}
            {currentView === 'workflow' && (
                <>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#003344] border border-[#00aaff]"></span> Analysis</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#220033] border border-[#ff00ff]"></span> Generation</span>
                    <span className="text-orange-400">Showing End-to-End Data Flow</span>
                </>
            )}
         </span>
      </div>
    </div>
  );
};


