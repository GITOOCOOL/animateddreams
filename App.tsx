import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Terminal, Activity, X, Image as ImageIcon, Play, Pause, RotateCcw, Mic, Square, Loader2, CheckCircle, Settings, ChevronDown } from 'lucide-react';
import { useDreamEngine } from './hooks/useDreamEngine';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useTranscriber } from './hooks/useTranscriber';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConnectionProvider, useConnections } from './contexts/ConnectionContext';

import Header from './components/layout/Header';
import AnalysisCard from './components/AnalysisCard';
import MediaPanel from './components/MediaPanel';
import WorkflowVisualizer from './components/WorkflowVisualizer';
import SettingsPanel from './components/SettingsPanel';
import VideoSettingsPanel from './components/VideoSettingsPanel';
import AnalysisPipelineVisualizer from './components/AnalysisPipelineVisualizer';
import Gallery from './components/Gallery';
import LogConsole from './components/LogConsole';
import DeveloperTools from './components/DeveloperTools';
import SettingsDialog from './components/SettingsDialog';

import SystemSettingsPanel from './components/SystemSettingsPanel';
import AgentSettingsPanel from './components/AgentSettingsPanel'; // New Dual Agent Panel
import ModelSelector from './components/ModelSelector';


import ProgressBar from './components/ProgressBar';
import LoginDialog from './components/LoginDialog';
import { analyzeDreamGemini } from './services/geminiService';
import { DictationControl } from './components/DictationControl';
import DictationSettingsPanel from './components/DictationSettingsPanel';
import { FallbackDialog } from './components/FallbackDialog';
import { ResultView } from './components/ResultView';


import { ArchitectureViewer } from './components/ArchitectureViewer';

