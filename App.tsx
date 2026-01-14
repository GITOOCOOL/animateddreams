import React, { useState, useEffect, useCallback } from 'react';
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
import Gallery from './components/Gallery';
import LogConsole from './components/LogConsole';
import DeveloperTools from './components/DeveloperTools';
import SettingsDialog from './components/SettingsDialog';

import SystemSettingsPanel from './components/SystemSettingsPanel';
import AnalysisSettingsPanel, { AnalysisSettings } from './components/AnalysisSettingsPanel';
import ModelSelector from './components/ModelSelector';
import ProgressBar from './components/ProgressBar';
import LoginDialog from './components/LoginDialog';
import { analyzeDreamGemini } from './services/geminiService';

function AppContent() {
  const { user } = useAuth();
  const { connections, updateConnection } = useConnections();
  const localTranscriber = useTranscriber();
  const [showLogin, setShowLogin] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [dreamInput, setDreamInput] = useState('');

  // UI State
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false);
  const [isAnalysisSettingsOpen, setIsAnalysisSettingsOpen] = useState(false);
  const [isGenerationSettingsOpen, setIsGenerationSettingsOpen] = useState(false);
  
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<{ file: File; startUrl: string; mimeType: string }[]>([]);
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
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>({
      temperature: 0.7,
      systemPrompt: "",
      modelOverride: ""
  });

  // Logging Helper
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // Hook Access
  const engine = useDreamEngine(addLog, devSettings);
  const { dreamState, setDreamState, generateImage, availableModels, availableLoras } = engine;
  
  // Audio Recorder
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
        const base64 = event.target?.result as string;
        setAttachments([{
          file,
          startUrl: URL.createObjectURL(file), // For preview
          mimeType: file.type
        }]);
        addLog(`[System] Image attached: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = () => setAttachments([]);

  const handleGenerate = async () => {
    setShowVisualizationModal(true);
    const url = await generateImage(dreamInput);

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
        title="Analysis Configuration"
      >
          <AnalysisSettingsPanel settings={analysisSettings} onSettingsChange={setAnalysisSettings} />
      </SettingsDialog>

      {/* 3. Generation Settings (ComfyUI) */}
       <SettingsDialog 
        isOpen={isGenerationSettingsOpen} 
        onClose={() => setIsGenerationSettingsOpen(false)}
        title="Neural Generation Parameters"
      >
          <SettingsPanel
            settings={engine.comfySettings}
            onSettingsChange={engine.setComfySettings}
            availableModels={availableModels}
            availableLoras={availableLoras}
            onDone={() => setIsGenerationSettingsOpen(false)}
          />
      </SettingsDialog>

      <Header
        isComfyConnected={engine.isComfyConnected}
        isRemote={engine.isRemote}
        onToggleDevTools={() => setShowDevTools(!showDevTools)}
        onReset={handleReset}
        onOpenGallery={() => setIsGalleryOpen(true)}
        showDevTools={showDevTools}
        logs={logs}
        devSettings={devSettings}
        onUpdateSettings={setDevSettings}
        onOpenSettings={() => setIsSystemSettingsOpen(true)} 
      />

      <main className="container mx-auto p-4 lg:p-6 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">

          {/* Left Column */}
          <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl p-6 sm:p-8">
                  
                  {/* Loop Mode Toggle (Absolute Top Right) */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded bg-black/50 border ${iterativeMode ? 'border-purple-500/50 text-purple-400' : 'border-slate-800 text-slate-600'}`}>
                      {iterativeMode ? 'Loop Mode' : 'Single Shot'}
                    </span>
                    <button
                      onClick={() => setIterativeMode(!iterativeMode)}
                      className={`w-8 h-4 rounded-full transition-colors ${iterativeMode ? 'bg-purple-600' : 'bg-slate-700'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full transform transition-transform ${iterativeMode ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Input Area */}
                  <div className="mb-4 relative">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="dream-input" className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                           Dream Mnemonic / Prompt
                        </label>

                    </div>
                    <textarea
                      id="dream-input"
                      value={dreamInput}
                      onChange={(e) => setDreamInput(e.target.value)}
                      placeholder="Describe your dream... (e.g., 'A cyberpunk city floating in neon clouds')"
                      className="w-full bg-transparent text-white p-4 pt-4 pb-12 min-h-[300px] focus:outline-none resize-none placeholder:text-slate-600 font-medium text-lg border border-white/5 rounded-xl focus:border-cyan-500/50 transition-colors"
                    />
                    
                    {/* Dictation Control Bar (Absolute Bottom Right) */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl p-1.5 shadow-xl z-20">
                        {/* Status Dot */}
                        <div 
                            className={`w-2 h-2 rounded-full mx-1.5
                                ${connections.transcriptionProvider === 'local' 
                                    ? (localTranscriber.isModelLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]')
                                    : (connections.transcriptionKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]')
                                }
                            `}
                            title={
                                connections.transcriptionProvider === 'local' 
                                    ? (localTranscriber.isModelLoading ? 'Model Downloading...' : 'Local Model Ready')
                                    : (connections.transcriptionKey ? 'API Key Set' : 'Missing API Key')
                            }
                        />

                        {/* Provider Selector */}
                        <div className="relative group">
                            <select
                                value={connections.transcriptionProvider}
                                onChange={(e) => updateConnection('transcriptionProvider', e.target.value)}
                                className="appearance-none bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white focus:outline-none pr-4 cursor-pointer"
                            >
                                <option value="local" className="bg-slate-900 text-slate-300">Local</option>
                                <option value="groq" className="bg-slate-900 text-slate-300">Groq</option>
                                <option value="openai" className="bg-slate-900 text-slate-300">OpenAI</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-white" />
                        </div>

                        {/* Divider */}
                        <div className="w-px h-4 bg-white/10 mx-1"></div>

                        {/* Settings Shortcut */}
                        <button 
                            onClick={() => setIsSystemSettingsOpen(true)}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Configure Voice Settings"
                        >
                            <Settings className="w-3 h-3" />
                        </button>

                        {/* Dictate Button */}
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isTranscribing || (connections.transcriptionProvider !== 'local' && !connections.transcriptionKey)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                                ${isRecording 
                                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' 
                                    : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'}
                                ${isTranscribing || (connections.transcriptionProvider !== 'local' && !connections.transcriptionKey) ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {isTranscribing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isRecording ? (
                                <Square className="w-3 h-3 fill-current" />
                            ) : (
                                <Mic className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">{isRecording ? 'Stop' : 'Dictate'}</span>
                        </button>
                    </div>
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

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 bg-white/5 border-t border-white/5 rounded-xl border-x-0 border-b-0">
                    {/* Left: Attachment */}
                    <div className="flex items-center gap-2 justify-start">
                        <button 
                            onClick={() => startInputRef.current?.click()}
                            className={`transition-colors flex items-center gap-2 ${attachments.length > 0 ? 'text-purple-400' : 'text-slate-500 hover:text-white'}`}
                        >
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-wider">
                                {attachments.length > 0 ? attachments[0].file.name.slice(0, 15) : 'Attach Media'}
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

                    {/* Center: Analyze Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleAnalyze}
                            disabled={dreamState.isLoading || !dreamInput.trim()}
                            className="bg-white text-black hover:bg-slate-200 px-10 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            {dreamState.isLoading ? <Activity className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {dreamState.isLoading ? 'Analyzing...' : 'Analyze Dream'}
                        </button>
                    </div>

                    {/* Right: Spacer */}
                    <div className="flex justify-end">
                    </div>
                </div>
              </div>
            </div>

            {dreamState.analysis && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AnalysisCard analysis={dreamState.analysis} />
              </div>
            )}

            {showLogs && (
              <div className="h-48 rounded-xl border border-white/10 overflow-hidden">
                <LogConsole logs={logs} isOpen={true} onClose={() => { }} embedded />
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl p-6 sm:p-8">
             
                     {/* Visual Output Modules (Always Visible) */}
                     <MediaPanel
                          imageUrl={dreamState.generatedImageUrl}
                          videoUrl={dreamState.generatedVideoUrl}
                          isGeneratingImage={dreamState.isGeneratingImage}
                          isGeneratingVideo={dreamState.isGeneratingVideo}
                              onGenerateImage={() => {
                                  handleGenerate();
                                  setIsGenerationSettingsOpen(false); // Auto-close settings
                              }}
                          onGenerateVideo={engine.generateVideo}
                          hasAnalysis={!!dreamState.analysis}
                          videoEnabled={true}
                          onSelectKey={() => { }}
                          progress={dreamState.progress}
                          onOpenSettings={() => setIsGenerationSettingsOpen(prev => !prev)}
                          onShowWorkflow={() => setShowVisualizationModal(true)}
                          isModelSelected={!!engine.comfySettings.model}
                          // settingsContent removed to use global dialog
                          videoSettingsContent={
                              <VideoSettingsPanel
                                settings={engine.videoSettings}
                                onSettingsChange={engine.setVideoSettings}
                              />
                          }
                          availableModels={availableModels}
                          currentModel={engine.comfySettings.model || ''}
                          onModelSelect={(m) => engine.setComfySettings(prev => ({ ...prev, model: m }))}
                          isComfyConnected={engine.isComfyConnected}
                          isVisualizing={showVisualizationModal || dreamState.isGeneratingImage}
                          visualizationContent={
                              <div className="w-full h-full flex flex-col gap-4">
                                  <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 tracking-widest uppercase flex items-center justify-between flex-shrink-0">
                                    <span>{dreamState.isGeneratingImage ? "Neural Synthesis In Progress" : "Synthesis Complete"}</span>
                                    {dreamState.isGeneratingImage && <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />}
                                  </h3>
                                  
                                  <div className="w-full flex-1 bg-black/50 rounded-lg overflow-hidden border border-white/5 relative group min-h-[300px]">
                                    <WorkflowVisualizer
                                      settings={engine.comfySettings}
                                      workflowType={dreamState.attachments?.some(a => a.mimeType.startsWith('image/')) ? 'Image-to-Image' : 'Text-to-Image'}
                                      activeNodeId={engine.activeNodeId}
                                      inputImageUrl={dreamState.attachments?.find(a => a.mimeType.startsWith('image/'))?.previewUrl}
                                      outputImageUrl={dreamState.generatedImageUrl}
                                    />
                                    {/* Overlay for interaction hint */}
                                    <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                                         <span className="text-[9px] font-mono text-slate-500 bg-black/80 px-1 rounded">DRAG & ZOOM ENABLED</span>
                                    </div>
                                  </div>

                                   {dreamState.isGeneratingImage ? (
                                      <div className="space-y-1 flex-shrink-0">
                                         <div className="flex justify-between text-[10px] font-mono uppercase text-cyan-400">
                                             <span>{dreamState.progressStatus}</span>
                                             <span>{Math.round(dreamState.progress)}%</span>
                                         </div>
                                         <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                                             <div 
                                                className="h-full bg-cyan-500 transition-all duration-300 ease-out"
                                                style={{ width: `${dreamState.progress}%` }}
                                             ></div>
                                         </div>
                                      </div>
                                   ) : (
                                       <button 
                                            onClick={() => setShowVisualizationModal(false)}
                                            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-xl transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(168,85,247,0.5)] flex-shrink-0 animate-in slide-in-from-bottom-2"
                                       >
                                            View Generated Dream
                                       </button>
                                   )}
                              </div>
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
        </div>
      </main>



      <Gallery isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
      

    </div>
  );
}



export default function App() {
  return (
    <AuthProvider>
      <ConnectionProvider>
        <AppContent />
      </ConnectionProvider>
    </AuthProvider>
  );
}
