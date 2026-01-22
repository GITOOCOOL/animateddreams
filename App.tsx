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
import { ThemeProvider } from './contexts/ThemeContext';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

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
import { Dashboard } from './components/layout/Dashboard';

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

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect Header handlers to use Navigate
  const handleOpenGallery = () => navigate('/gallery');
  const handleResetApp = () => {
      handleReset(); // Clears state
      navigate('/'); // Goes Home
  };
  const handleGoHome = () => {
      navigate('/'); // Only Goes Home (Persists State)
  };

  return (
    <div className="min-h-screen bg-app text-main font-sans selection:bg-purple-500/30">
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
            availableSamplers={engine.availableSamplers}
            availableSchedulers={engine.availableSchedulers}
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
            availableModels={availableModels}
            availableIPAdapters={engine.availableIPAdapters}
          />
      </SettingsDialog>

      <Header
        isComfyConnected={engine.isComfyConnected}
        isRemote={engine.isRemote}
        onToggleDevTools={() => ui.setShowDevTools(!ui.showDevTools)}
        onReset={handleResetApp}
        onGoHome={handleGoHome}
        onOpenGallery={handleOpenGallery}
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

      <Routes>
          <Route path="/" element={
              <Dashboard 
                  ui={ui}
                  logging={logging}
                  engineManager={engineManager}
                  engine={engine}
                  dreamState={dreamState}
                  dreamInput={dreamInput}
                  setDreamInput={setDreamInput}
                  attachments={attachments}
                  startInputRef={startInputRef}
                  handleImageUpload={handleImageUpload}
                  clearAttachment={clearAttachment}
                  localTranscriber={localTranscriber}
                  isRecording={isRecording}
                  isTranscribing={isTranscribing}
                  stopRecording={stopRecording}
                  startRecording={startRecording}
                  selectedDictationEngine={selectedDictationEngine}
                  setSelectedDictationEngine={setSelectedDictationEngine}
                  editablePrompt={editablePrompt}
                  setEditablePrompt={setEditablePrompt}
                  handleAnalyze={handleAnalyze}
                  selectedAnalysisEngine={selectedAnalysisEngine}
                  setSelectedAnalysisEngine={setSelectedAnalysisEngine}
                  handleGenerate={handleGenerate}
                  selectedImageEngine={selectedImageEngine}
                  setSelectedImageEngine={setSelectedImageEngine}
                  availableModels={availableModels}
                  handleRefine={handleRefine}
                  showFeedbackModal={showFeedbackModal}
                  setShowFeedbackModal={setShowFeedbackModal}
                  feedbackPrompt={feedbackPrompt}
                  setFeedbackPrompt={setFeedbackPrompt}
                  selectedVideoEngine={selectedVideoEngine}
                  setSelectedVideoEngine={setSelectedVideoEngine}
                  workflow={workflow} // Pass workflow
              />
          } />
          <Route path="/gallery" element={
              <div className="flex-1 overflow-y-auto">
                 <Gallery />
              </div>
          } />
      </Routes>
      
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
      <ThemeProvider>
        <AuthProvider>
          <ConnectionProvider>
            <EngineProvider>
              <Router>
                 <AppContent />
              </Router>
            </EngineProvider>
          </ConnectionProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
