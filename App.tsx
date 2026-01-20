import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EngineProvider } from './contexts/EngineContext';
import { Sparkles, Terminal, Activity, X, Image as ImageIcon, Play, Pause, RotateCcw, Mic, Square, Loader2, CheckCircle, Settings, ChevronDown } from 'lucide-react';
import { useDreamEngine } from './hooks/useDreamEngine';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useTranscriber } from './hooks/useTranscriber';
import { useAppUI } from './hooks/useAppUI';
import { useLogging } from './hooks/useLogging';
import { useWorkflow } from './hooks/useWorkflow';
import { useEngineManager } from './hooks/useEngineManager';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConnectionProvider, useConnections } from './contexts/ConnectionContext';

import Header from './components/layout/Header';
import AnalysisCard from './components/shared/AnalysisCard';
import AnalysisPanel from './components/panels/AnalysisPanel';
import MediaPanel from './components/panels/MediaPanel';
import VideoPanel from './components/panels/VideoPanel';
import WorkflowVisualizer from './components/visualizers/WorkflowVisualizer';
import SettingsPanel from './components/panels/SettingsPanel';
import VideoSettingsPanel from './components/settings/VideoSettingsPanel';
import AnalysisPipelineVisualizer from './components/visualizers/AnalysisPipelineVisualizer';
import Gallery from './components/media/Gallery';
import LogConsole from './components/shared/LogConsole';
import DeveloperTools from './components/panels/DeveloperTools';
import SettingsDialog from './components/dialogs/SettingsDialog';

import SystemSettingsPanel from './components/settings/SystemSettingsPanel';
import AgentSettingsPanel from './components/settings/AgentSettingsPanel'; // New Dual Agent Panel
import ModelSelector from './components/shared/ModelSelector';


import ProgressBar from './components/shared/ProgressBar';
import LoginDialog from './components/dialogs/LoginDialog';
import { analyzeDreamGemini } from './services/geminiService';
import { DictationControl } from './components/shared/DictationControl';
import DictationSettingsPanel from './components/settings/DictationSettingsPanel';
import { FallbackDialog } from './components/dialogs/FallbackDialog';
import { ResultView } from './components/panels/ResultView';


import { ArchitectureViewer } from './components/visualizers/ArchitectureViewer';

