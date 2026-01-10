
import React, { useState, useEffect, useRef } from 'react';
import { DreamState, DreamAttachment, ComfySettings } from './types';
import { analyzeDreamText, generateDreamImage, generateDreamVideo } from './services/geminiService';
import { generateComfyImage, checkComfyConnection, getAvailableModels, getAvailableLoras } from './services/comfyService';
import { analyzeDreamTextOllama, checkOllamaConnection } from './services/ollamaService';
import { saveDreamToDatabase } from './services/storageService';
import AnalysisCard from './components/AnalysisCard';
import MediaPanel from './components/MediaPanel';
import ProgressBar from './components/ProgressBar';
import SettingsPanel from './components/SettingsPanel';
import ConfirmDialog from './components/ConfirmDialog';
import Gallery from './components/Gallery';
import LogConsole from './components/LogConsole';
import DeveloperTools from './components/DeveloperTools';
import WorkflowVisualizer from './components/WorkflowVisualizer';
import { Moon, Star, Sparkles, RefreshCw, AlertTriangle, Zap, Radio, Paperclip, X, FileText, Image as ImageIcon, Server, Wifi, Grid, Plus } from 'lucide-react';

const App = () => {
  // Application State
  const [dreamState, setDreamState] = useState<DreamState & { progress: number; progressStatus: string }>({
    rawText: '',
    attachments: [],
    analysis: null,
    generatedImageUrl: null,
    generatedVideoUrl: null,
    isAnalyzing: false,
    isGeneratingImage: false,
    isGeneratingVideo: false,
    error: null,
    progress: 0,
    progressStatus: ''
  });

  const [hasApiKey, setHasApiKey] = useState(false);
  const [generationMode, setGenerationMode] = useState<'cloud' | 'local'>('cloud');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  const [isComfyConnected, setIsComfyConnected] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'create' | 'gallery'>('create');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const [showSettingsPrompt, setShowSettingsPrompt] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [devSettings, setDevSettings] = useState({
    mockAnalysis: false,
    mockGeneration: false
  });

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  // State for confirm dialog is defined above.


  // Default High Quality Settings
  const [comfySettings, setComfySettings] = useState<ComfySettings>({
    model: 'juggernautXL_ragnarokBy.safetensors',
    steps: 50,
    cfg: 5.5,
    sampler: 'dpmpp_2m',
    scheduler: 'karras',
    denoise: 0.65,
    width: 768,
    height: 768
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for API key on mount for Veo compatibility
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();

    // Check connections
    const checkServices = async () => {
      try {
        const comfy = await checkComfyConnection();
        setIsComfyConnected(comfy);
        if (comfy) {
          console.log("ComfyUI detected!");

          // Fetch models
          try {
            const models = await getAvailableModels();
            setAvailableModels(models);

            const loras = await getAvailableLoras();
            console.log("[App.tsx] Updating available LoRAs state:", loras);
            setAvailableLoras(loras);
          } catch (e) {
            console.error("Failed to fetch Comfy resources", e);
          }
        }
      } catch (error) {
        console.error("Service check failed:", error);
        setIsComfyConnected(false);
      }

      const ollama = await checkOllamaConnection();
      setIsOllamaConnected(ollama);
    };

    checkServices();
  }, []);



  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    } else {
      console.warn("AI Studio window object not found. Ensure this is running in the correct environment.");
    }
  };

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: DreamAttachment[] = [];

      try {
        const files = Array.from(e.target.files) as File[];
        for (const file of files) {
          const base64String = await fileToBase64(file);
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,") to get raw base64
          const base64Data = base64String.split(',')[1];

          newAttachments.push({
            id: crypto.randomUUID(),
            file,
            previewUrl: URL.createObjectURL(file),
            base64: base64Data,
            mimeType: file.type
          });
        }

        setDreamState(prev => ({
          ...prev,
          attachments: [...prev.attachments, ...newAttachments]
        }));
      } catch (err) {
        console.error("Error reading file", err);
        setDreamState(prev => ({ ...prev, error: "Failed to read file attachment." }));
      }

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setDreamState(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id)
    }));
  };

  const handleAnalyze = async () => {
    if (!dreamState.rawText.trim() && dreamState.attachments.length === 0) return;

    setDreamState(prev => ({ ...prev, isAnalyzing: true, error: null, progress: 0, progressStatus: 'Preparing...' }));

    // Simulate progress since APIs don't emit it for text gen
    const progressInterval = setInterval(() => {
      setDreamState(prev => {
        if (prev.progress >= 90) return prev;
        let msg = prev.progressStatus;
        if (prev.progress > 20) msg = "Ingesting memory...";
        if (prev.progress > 50) msg = "Decoding symbols...";
        if (prev.progress > 80) msg = "Synthesizing interpretation...";
        return { ...prev, progress: prev.progress + (devSettings.mockAnalysis ? 20 : 5), progressStatus: msg };
      });
    }, devSettings.mockAnalysis ? 100 : 500);

    try {
      let analysis;
      if (devSettings.mockAnalysis) {
        // Mock Analysis Data
        await new Promise(r => setTimeout(r, 1000));
        analysis = {
          visualPrompt: "A surreal landscape with floating islands and neon waterfalls, cyberpunk style, digital art, 8k resolution",
          mood: "Ethereal",
          subjects: ["Floating Islands", "Neon Waterfalls"],
          lighting: "Neon Glow",
          colorPalette: ["Cyan", "Purple", "Black"],
          title: "Neon Archipelago",
          summary: "A dream of floating islands suspended in a digital void.",
          interpretation: "This dream suggests a desire for escapism.",
          symbolism: ["Islands", "Waterfalls", "Neon"]
        };
        addLog("[DEV] Mock Analysis triggered successfully.");
      } else if (generationMode === 'local') {
        if (!isOllamaConnected) throw new Error("Ollama not detected. Ensure it is running.");
        analysis = await analyzeDreamTextOllama(dreamState.rawText, dreamState.attachments);
      } else {
        analysis = await analyzeDreamText(dreamState.rawText, dreamState.attachments);
      }

      clearInterval(progressInterval);
      setDreamState(prev => ({
        ...prev,
        analysis,
        isAnalyzing: false,
        progress: 100
      }));
    } catch (err: any) {
      clearInterval(interval);
      setDreamState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: err.message || "Failed to analyze dream"
      }));
    }
  };

  const initiateGenerateImage = () => {
    if (!dreamState.analysis?.visualPrompt) return;
    setShowConfirmDialog(true);
  };

  const executeGenerateImage = async () => {
    setShowConfirmDialog(false);
    if (!dreamState.analysis?.visualPrompt) return;

    setDreamState(prev => ({ ...prev, isGeneratingImage: true, error: null, progress: 0, progressStatus: 'Queueing...' }));
    const startTime = Date.now();
    try {
      let url: string;

      if (devSettings.mockGeneration) {
        // Mock Generation Logic
        addLog("[DEV] Starting Mock Generation sequence...");

        const mockSteps = ['Load Model', 'Load LoRA', 'Encode Prompt', 'KSampler', 'VAE Decode', 'Save Image'];
        const nodeIds = ["4", "100", "6", "3", "8", "9"];

        for (let i = 0; i < mockSteps.length; i++) {
          setActiveNodeId(nodeIds[i]);
          setDreamState(prev => ({
            ...prev,
            progress: ((i + 1) / mockSteps.length) * 100,
            progressStatus: `Executing Node: ${mockSteps[i]}...`
          }));
          await new Promise(r => setTimeout(r, 800)); // Simulate work
        }

        url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
        addLog("[DEV] Mock Generation Complete.");
        setActiveNodeId(null);
        const totalTime = "5.0";
        setDreamState(prev => ({
          ...prev,
          progressStatus: `Completed in ${totalTime}s`,
          generatedImageUrl: url, // Fix: Update image URL
          isGeneratingImage: false,
          progress: 100
        }));

      } else if (generationMode === 'local') {
        if (!isComfyConnected) throw new Error("ComfyUI not connected. Make sure it is running.");

        // Check for input image for Img2Img
        const inputImage = dreamState.attachments.find(a => a.mimeType.startsWith('image/'))?.file;

        // Pass callback for progress updates AND input image

        url = await generateComfyImage(
          dreamState.analysis.visualPrompt,
          dreamState.rawText,
          (val, max) => {
            const pct = (val / max) * 100;

            // Calculate ETA
            const elapsed = Date.now() - startTime;
            if (val === 0) addLog(`Starting sampling...`);
            if (val > 0) {
              const msPerStep = elapsed / val;
              const remainingSteps = max - val;
              const etaSec = Math.ceil((msPerStep * remainingSteps) / 1000);
              setDreamState(prev => ({
                ...prev,
                progress: pct,
                progressStatus: `Sampling Step ${val}/${max} (~${etaSec}s remaining)...`
              }));
            } else {
              setDreamState(prev => ({
                ...prev,
                progress: pct,
                progressStatus: `Sampling Step ${val}/${max}...`
              }));
            }
          },
          (nodeId) => setActiveNodeId(nodeId),
          inputImage,
          comfySettings
        );

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Generation Completed in ${totalTime}s`);

        // Update status immediately for local
        setDreamState(prev => ({ ...prev, progressStatus: `Completed in ${totalTime}s` }));
        addLog(`Generation Complete (${totalTime}s). URL: ${url}`);

      } else {
        // Fallback / Other modes
        url = await generateDreamImage(dreamState.analysis.visualPrompt);
      }

      // -----------------------------------------------------
      // Post-Generation: Save & Update State
      // -----------------------------------------------------

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

      // Save to DB (for Mock or Local)
      const dreamId = crypto.randomUUID();
      await saveDreamToDatabase({
        id: dreamId,
        rawText: dreamState.rawText,
        analysis: dreamState.analysis!,
        generatedImageUrl: url
      });
      addLog(`Dream saved to database (ID: ${dreamId.slice(0, 8)}...)`);

      setDreamState(prev => ({
        ...prev,
        generatedImageUrl: url,
        isGeneratingImage: false,
        progress: 100,
        progressStatus: 'Generation and Save Complete'
      }));

    } catch (err: any) {
      setDreamState(prev => ({
        ...prev,
        isGeneratingImage: false,
        error: err.message || "Failed to generate image"
      }));
    }
  };

  const handleGenerateVideo = async () => {
    if (!dreamState.analysis?.visualPrompt) return;

    // For now, video is still Cloud only (Veo only)
    if (generationMode === 'local') {
      alert("Video generation is currently only supported in Cloud mode (Veo).");
      return;
    }

    // Double check key before starting expensive Veo call
    if (!hasApiKey) {
      await handleSelectKey();
    }

    setDreamState(prev => ({ ...prev, isGeneratingVideo: true, error: null }));
    try {
      const url = await generateDreamVideo(dreamState.analysis.visualPrompt);
      setDreamState(prev => ({
        ...prev,
        generatedVideoUrl: url,
        isGeneratingVideo: false
      }));
    } catch (err: any) {
      if (err.message && err.message.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setDreamState(prev => ({
          ...prev,
          isGeneratingVideo: false,
          error: "Auth Failed: Please select your key again."
        }));
        await handleSelectKey();
      } else {
        setDreamState(prev => ({
          ...prev,
          isGeneratingVideo: false,
          error: err.message || "Failed to generate video"
        }));
      }
    }
  };

  const resetInterface = () => {
    // Revoke object URLs to avoid memory leaks
    dreamState.attachments.forEach(att => URL.revokeObjectURL(att.previewUrl));

    setDreamState({
      rawText: '',
      attachments: [],
      analysis: null,
      generatedImageUrl: null,
      generatedVideoUrl: null,
      isAnalyzing: false,
      isGeneratingImage: false,
      isGeneratingVideo: false,
      error: null,
      progress: 0,
      progressStatus: ''
    });
  };

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-8 relative">
      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-16 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur-lg opacity-50 animate-pulse"></div>
              <div className="relative p-3 bg-black border border-purple-500 rounded-lg">
                <Moon className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                AnimatedDreams
              </h1>
              <p className="text-cyan-400 font-mono text-xs tracking-[0.2em] mt-1">
                // SYSTEM: ONLINE // MODEL: GEMINI-VEO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6 md:mt-0">
            {/* Mode Toggle */}
            <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setGenerationMode('cloud')}
                className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${generationMode === 'cloud' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                CLOUD
              </button>
              <button
                onClick={() => setGenerationMode('local')}
                className={`px-3 py-1 text-xs font-mono rounded-md transition-all flex items-center gap-2 ${generationMode === 'local' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                LOCAL
                <div className="flex gap-1">
                  {/* ComfyUI Dot */}
                  <span title="ComfyUI" className={`w-2 h-2 rounded-full ${isComfyConnected ? 'bg-green-300 animate-pulse' : 'bg-red-500'}`}></span>
                  {/* Ollama Dot */}
                  <div className="relative group/ollama">
                    <span className={`w-2 h-2 rounded-full block ${isOllamaConnected ? 'bg-blue-300 animate-pulse' : 'bg-red-500'}`}></span>
                  </div>
                </div>
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700">
              <button
                className={`px-4 py-2 rounded-l-md font-mono text-xs uppercase transition-all flex items-center gap-2 ${viewMode === 'create' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                onClick={() => setViewMode('create')}
              >
                <Plus className="w-3 h-3" />
                Create
              </button>
              <button
                className={`px-4 py-2 rounded-r-md font-mono text-xs uppercase transition-all flex items-center gap-2 border-l border-slate-700 ${viewMode === 'gallery' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                onClick={() => setViewMode('gallery')}
              >
                <Grid className="w-3 h-3" />
                Gallery
              </button>
            </div>

            <button
              disabled={dreamState.isGeneratingImage}
              className={`px-6 py-2 rounded-none border border-cyan-500 text-cyan-500 font-mono text-xs uppercase hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] ${dreamState.isGeneratingImage ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-cyan-500 hover:shadow-none' : ''}`}
              onClick={resetInterface}
            >
              [ Reset_Interface ]
            </button>
          </div>
        </header>

        {viewMode === 'gallery' ? (
          <Gallery />
        ) : (
          /* Create Mode Content */
          <>

            {/* Error Banner */}
            {dreamState.error && (
              <div className="mb-8 bg-red-900/20 border-l-4 border-red-500 text-red-200 p-4 flex items-center gap-4 animate-bounce-subtle">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <div className="font-mono text-sm">
                  <span className="font-bold block">ERROR_LOG_DETECTED:</span>
                  {dreamState.error}
                </div>
              </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

              {/* Input Section */}
              <div className="lg:col-span-5 space-y-8">
                <div className="bg-black/80 backdrop-blur-sm border border-slate-800 rounded-lg p-1 shadow-2xl relative group">
                  {/* Corner Accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>

                  <div className="p-6">
                    <label className="block text-cyan-400 font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-sm">
                      <Star className="w-4 h-4 animate-spin-slow" />
                      Input_Dream_Sequence
                    </label>

                    <textarea
                      value={dreamState.rawText}
                      onChange={(e) => setDreamState(prev => ({ ...prev, rawText: e.target.value }))}
                      placeholder="Initiate memory dump here..."
                      className="w-full h-64 bg-slate-900/50 border border-slate-700 rounded-sm p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm leading-relaxed resize-none"
                    />

                    {/* File Attachment Section */}
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono text-slate-500 uppercase">Auxiliary Data (Images/Docs)</span>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wide border border-purple-500/30 px-3 py-1 rounded bg-purple-900/10"
                        >
                          <Paperclip className="w-3 h-3" />
                          Add_Files
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={handleFileSelect}
                        />
                      </div>

                      {dreamState.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-2">
                          {dreamState.attachments.map((att) => (
                            <div key={att.id} className="relative group/file">
                              <div className="w-16 h-16 bg-slate-800 rounded border border-slate-700 overflow-hidden flex items-center justify-center">
                                {att.mimeType.startsWith('image/') ? (
                                  <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                ) : (
                                  <FileText className="w-8 h-8 text-slate-500" />
                                )}
                              </div>
                              <button
                                onClick={() => removeAttachment(att.id)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/file:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      {dreamState.isAnalyzing ? (
                        <ProgressBar
                          progress={dreamState.progress}
                          label="ANALYZING"
                          statusText={dreamState.progressStatus}
                          color="purple"
                        />
                      ) : (
                        <button
                          onClick={handleAnalyze}
                          disabled={dreamState.isGeneratingImage || (!dreamState.rawText.trim() && dreamState.attachments.length === 0)}
                          className={`
                          px-8 py-4 font-bold uppercase tracking-widest text-sm transition-all flex items-center gap-3 w-full justify-center
                          ${(dreamState.isGeneratingImage || (!dreamState.rawText.trim() && dreamState.attachments.length === 0))
                              ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                              : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]'
                            }
                        `}
                        >
                          <Zap className="w-4 h-4" />
                          Analyze_Data
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tech Specs Panel */}
                <div className="p-6 border border-slate-800 bg-black/60 font-mono text-xs text-slate-500">
                  <h4 className="font-bold text-slate-400 mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <Radio className="w-3 h-3" />
                    PROTOCOL_SEQUENCE
                  </h4>
                  <ul className="space-y-2 list-none">
                    <li className="flex justify-between">
                      <span>STEP_01</span> <span className="text-cyan-600">INGEST_MEMORY + ASSETS</span>
                    </li>
                    <li className="flex justify-between">
                      <span>STEP_02</span> <span className="text-purple-600">SEMANTIC_DECODE (GEMINI/OLLAMA)</span>
                    </li>
                    <li className="flex justify-between">
                      <span>STEP_03</span> <span className="text-pink-600">VISUAL_SYNTHESIS (COMFYUI/VEO)</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Results Section */}
              <div className="lg:col-span-7 space-y-10 relative">

                {/* Active Visualization Overlay */}
                {dreamState.isGeneratingImage && (
                  <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                    <div className="max-w-5xl w-full flex flex-col items-center">
                      <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-8 animate-pulse text-center">
                        NEURAL SYNTHESIS IN PROGRESS
                      </h3>
                      <WorkflowVisualizer
                        settings={comfySettings}
                        workflowType={dreamState.attachments.some(a => a.mimeType.startsWith('image/')) ? 'Image-to-Image' : 'Text-to-Image'}
                        activeNodeId={activeNodeId}
                        inputImageUrl={dreamState.attachments?.find(a => a.mimeType.startsWith('image/'))?.previewUrl}
                        outputImageUrl={dreamState.progress === 100 ? dreamState.generatedImageUrl : null}
                      />
                      <div className="mt-8 w-full max-w-md">
                        <ProgressBar
                          progress={dreamState.progress}
                          label="GENERATING"
                          statusText={dreamState.progressStatus}
                          color="cyan"
                        />
                      </div>
                    </div>
                  </div>
                )}


                {dreamState.analysis ? (
                  <>
                    <AnalysisCard analysis={dreamState.analysis} />
                    <MediaPanel
                      imageUrl={dreamState.generatedImageUrl}
                      videoUrl={dreamState.generatedVideoUrl}
                      isGeneratingImage={dreamState.isGeneratingImage}
                      isGeneratingVideo={dreamState.isGeneratingVideo}
                      onGenerateImage={initiateGenerateImage}
                      onGenerateVideo={handleGenerateVideo}
                      hasAnalysis={!!dreamState.analysis}
                      videoEnabled={hasApiKey}
                      onSelectKey={handleSelectKey}
                      progress={dreamState.progress}
                      showSettingsPrompt={showSettingsPrompt && generationMode === 'local'}
                      onOpenSettings={() => setIsSettingsOpen(true)}
                      onDismissSettingsPrompt={() => setShowSettingsPrompt(false)}
                    />
                  </>
                ) : (
                  <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-700 border border-dashed border-slate-800 bg-slate-900/10 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <Sparkles className="w-20 h-20 mb-6 opacity-20 animate-pulse" />
                      <p className="font-mono uppercase tracking-widest text-sm">[ Awaiting Input Stream ]</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dynamic Settings Panel (Local Mode Only) */}
      {generationMode === 'local' && (
        <SettingsPanel
          settings={comfySettings}
          onSettingsChange={setComfySettings}
          isOpen={isSettingsOpen}
          onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
          availableModels={availableModels}
          availableLoras={availableLoras}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={executeGenerateImage}
        settings={comfySettings}

        workflowType={dreamState.attachments.some(a => a.mimeType.startsWith('image/')) ? 'Image-to-Image' : 'Text-to-Image'}
      />

      <DeveloperTools
        logs={logs}
        isOpen={isDevToolsOpen}
        onToggle={() => setIsDevToolsOpen(!isDevToolsOpen)}
        devSettings={devSettings}
        onUpdateSettings={setDevSettings}
      />
    </div>
  );
};

export default App;