function AppContent() {
  const { user } = useAuth();
  const { connections, updateConnection } = useConnections();
  const localTranscriber = useTranscriber();
  const [showLogin, setShowLogin] = useState(false);
  const [logs, setLogs] = useState<string[]>([]); // System Logs
  const [ollamaLogs, setOllamaLogs] = useState<string[]>([]);
  const [comfyLogs, setComfyLogs] = useState<string[]>([]);
  const [dreamInput, setDreamInput] = useState('');

  // UI State
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false);
  const [isAnalysisSettingsOpen, setIsAnalysisSettingsOpen] = useState(false);
  const [isGenerationSettingsOpen, setIsGenerationSettingsOpen] = useState(false);
  const [isVideoSettingsOpen, setIsVideoSettingsOpen] = useState(false);
  const [isDictationSettingsOpen, setIsDictationSettingsOpen] = useState(false);
  
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);
  const [showArchitectureView, setShowArchitectureView] = useState(false);
  const [architectureViewMode, setArchitectureViewMode] = useState<'client'|'server'|'ai'>('client');

  // Expose toggler for DevTools to avoid prop drilling mania
  useEffect(() => {
    (window as any).toggleArchitectureView = (mode: 'client'|'server'|'ai' = 'client') => {
        setArchitectureViewMode(mode);
        setShowArchitectureView(true);
    };
  }, []);

  // Attachments
  const [attachments, setAttachments] = useState<import('./types').DreamAttachment[]>([]);
  const startInputRef = React.useRef<HTMLInputElement>(null);

  // Iterative Mode API
  const [iterativeMode, setIterativeMode] = useState(false);
  const [feedbackPrompt, setFeedbackPrompt] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);



  // Dev Settings
  const [devSettings, setDevSettings] = useState({
    mockAnalysis: false,
    mockGeneration: false
  });

  // Analysis Settings State


  // Logging Helpers
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]); // Keep last 50
  }, []);

  const addOllamaLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setOllamaLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  }, []);

  const addComfyLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setComfyLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  }, []);

  // Hook Access
  const engine = useDreamEngine(addLog, addOllamaLog, addComfyLog, devSettings);
  const { dreamState, setDreamState, generateImage, availableModels, availableLoras } = engine;

  // Workflow Auto-Scroll Refs
  const analysisRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to Analysis when ready
  useEffect(() => {
    if (dreamState.analysis && analysisRef.current) {
        analysisRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [dreamState.analysis]);

  // Auto-scroll to Media when generating or finished
  useEffect(() => {
    if ((dreamState.isGeneratingImage || dreamState.generatedImageUrl) && mediaRef.current) {
        mediaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [dreamState.isGeneratingImage, dreamState.generatedImageUrl]);
  
  // Audio Recorder
  const [editablePrompt, setEditablePrompt] = useState("");

  // Sync editable prompt when analysis completes
  useEffect(() => {
    if (dreamState.analysis?.visualPrompt) {
        setEditablePrompt(dreamState.analysis.visualPrompt);
    }
  }, [dreamState.analysis]);

  const { startRecording, stopRecording, isRecording, audioBlob, resetAudio } = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Handle Audio Transcription
  useEffect(() => {
      if (audioBlob) {
          const transcribe = async () => {
              setIsTranscribing(true);
              addLog(`[Dictation] Processing audio via ${connections.transcriptionProvider}...`);
              
              try {
                  if (connections.transcriptionProvider === 'local') {
                      // Local WebGPU Transcription
                      await localTranscriber.transcribe(audioBlob);
                      // Text update handled by effect below
                  } else {
                      // Cloud Proxy (Groq / OpenAI)
                      const formData = new FormData();
                      formData.append('audio', audioBlob);
                      
                      const headers: HeadersInit = {};
                      if (connections.transcriptionProvider === 'groq') {
                          headers['x-whisper-host'] = 'https://api.groq.com/openai/v1/audio/transcriptions';
                          headers['x-whisper-model'] = 'distil-whisper-large-v3-en'; // Groq specific
                      } else if (connections.transcriptionProvider === 'openai') {
                         headers['x-whisper-host'] = 'https://api.openai.com/v1/audio/transcriptions';
                      } else if (connections.transcriptionProvider === 'custom') {
                          headers['x-whisper-host'] = connections.transcriptionUrl;
                      }
                      
                      if (connections.transcriptionKey) {
                          headers['x-api-key'] = connections.transcriptionKey;
                      }

                      const res = await fetch('/api/ai/transcribe', {
                          method: 'POST',
                          body: formData,
                          headers: headers
                      });
                      
                      if (!res.ok) throw new Error(await res.text());
                      
                      const data = await res.json();
                      if (data.text) {
                          setDreamInput(prev => prev + (prev ? ' ' : '') + data.text);
                          addLog("[Dictation] Text appended from Cloud.");
                      }
                      setIsTranscribing(false);
                      resetAudio();
                  }

              } catch (e: any) {
                  addLog(`[Error] Dictation failed: ${e.message}`);
                  setIsTranscribing(false);
                  resetAudio();
              }
          };
          transcribe();
      }
  }, [audioBlob, addLog, resetAudio, connections, localTranscriber.transcribe]);

  // Sync Local Transcriber Text
  useEffect(() => {
     if (localTranscriber.text && connections.transcriptionProvider === 'local') {
         setDreamInput(prev => prev + (prev ? ' ' : '') + localTranscriber.text);
         addLog("[Dictation] Text appended from Local Browser Model.");
         setIsTranscribing(false);
         resetAudio();
     }
  }, [localTranscriber.text, connections.transcriptionProvider]);

  // Sync Local Transcriber Loading Status
  useEffect(() => {
      if (connections.transcriptionProvider === 'local') {
        if (localTranscriber.isModelLoading) {
             addLog(`[System] Downloading Whisper Model... ${Math.round(localTranscriber.progress)}%`);
        }
      }
  }, [localTranscriber.isModelLoading, localTranscriber.progress, connections.transcriptionProvider]);


  // Login Check
  useEffect(() => {
    if (!user) setShowLogin(true);
    else {
      setShowLogin(false);
      addLog(`[System] User Authenticated: ${user.username}`);
    }
  }, [user, addLog]);


  // Handlers
  const handleAnalyze = () => engine.processDream(dreamInput, attachments);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        // Strip data:image/xyz;base64, prefix for Ollama
        const base64 = result.split(',')[1];
        
        // Create an image object to get dimensions
        const img = new Image();
        img.onload = () => {
          setAttachments([{
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            previewUrl: URL.createObjectURL(file), // Note: This creates a new blob URL, maybe reuse result if efficient? But existing used createObjectURL.
            base64: base64,
            mimeType: file.type,
            width: img.naturalWidth,
            height: img.naturalHeight
          }]);
          addLog(`[System] Image attached: ${file.name} (${img.naturalWidth}x${img.naturalHeight})`);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);

      // Check for Vision Model Compatibility
      // Check for Vision Model Compatibility (Check first enabled layer)
      const firstLayer = engine.analysisPipeline.layers.find(l => l.enabled);
      const currentModel = firstLayer?.config.model.toLowerCase() || 'unknown';
      const isVisionModel = currentModel.includes('llava') || currentModel.includes('vision') || currentModel.includes('mmproj');
      
      if (!isVisionModel && engine.analysisModel === 'ollama') {
          addLog("⚠️ TIP: You attached an image, but your model ('" + currentModel + "') might not support vision.");
          addLog("👉 Please select 'llava' or another vision model in Dream Agent Settings.");
          
          // Optional: Auto-open settings to help them
          // setIsAnalysisSettingsOpen(true); 
      }
    }
  };

  const clearAttachment = () => setAttachments([]);

  const handleGenerate = async () => {
    setShowVisualizationModal(true);
    
    // Use editablePrompt if available, otherwise fallback
    const analysisOverride = dreamState.analysis ? { ...dreamState.analysis, visualPrompt: editablePrompt } : undefined;
    
    const url = await generateImage(dreamInput, undefined, analysisOverride);

    if (url && iterativeMode) {
      // In iterative mode, after generation, ask for next step
      setShowFeedbackModal(true);
    }
  };

  const handleRefine = async () => {
    if (!feedbackPrompt.trim()) return;
    setShowFeedbackModal(false);

    // Update Analysis with new Feedback
    addLog("[Iterative] Refining prompt based on feedback...");
    setDreamState(prev => ({
      ...prev,
      isLoading: true,
      progressStatus: 'Refining Vision...'
    }));

    try {
      // Send (Original + Visual + Feedback) to Gemini to get NEW Visual Prompt
      const combinedPrompt = `Original: ${dreamInput}. Previous Visual: ${dreamState.analysis?.visualPrompt}. User Feedback: ${feedbackPrompt}. IMPROVE the visual prompt.`;
      const newAnalysis = await analyzeDreamGemini(combinedPrompt);

      setDreamState(prev => ({
        ...prev,
        analysis: newAnalysis,
        isLoading: false
      }));

      // Auto-trigger generation again
      handleGenerate();

    } catch (e) {
      addLog(`[Error] Refinement Failed: ${e}`);
      setDreamState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleReset = () => {
    setDreamInput('');
    engine.resetState();
  };

  const handleModelSelect = async (model: 'gemini' | 'ollama' | 'raw') => {
    if (model === 'gemini') {
        // Optimistically select it
        engine.setAnalysisModel('gemini');
        // Trigger check
        await engine.triggerGeminiCheck();
    } else {
        engine.setAnalysisModel(model);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-purple-500/30">
      <LoginDialog isOpen={showLogin && !user} onClose={() => { }} />
      
      {/* 1. System Settings (Connections) */}
      <SettingsDialog 
        isOpen={isSystemSettingsOpen} 
        onClose={() => setIsSystemSettingsOpen(false)}
        title="System Connections"
      >
          <SystemSettingsPanel />
      </SettingsDialog>

        {/* 2. Analysis Settings (LLM) */}
       <SettingsDialog 
         isOpen={isAnalysisSettingsOpen} 
         onClose={() => setIsAnalysisSettingsOpen(false)}
         title="Dream Agent Configuration"
       >
           {/* Replaced old AnalysisSettingsPanel with new Dual Agent Panel */}
           <AgentSettingsPanel 
                pipeline={engine.analysisPipeline} 
                onPipelineChange={engine.setAnalysisPipeline}
                availableOllamaModels={engine.availableOllamaModels}
                currentLayerId={dreamState.currentLayerId}
                isAnalyzing={dreamState.isAnalyzing}
                finalAnalysis={dreamState.analysis}
           />
       </SettingsDialog>

      {/* 3. Dictation Settings */}
      <SettingsDialog 
        isOpen={isDictationSettingsOpen} 
        onClose={() => setIsDictationSettingsOpen(false)}
        title="Dictation Configuration"
      >
          <DictationSettingsPanel />
      </SettingsDialog>

      {/* 4. Image Generation Settings (ComfyUI) */}
       <SettingsDialog 
        isOpen={isGenerationSettingsOpen} 
        onClose={() => setIsGenerationSettingsOpen(false)}
        title="Image Generation Configuration"
      >
          <SettingsPanel
            settings={engine.comfySettings}
            onSettingsChange={engine.setComfySettings}
            availableModels={availableModels}
            availableLoras={availableLoras}
            availableIPAdapters={engine.availableIPAdapters}
            inputImage={attachments.find(a => a.mimeType.startsWith('image/'))}
            onDone={() => setIsGenerationSettingsOpen(false)}
          />
      </SettingsDialog>

      {/* 5. Video Settings (Google Veo) */}
       <SettingsDialog 
        isOpen={isVideoSettingsOpen} 
        onClose={() => setIsVideoSettingsOpen(false)}
        title="Video Generation Configuration"
      >
          <VideoSettingsPanel
            settings={engine.videoSettings}
            onSettingsChange={engine.setVideoSettings}
          />
      </SettingsDialog>

      <Header
        isComfyConnected={engine.isComfyConnected}
        isRemote={engine.isRemote}
        onToggleDevTools={() => setShowDevTools(!showDevTools)}
        onReset={handleReset}
        onOpenGallery={() => setIsGalleryOpen(true)}
        showDevTools={showDevTools}
        logs={{
            system: logs,
            ollama: ollamaLogs,
            comfy: comfyLogs
        }}
        devSettings={devSettings}
        onUpdateSettings={setDevSettings}
        onOpenSettings={() => setIsSystemSettingsOpen(true)} 
      />

      <main className="container mx-auto max-w-[1800px] px-4 py-6 flex-1 flex flex-col gap-6">
          
          {/* Input Section */}
          <div className="flex flex-col gap-4 relative">
              <div className="relative group flex flex-col">
                <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col">
                  


                  {/* Architecture Viewer Overlay */}
      {showArchitectureView && (
          <ArchitectureViewer 
            initialView={architectureViewMode}
            onClose={() => setShowArchitectureView(false)} 
          />
      )}

      {/* Main Content Area */}
                  <div className="mb-4 relative flex-1 flex flex-col min-h-[350px]">

                    <textarea
                      id="dream-input"
                      value={dreamInput}
                      onChange={(e) => setDreamInput(e.target.value)}
                      placeholder="Describe your dream... (e.g., 'A cyberpunk city floating in neon clouds')"
                      className="w-full h-full bg-black text-white p-6 pt-6 pb-12 focus:outline-none resize-none placeholder:text-slate-600 font-normal text-base lg:text-lg border border-slate-800 rounded-lg focus:border-cyan-500/50 transition-colors flex-1"
                    />
                    
                    {/* Dictation Control Bar (Absolute Bottom Right) */}
                    <DictationControl
                        connections={connections}
                        updateConnection={updateConnection}
                        localTranscriber={localTranscriber}
                        isRecording={isRecording}
                        isTranscribing={isTranscribing}
                        onRecordToggle={isRecording ? stopRecording : startRecording}
                        onOpenSettings={() => setIsDictationSettingsOpen(true)}
                    />
                  </div>

                   {/* Model Selector & Status */}
                  <div className="mb-6">
                    <ModelSelector 
                        currentModel={engine.analysisModel}
                        onSelect={handleModelSelect}
                        availability={engine.modelAvailability}
                        isChecking={engine.isCheckingModels}
                        onConfigure={() => setIsAnalysisSettingsOpen(true)}
                    />
                  </div>

                  {/* Analysis Progress Bar */}
                  {dreamState.isAnalyzing && (
                      <div className="mb-4 px-1">
                          <ProgressBar 
                              progress={dreamState.analysisProgress} 
                              label="ANALYZING TEXT PATTERNS" 
                              statusText={dreamState.analysisStatus || 'Processing...'}
                              color="purple"
                          />
                          
                           <div className="mt-2 flex items-center justify-end">
                                <button
                                     onClick={engine.cancelAnalysis}
                                     className="text-[10px] font-bold uppercase text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                                >
                                     <X className="w-3 h-3" /> Cancel Analysis
                                </button>
                           </div>

                          {/* Live Pipeline Visualizer - Embedded on Main Screen */}
                           <div className="mt-4 bg-[#1a1a1c] border border-white/5 rounded-xl p-4 shadow-lg shadow-purple-900/5 animate-in slide-in-from-top-2">
                                <AnalysisPipelineVisualizer 
                                     layers={engine.analysisPipeline.layers} 
                                     currentLayerId={dreamState.currentLayerId}
                                     isAnalyzing={dreamState.isAnalyzing}
                                     finalAnalysis={dreamState.analysis}
                                />
                           </div>
                      </div>
                  )}

                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-0 px-4 py-3 bg-white/5 border-t border-white/5 rounded-xl border-x-0 border-b-0">
                    {/* Left: Attachment */}
                    <div className="flex items-center gap-2 justify-center md:justify-start order-2 md:order-1">
                        <button 
                            onClick={() => startInputRef.current?.click()}
                            className={`transition-colors flex items-center gap-2 ${attachments.length > 0 ? 'text-purple-400' : 'text-slate-500 hover:text-white'}`}
                        >
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-wider">
                                {attachments.length > 0 ? attachments[0].file.name.slice(0, 15) : 'Attach'}
                            </span>
                        </button>
                        {attachments.length > 0 && (
                            <button onClick={clearAttachment} className="text-slate-500 hover:text-red-400">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <input 
                            type="file" 
                            ref={startInputRef}
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>

                    {/* Center: Loop Mode Toggle */}
                    <div className="flex items-center justify-center gap-3 order-1 md:order-2">
                        <span className={`text-[10px] uppercase font-bold transition-colors ${!iterativeMode ? 'text-white' : 'text-slate-600'}`}>Single</span>
                         <button
                            onClick={() => setIterativeMode(!iterativeMode)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${iterativeMode ? 'bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transform transition-transform duration-300 ${iterativeMode ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-[10px] uppercase font-bold transition-colors ${iterativeMode ? 'text-purple-400' : 'text-slate-600'}`}>Loop</span>
                    </div>

                    {/* Right: Analyze Button */}
                    <div className="flex justify-center md:justify-end order-3">
                        <button
                            onClick={handleAnalyze}
                            disabled={dreamState.isLoading || !dreamInput.trim()}
                            className="w-full md:w-auto bg-white text-black hover:bg-slate-200 px-8 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            {dreamState.isLoading ? <Activity className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {dreamState.isLoading ? 'Analyzing...' : 'Analyze'}
                        </button>
                    </div>
                  </div>
                  {/* Spacer to balance height with Right Column's taller controls */}
                  <div className="h-20 hidden lg:block" />
              </div>
            </div>

            {dreamState.analysis && (
              <div ref={analysisRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-24">
                <AnalysisCard 
                    analysis={dreamState.analysis} 
                    editablePrompt={editablePrompt}
                    onPromptChange={setEditablePrompt}
                />
              </div>
            )}

            {showLogs && (
              <div className="h-48 rounded-xl border border-white/10 overflow-hidden">
                <LogConsole logs={logs} isOpen={true} onClose={() => { }} embedded />
              </div>
            )}
          </div>

          {/* Output/Media Section */}
          <div ref={mediaRef} className="flex flex-col gap-4 relative scroll-mt-24">
              <div className="relative group flex flex-col">
                <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col min-h-[500px]">
             
                     {/* Visual Output Modules (Always Visible) */}
                     <MediaPanel
                          imageUrl={dreamState.generatedImageUrl}
                          videoUrl={dreamState.generatedVideoUrl}
                          isGeneratingImage={dreamState.isGeneratingImage}
                          isGeneratingVideo={dreamState.isGeneratingVideo}
                              onGenerateImage={() => {
                                  handleGenerate();
                                  // Auto-close settings if open (optional, but Master modal usually stays or user closes it)
                                  setIsSystemSettingsOpen(false);
                              }}
                          onGenerateVideo={() => engine.generateVideo(editablePrompt)}
                          hasAnalysis={!!dreamState.analysis}
                          videoEnabled={true}
                          onSelectKey={() => { }}
                          onCancel={engine.cancelRender}

                          onOpenSettings={() => setIsGenerationSettingsOpen(true)}
                          onShowWorkflow={() => setShowVisualizationModal(true)}
                          isModelSelected={!!engine.comfySettings.model}
                          // settingsContent removed to use global dialog
                          onOpenVideoSettings={() => setIsVideoSettingsOpen(true)}
                          availableModels={availableModels}
                          availableNodeTypes={engine.availableNodeTypes}
                          currentModel={engine.comfySettings.model || ''}
                          currentVideoModel={engine.videoSettings.model}
                          onModelSelect={(m) => engine.setComfySettings(prev => ({ ...prev, model: m }))}
                          isComfyConnected={engine.isComfyConnected}
                          progress={dreamState.progress}
                          progressStatus={dreamState.progressStatus}
                          isVisualizing={(dreamState.progress > 0 && dreamState.progress < 100) || !!dreamState.generatedImageUrl}
                          visualizationContent={
                               (dreamState.progress > 0 && dreamState.progress < 100) ? (
                                      <>
                                          <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 tracking-widest uppercase flex items-center justify-between flex-shrink-0">
                                            <span>Neural Synthesis In Progress</span>
                                            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                                          </h3>
                                          
                                          <div className="w-full flex-1 bg-black/50 rounded-lg overflow-hidden border border-white/5 relative group min-h-[300px]">
                                            <WorkflowVisualizer
                                              settings={engine.comfySettings}
                                              workflowType={
                                                  engine.comfySettings.useIpAdapter && dreamState.attachments?.some(a => a.mimeType.startsWith('image/'))
                                                     ? 'IP-Adapter'
                                                     : dreamState.attachments?.some(a => a.mimeType.startsWith('image/')) 
                                                         ? 'Image-to-Image' 
                                                         : 'Text-to-Image'
                                              }
                                              activeNodeId={engine.activeNodeId}
                                              dynamicWorkflow={engine.activeWorkflow} 
                                              inputImageUrl={dreamState.attachments?.find(a => a.mimeType.startsWith('image/'))?.previewUrl}
                                              outputImageUrl={dreamState.generatedImageUrl}
                                            />
                                            {/* Overlay for interaction hint */}
                                            <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                                                 <span className="text-[9px] font-mono text-slate-500 bg-black/80 px-1 rounded">DRAG & ZOOM ENABLED</span>
                                            </div>
                                          </div>
                                      </>
                                  ) : (
                                      <ResultView 
                                           imageUrl={dreamState.generatedImageUrl || ''}
                                           title={null} // Hide Title/Analysis Type
                                           prompt={dreamState.analysis?.visualPrompt || dreamState.rawText}
                                           onReset={() => {
                                                setShowVisualizationModal(false);
                                           }}
                                      />
                                  )
                            }
                    />

                        {/* Feedback Modal for Iterative Loop */}
                        {showFeedbackModal && (
                           <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-[#1a1a1c] border border-purple-500/30 p-8 rounded-2xl max-w-lg w-full shadow-[0_0_50px_rgba(168,85,247,0.2)] animate-in zoom-in-95">
                              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <RotateCcw className="w-5 h-5 text-purple-400" />
                                Refine Iteration
                              </h3>
                              <p className="text-slate-400 text-sm mb-6">
                                The dream is fluid. Describe what needs to change, and the Neural Engine will evolve the vision.
                              </p>

                              <textarea
                                value={feedbackPrompt}
                                onChange={e => setFeedbackPrompt(e.target.value)}
                                placeholder="e.g., Make it darker, add more neon lights, change the style to oil painting..."
                                className="w-full bg-black/50 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 focus:outline-none min-h-[100px] mb-6"
                                autoFocus
                              />

                              <div className="flex gap-3">
                                <button
                                  onClick={() => setShowFeedbackModal(false)}
                                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-xs uppercase"
                                >
                                  <CheckCircle className="w-4 h-4 inline mr-2" />
                                  Keep This Version
                                </button>
                                <button
                                  onClick={handleRefine}
                                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 rounded-lg font-bold text-xs uppercase shadow-lg shadow-purple-900/30"
                                >
                                  <Play className="w-4 h-4 inline mr-2" />
                                  Evolve Dream
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                </div>{/* End Card Inner */}
            </div>{/* End Card Wrapper */}
          </div>
        </main>

      <Gallery isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
      
      <FallbackDialog
        isOpen={dreamState.showFallbackConfirmation || false}
        onConfirm={engine.confirmFallbackGeneration}
        onCancel={engine.cancelFallback}
        error={dreamState.error}
      />
    </div>
  );
}



import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConnectionProvider>
          <AppContent />
        </ConnectionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