function AppContent() {
  const { user } = useAuth();
  const { connections, updateConnection } = useConnections();
  const localTranscriber = useTranscriber();
  
  // Custom Hooks
  const ui = useAppUI();
  const logging = useLogging();
  
  // Engine Manager
  const engineManager = useEngineManager();
  
  // Selected engines for each module
  const [selectedAnalysisEngine, setSelectedAnalysisEngine] = useState<string | null>(null);
  const [selectedImageEngine, setSelectedImageEngine] = useState<string | null>(null);
  const [selectedVideoEngine, setSelectedVideoEngine] = useState<string | null>(null);
  const [selectedDictationEngine, setSelectedDictationEngine] = useState<string | null>(null);

  // Validate selected engines when engines list changes (e.g. deletion)
  useEffect(() => {
      const validateSelection = (selectedId: string | null, type: 'analysis' | 'image' | 'video' | 'dictation', setter: (id: string | null) => void) => {
          // If we have a selection but it's not in the list anymore
          if (selectedId && !engineManager.engines.find(e => e.id === selectedId)) {
              // Try to find a default engine for this type
              const defaultEngine = engineManager.engines.find(e => e.type === type && e.isDefault);
              // Or just the first one available
              const firstAvailable = engineManager.engines.find(e => e.type === type);
              
              if (defaultEngine) {
                  setter(defaultEngine.id);
                  logging.addLog(`[Engine] Selection reset to default for ${type}.`);
              } else if (firstAvailable) {
                  setter(firstAvailable.id);
                   logging.addLog(`[Engine] Selection reset to first available for ${type}.`);
              } else {
                  setter(null);
                  logging.addLog(`[Engine] Selection cleared for ${type} (no engines found).`);
              }
          }
           // If we have NO selection, try to select a default
          if (!selectedId) {
             const defaultEngine = engineManager.engines.find(e => e.type === type && e.isDefault);
             if (defaultEngine) {
                 setter(defaultEngine.id);
             }
          }
      };

      validateSelection(selectedAnalysisEngine, 'analysis', setSelectedAnalysisEngine);
      validateSelection(selectedImageEngine, 'image', setSelectedImageEngine);
      validateSelection(selectedVideoEngine, 'video', setSelectedVideoEngine);
      validateSelection(selectedDictationEngine, 'dictation', setSelectedDictationEngine);
  }, [engineManager.engines, selectedAnalysisEngine, selectedImageEngine, selectedVideoEngine, selectedDictationEngine, logging.addLog]);
  
  const [dreamInput, setDreamInput] = useState('');

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


  // Logging Helpers - MOVED TO useLogging HOOK

  // Hook Access
  // Workflow Engine
  const workflow = useWorkflow();

  // Hook Access
  const engine = useDreamEngine(
        logging.addLog, logging.addOllamaLog, logging.addComfyLog, 
        devSettings, 
        workflow.activeImageWorkflow,
        workflow.activeVideoWorkflow
  );
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
              const engineConfig = engineManager.engines.find(e => e.id === selectedDictationEngine);
              // Default to local if no engine selected or 'browser' provider
              const isLocal = !engineConfig || engineConfig.provider === 'browser' || engineConfig.id === 'browser-speech';
              
              setIsTranscribing(true);
              const providerName = engineConfig ? engineConfig.name : 'Browser Speech';
              logging.addLog(`[Dictation] Processing audio via ${providerName}...`);
              
              try {
                  if (isLocal) {
                      // Local WebGPU Transcription
                      await localTranscriber.transcribe(audioBlob);
                      // Text update handled by effect below
                  } else if (engineConfig) {
                      // Cloud Proxy (Groq / OpenAI / Custom)
                      const formData = new FormData();
                      formData.append('audio', audioBlob);
                      
                      const headers: HeadersInit = {};
                      if (engineConfig.provider === 'groq') {
                          headers['x-whisper-host'] = 'https://api.groq.com/openai/v1/audio/transcriptions';
                          headers['x-whisper-model'] = 'distil-whisper-large-v3-en'; 
                      } else if (engineConfig.provider === 'openai') {
                         headers['x-whisper-host'] = 'https://api.openai.com/v1/audio/transcriptions';
                      } else if (engineConfig.provider === 'custom') {
                          headers['x-whisper-host'] = engineConfig.config.url;
                      }
                      
                      if (engineConfig.config.apiKey) {
                          headers['x-api-key'] = engineConfig.config.apiKey;
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
                          logging.addLog("[Dictation] Text appended from Cloud.");
                      }
                      setIsTranscribing(false);
                      resetAudio();
                  }

              } catch (e: any) {
                  logging.addLog(`[Error] Dictation failed: ${e.message}`);
                  setIsTranscribing(false);
                  resetAudio();
              }
          };
          transcribe();
      }
  }, [audioBlob, logging.addLog, resetAudio, selectedDictationEngine, engineManager.engines, localTranscriber.transcribe]);

  // Sync Local Transcriber Text
  useEffect(() => {
     if (localTranscriber.text && connections.transcriptionProvider === 'local') {
         setDreamInput(prev => prev + (prev ? ' ' : '') + localTranscriber.text);
         logging.addLog("[Dictation] Text appended from Local Browser Model.");
         setIsTranscribing(false);
         resetAudio();
     }
  }, [localTranscriber.text, connections.transcriptionProvider]);

  // Sync Local Transcriber Loading Status
  useEffect(() => {
      if (connections.transcriptionProvider === 'local') {
        if (localTranscriber.isModelLoading) {
             logging.addLog(`[System] Downloading Whisper Model... ${Math.round(localTranscriber.progress)}%`);
        }
      }
  }, [localTranscriber.isModelLoading, localTranscriber.progress, connections.transcriptionProvider]);


  // Login Check
  useEffect(() => {
    if (!user) ui.setShowLogin(true);
    else {
      ui.setShowLogin(false);
      logging.addLog(`[System] User Authenticated: ${user.username}`);
    }
  }, [user, logging.addLog, ui.setShowLogin]);


  // Handlers
  const handleAnalyze = () => {
    const config = engineManager.engines.find(e => e.id === selectedAnalysisEngine);
    engine.processDream(dreamInput, attachments, config);
  };

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
          logging.addLog(`[System] Image attached: ${file.name} (${img.naturalWidth}x${img.naturalHeight})`);
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
          logging.addLog("⚠️ TIP: You attached an image, but your model ('" + currentModel + "') might not support vision.");
          logging.addLog("👉 Please select 'llava' or another vision model in Dream Agent Settings.");
          
          // Optional: Auto-open settings to help them
          // setIsAnalysisSettingsOpen(true); 
      }
    }
  };

  const clearAttachment = () => setAttachments([]);

  const handleGenerate = async () => {
    ui.setShowVisualizationModal(true);
    
    // Use editablePrompt if available, otherwise fallback
    const analysisOverride = dreamState.analysis ? { ...dreamState.analysis, visualPrompt: editablePrompt } : undefined;
    
    const url = await generateImage(
        dreamInput, 
        undefined, 
        analysisOverride,
        engineManager.engines.find(e => e.id === selectedImageEngine)
    );

    if (url && iterativeMode) {
      // In iterative mode, after generation, ask for next step
      setShowFeedbackModal(true);
    }
  };

  const handleRefine = async () => {
    if (!feedbackPrompt.trim()) return;
    setShowFeedbackModal(false);


    // Update Analysis with new Feedback
    logging.addLog("[Iterative] Refining prompt based on feedback...");
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
      logging.addLog(`[Error] Refinement Failed: ${e}`);
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
      <LoginDialog isOpen={ui.showLogin && !user} onClose={() => { }} />
      
      {/* 1. System Settings (Connections) */}
      <SettingsDialog 
        isOpen={ui.isSystemSettingsOpen} 
        onClose={() => ui.setIsSystemSettingsOpen(false)}
        title="System Connections"
      >
          <SystemSettingsPanel />
      </SettingsDialog>

        {/* 2. Analysis Settings (LLM) */}
       <SettingsDialog 
         isOpen={ui.isAnalysisSettingsOpen} 
         onClose={() => ui.setIsAnalysisSettingsOpen(false)}
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
        isOpen={ui.isDictationSettingsOpen} 
        onClose={() => ui.setIsDictationSettingsOpen(false)}
        title="Dictation Configuration"
      >
          <DictationSettingsPanel />
      </SettingsDialog>

      {/* 4. Image Generation Settings (ComfyUI) */}
       <SettingsDialog 
        isOpen={ui.isGenerationSettingsOpen} 
        onClose={() => ui.setIsGenerationSettingsOpen(false)}
        title="Image Generation Configuration"
      >
          <SettingsPanel
            settings={engine.comfySettings}
            onSettingsChange={engine.setComfySettings}
            availableModels={availableModels}
            availableLoras={availableLoras}
            availableIPAdapters={engine.availableIPAdapters}
            availableNodeTypes={engine.availableNodeTypes}
            inputImage={attachments.find(a => a.mimeType.startsWith('image/'))}
            onDone={() => ui.setIsGenerationSettingsOpen(false)}
            
             // Workflow Props
            workflowPresets={workflow.imagePresets}
            activePresetId={workflow.activeImagePresetId}
            onSelectPreset={workflow.loadImagePreset}
            onImportWorkflow={workflow.importImageWorkflow}
            initialTab={ui.activeSettingsTab}
          />
      </SettingsDialog>

      {/* 5. Video Settings (Google Veo) */}
       <SettingsDialog 
        isOpen={ui.isVideoSettingsOpen} 
        onClose={() => ui.setIsVideoSettingsOpen(false)}
        title="Video Generation Configuration"
      >
          <VideoSettingsPanel
            settings={engine.videoSettings}
            onSettingsChange={engine.setVideoSettings}
            onDone={() => ui.setIsVideoSettingsOpen(false)}
          />
      </SettingsDialog>

      <Header
        isComfyConnected={engine.isComfyConnected}
        isRemote={engine.isRemote}
        onToggleDevTools={() => ui.setShowDevTools(!ui.showDevTools)}
        onReset={handleReset}
        onOpenGallery={() => ui.setIsGalleryOpen(true)}
        showDevTools={ui.showDevTools}
        logs={{
            system: logging.logs,
            ollama: logging.ollamaLogs,
            comfy: logging.comfyLogs
        }}
        devSettings={devSettings}
        onUpdateSettings={setDevSettings}
        onOpenSettings={() => ui.setIsSystemSettingsOpen(true)} 
      />

      <main className="container mx-auto max-w-[1800px] px-4 py-6 flex-1 flex flex-col gap-6">
          
          {/* Input Module */}
          <div className="flex flex-col gap-4 relative">
              <div className="relative group flex flex-col">
                <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col min-h-[400px]">
                  
                  {/* Architecture Viewer Overlay */}
                  {ui.showArchitectureView && (
                      <ArchitectureViewer 
                        initialView={ui.architectureViewMode}
                        onClose={() => ui.setShowArchitectureView(false)} 
                      />
                  )}

                  {/* Input Module Header */}
                  <div className="flex items-center justify-between px-1 mb-4">
                      <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 tracking-widest uppercase flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-green-400" />
                          <span>Input Module</span>
                      </h3>
                  </div>

                  {/* Main Content Area */}
                  <div className="mb-4 relative flex-1 flex flex-col min-h-[300px]">
                    <textarea
                      id="dream-input"
                      value={dreamInput}
                      onChange={(e) => setDreamInput(e.target.value)}
                      placeholder="Describe your dream... (e.g., 'A cyberpunk city floating in neon clouds')"
                      className="w-full h-full bg-black text-white p-6 pt-6 pb-12 focus:outline-none resize-none placeholder:text-slate-600 font-normal text-base lg:text-lg border border-slate-800 rounded-lg focus:border-cyan-500/50 transition-colors flex-1"
                    />
                    
                    {/* Dictation Control Bar (Absolute Bottom Right) */}
                    <DictationControl
                        localTranscriber={localTranscriber}
                        isRecording={isRecording}
                        isTranscribing={isTranscribing}
                        onRecordToggle={isRecording ? stopRecording : startRecording}
                        onOpenSettings={() => ui.setIsDictationSettingsOpen(true)}
                        availableEngines={engineManager.getEnginesForModule('dictation')}
                        selectedEngineId={selectedDictationEngine}
                        onSelectEngine={setSelectedDictationEngine}
                    />
                  </div>

                  {/* Attachment Control */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-t border-white/5 rounded-xl">
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
                </div>
            </div>
          </div>

          {/* Prompt Analysis Module */}
          <div className="flex flex-col gap-4 relative scroll-mt-24">
              <div className="relative group flex flex-col">
                <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col min-h-[200px]">
                    <AnalysisPanel 
                        analysis={dreamState.analysis}
                        isLoading={dreamState.isAnalyzing}
                        status={dreamState.analysisStatus}
                        editablePrompt={editablePrompt}
                        onPromptChange={setEditablePrompt}
                        onAnalyze={handleAnalyze}
                        canAnalyze={!!dreamInput.trim()}
                        
                        availableEngines={engineManager.getEnginesForModule('analysis')}
                        selectedEngineId={selectedAnalysisEngine}
                        onSelectEngine={setSelectedAnalysisEngine}
                        
                        onConfigureAnalysis={() => ui.setIsAnalysisSettingsOpen(true)}
                        
                        analysisProgress={dreamState.analysisProgress}
                        onCancelAnalysis={engine.cancelAnalysis}
                        analysisPipeline={engine.analysisPipeline}
                        currentLayerId={dreamState.currentLayerId}
                    />
                </div>
            </div>
          </div>

          {ui.showLogs && (
            <div className="h-48 rounded-xl border border-white/10 overflow-hidden">
              <LogConsole logs={logging.logs} isOpen={true} onClose={() => { }} embedded />
            </div>
          )}

          {/* Image Generation Module */}
          <div ref={mediaRef} className="flex flex-col gap-4 relative scroll-mt-24">
              <div className="relative group flex flex-col">
                <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col min-h-[500px]">
             
                     {/* Image Output Module */}
                     <MediaPanel
                          imageUrl={dreamState.generatedImageUrl}
                          isGeneratingImage={dreamState.isGeneratingImage}
                              onGenerateImage={() => {
                                  handleGenerate();
                                  ui.setIsSystemSettingsOpen(false);
                              }}
                          hasAnalysis={!!dreamState.analysis}
                          onCancel={engine.cancelRender}

                          availableEngines={engineManager.getEnginesForModule('image')}
                          selectedEngineId={selectedImageEngine}
                          onSelectEngine={setSelectedImageEngine}

                          onOpenSettings={() => {
                              ui.setActiveSettingsTab('gen');
                              ui.setIsGenerationSettingsOpen(true);
                          }}
                          onOpenWorkflowSettings={() => {
                              ui.setActiveSettingsTab('workflow');
                              ui.setIsGenerationSettingsOpen(true);
                          }}
                          onShowWorkflow={() => ui.setShowVisualizationModal(true)}
                          isModelSelected={!!engine.comfySettings.model}
                          availableModels={availableModels}

                          currentModel={engine.comfySettings.model || ''}
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
                                              dynamicWorkflow={engine.activeImageWorkflow} 
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
                                                ui.setShowVisualizationModal(false);
                                           }}
                                      />
                                  )
                            }
                    />
                </div>
            </div>
          </div>

          {/* Video Generation Module */}
          <div className="flex flex-col gap-4 relative scroll-mt-24">
              <div className="relative group flex flex-col">
                <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col min-h-[500px]">
                    <VideoPanel
                        videoUrl={dreamState.generatedVideoUrl}
                        isGeneratingVideo={dreamState.isGeneratingVideo}
                        onGenerateVideo={() => engine.generateVideo(
                            editablePrompt,
                            engineManager.engines.find(e => e.id === selectedVideoEngine)
                        )}
                        videoEnabled={true}
                        onSelectKey={() => { }}
                        currentVideoModel={engine.videoSettings.model}
                        onOpenVideoSettings={() => ui.setIsVideoSettingsOpen(true)}
                        hasAnalysis={!!dreamState.analysis}
                        
                        availableEngines={engineManager.getEnginesForModule('video')}
                        selectedEngineId={selectedVideoEngine}
                        onSelectEngine={setSelectedVideoEngine}
                    />
                </div>
            </div>
          </div>

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
        </main>

      <Gallery isOpen={ui.isGalleryOpen} onClose={() => ui.setIsGalleryOpen(false)} />
      
      <FallbackDialog
        isOpen={dreamState.showFallbackConfirmation || false}
        onConfirm={engine.confirmFallbackGeneration}
        onCancel={engine.cancelFallback}
        error={dreamState.error}
      />
    </div>
  );
}



import ErrorBoundary from './components/shared/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConnectionProvider>
          <EngineProvider>
             <AppContent />
          </EngineProvider>
        </ConnectionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
