import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, ImageIcon, Activity, X, RotateCcw, Play, CheckCircle } from 'lucide-react';
import { useDreamEngine } from './hooks/useDreamEngine';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';
import AnalysisCard from './components/AnalysisCard';
import MediaPanel from './components/MediaPanel';
import WorkflowVisualizer from './components/WorkflowVisualizer';
import SettingsPanel from './components/SettingsPanel';
import Gallery from './components/Gallery';
import LogConsole from './components/LogConsole';
import DeveloperTools from './components/DeveloperTools';
import ProgressBar from './components/ProgressBar';
import LoginDialog from './components/LoginDialog';
import { analyzeDream } from './services/geminiService';

function AppContent() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [dreamInput, setDreamInput] = useState('');

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);

  // Iterative Mode API
  const [iterativeMode, setIterativeMode] = useState(false);
  const [feedbackPrompt, setFeedbackPrompt] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Logging Helper
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // Hook Access
  const engine = useDreamEngine(addLog);
  const { dreamState, setDreamState, generateImage, availableModels, availableLoras } = engine;

  // Login Check
  useEffect(() => {
    if (!user) setShowLogin(true);
    else {
      setShowLogin(false);
      addLog(`[System] User Authenticated: ${user.username}`);
    }
  }, [user, addLog]);


  // Handlers
  const handleAnalyze = () => engine.processDream(dreamInput);

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
      const newAnalysis = await analyzeDream(combinedPrompt);

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

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-purple-500/30">
      <LoginDialog isOpen={showLogin && !user} onClose={() => { }} />

      <Header
        isComfyConnected={engine.isComfyConnected}
        isRemote={engine.isRemote}
        onToggleDevTools={() => setShowDevTools(!showDevTools)}
        showLogs={showLogs}
        onToggleLogs={() => setShowLogs(!showLogs)}
        onReset={handleReset}
        onOpenGallery={() => setIsGalleryOpen(true)}
      />

      <main className="container mx-auto p-4 lg:p-6 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">

          {/* Left Column */}
          <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl p-1 overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
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

                <textarea
                  value={dreamInput}
                  onChange={(e) => setDreamInput(e.target.value)}
                  placeholder="Describe your dream... (e.g., 'A cyberpunk city floating in neon clouds')"
                  className="w-full bg-transparent text-white p-4 pt-8 min-h-[120px] focus:outline-none resize-none placeholder:text-slate-600 font-medium text-lg"
                />
                <div className="flex justify-between items-center px-4 py-3 bg-white/5 border-t border-white/5">
                  <button className="text-slate-500 hover:text-white transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={dreamState.isLoading || !dreamInput.trim()}
                    className="bg-white text-black hover:bg-slate-200 px-6 py-2 rounded-xl font-bold uppercase text-xs tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {dreamState.isLoading ? <Activity className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {dreamState.isLoading ? 'Analyzing...' : 'Analyze Dream'}
                  </button>
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
            {dreamState.analysis ? (
              <>
                <MediaPanel
                  imageUrl={dreamState.generatedImageUrl}
                  videoUrl={dreamState.generatedVideoUrl}
                  isGeneratingImage={dreamState.isGeneratingImage}
                  isGeneratingVideo={dreamState.isGeneratingVideo}
                  onGenerateImage={handleGenerate}
                  onGenerateVideo={() => { }}
                  hasAnalysis={!!dreamState.analysis}
                  videoEnabled={false}
                  onSelectKey={() => { }}
                  progress={dreamState.progress}
                  showSettingsPrompt={false}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onDismissSettingsPrompt={() => { }}
                />

                {(showVisualizationModal || dreamState.isGeneratingImage) && (
                  <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                    {!dreamState.isGeneratingImage && (
                      <button
                        onClick={() => {
                          setShowVisualizationModal(false);
                          // If we closed manually in loop mode, keep feedback modal open if it was triggered
                        }}
                        className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
                      >
                        <X className="w-8 h-8" />
                      </button>
                    )}

                    <div className="max-w-7xl w-full flex flex-col items-center">
                      <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-8 animate-pulse text-center tracking-widest uppercase">
                        {dreamState.isGeneratingImage ? "Neural Synthesis In Progress" : "Synthesis Complete"}
                      </h3>

                      <div className="w-full h-[60vh]">
                        <WorkflowVisualizer
                          settings={engine.comfySettings}
                          workflowType={dreamState.attachments?.some(a => a.mimeType.startsWith('image/')) ? 'Image-to-Image' : 'Text-to-Image'}
                          activeNodeId={engine.activeNodeId}
                          inputImageUrl={dreamState.attachments?.find(a => a.mimeType.startsWith('image/'))?.previewUrl}
                          outputImageUrl={dreamState.generatedImageUrl}
                        />
                      </div>

                      <div className="mt-8 w-full max-w-md">
                        {dreamState.isGeneratingImage ? (
                          <ProgressBar
                            progress={dreamState.progress}
                            label="GENERATING"
                            statusText={dreamState.progressStatus}
                            color="cyan"
                          />
                        ) : (
                          <div className="flex gap-4">
                            <button
                              onClick={() => setShowVisualizationModal(false)}
                              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-wider rounded-lg transition-all"
                            >
                              Close View
                            </button>

                            {/* Iterative Mode Trigger */}
                            {iterativeMode && (
                              <button
                                onClick={() => {
                                  setShowVisualizationModal(false);
                                  setShowFeedbackModal(true);
                                }}
                                className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-purple-900/40 transition-all border border-purple-400/50"
                              >
                                Continue Loop
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 border border-dashed border-white/10 bg-white/5 rounded-xl">
                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-mono text-xs uppercase tracking-widest opacity-50">Waiting for Dream Analysis</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={engine.comfySettings}
        onUpdate={engine.setComfySettings}
        availableModels={availableModels}
        availableLoras={availableLoras}
      />

      <Gallery isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
      {showDevTools && <DeveloperTools />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
