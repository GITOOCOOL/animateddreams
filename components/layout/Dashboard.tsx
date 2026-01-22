import React, { useRef, useEffect } from 'react';
import { Terminal, ImageIcon, X, Loader2, RotateCcw, CheckCircle, Play } from 'lucide-react';
import { ArchitectureViewer } from '../visualizers/ArchitectureViewer';
import { DictationControl } from '../shared/DictationControl';
import AnalysisPanel from '../panels/AnalysisPanel';
import LogConsole from '../shared/LogConsole';
import MediaPanel from '../panels/MediaPanel';
import VideoPanel from '../panels/VideoPanel';
import WorkflowVisualizer from '../visualizers/WorkflowVisualizer';
import { ResultView } from '../panels/ResultView';
import { useEngineManager } from '../../hooks/useEngineManager';

// Define Props Interface based on what the dashboard uses
interface DashboardProps {
  ui: any; // Type accurately if possible, else any
  logging: any;
  engineManager: any;
  engine: any;
  dreamState: any;
  dreamInput: string;
  setDreamInput: (val: string) => void;
  attachments: any[];
  startInputRef: any;
  handleImageUpload: any;
  clearAttachment: any;
  localTranscriber: any;
  isRecording: boolean;
  isTranscribing: boolean;
  stopRecording: any;
  startRecording: any;
  selectedDictationEngine: any;
  setSelectedDictationEngine: any;
  
  editablePrompt: string;
  setEditablePrompt: any;
  handleAnalyze: any;
  selectedAnalysisEngine: any;
  setSelectedAnalysisEngine: any;
  
  handleGenerate: any;
  selectedImageEngine: any;
  setSelectedImageEngine: any;
  availableModels: any;
  
  handleRefine: any;
  showFeedbackModal: boolean;
  setShowFeedbackModal: any;
  feedbackPrompt: string;
  setFeedbackPrompt: any;

  selectedVideoEngine: any;
  setSelectedVideoEngine: any;
  workflow: any;
}

export const Dashboard: React.FC<DashboardProps> = ({
  ui, logging, engineManager, engine, dreamState, dreamInput, setDreamInput,
  attachments, startInputRef, handleImageUpload, clearAttachment,
  localTranscriber, isRecording, isTranscribing, stopRecording, startRecording,
  selectedDictationEngine, setSelectedDictationEngine,
  editablePrompt, setEditablePrompt, handleAnalyze, selectedAnalysisEngine, setSelectedAnalysisEngine,
  handleGenerate, selectedImageEngine, setSelectedImageEngine, availableModels,
  handleRefine, showFeedbackModal, setShowFeedbackModal, feedbackPrompt, setFeedbackPrompt,
  selectedVideoEngine, setSelectedVideoEngine, workflow
}) => {

   // Workflow Auto-Scroll Refs
  const analysisRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to Analysis 
  useEffect(() => {
    if (dreamState.analysis && analysisRef.current) {
        analysisRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [dreamState.analysis]);

  // Auto-scroll to Media
  useEffect(() => {
    if ((dreamState.isGeneratingImage || dreamState.generatedImageUrl) && mediaRef.current) {
        mediaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [dreamState.isGeneratingImage, dreamState.generatedImageUrl]);

  return (
      <main className="container mx-auto max-w-[1800px] px-4 py-6 flex-1 flex flex-col gap-6">
          
          {/* Input Module */}
          <div className="flex flex-col gap-4 relative">
              <div className="relative group flex flex-col">
                <div className="relative bg-surface border border-subtle rounded-2xl p-4 sm:p-6 flex flex-col min-h-[400px]">
                  
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
                      className="w-full h-full bg-app text-main p-6 pt-6 pb-12 focus:outline-none resize-none placeholder:text-dim rounded-lg border border-subtle focus:border-cyan-500/50 transition-colors flex-1"
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
                  <div className="flex items-center gap-2 px-4 py-3 bg-card border-t border-subtle rounded-xl">
                      <button 
                          onClick={() => startInputRef.current?.click()}
                          className={`transition-colors flex items-center gap-2 ${attachments.length > 0 ? 'text-purple-400' : 'text-dim hover:text-main'}`}
                      >
                          <ImageIcon className="w-5 h-5" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                              {attachments.length > 0 ? attachments[0].file.name.slice(0, 15) : 'Attach'}
                          </span>
                      </button>
                      {attachments.length > 0 && (
                          <button onClick={clearAttachment} className="text-dim hover:text-red-400">
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
                <div className="relative bg-surface border border-subtle rounded-2xl p-4 sm:p-6 flex flex-col min-h-[200px]">
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
                <div className="relative bg-surface border border-subtle rounded-2xl p-4 sm:p-6 flex flex-col min-h-[500px]">
             
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
                              ui.setActiveSettingsTab('workflow');
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
                                          
                                          <div className="w-full flex-1 bg-app/50 rounded-lg overflow-hidden border border-subtle relative group min-h-[300px]">
                                            <WorkflowVisualizer
                                              settings={engine.comfySettings}
                                              workflowType={
                                                  engine.comfySettings.useIpAdapter && dreamState.attachments?.some((a: any) => a.mimeType.startsWith('image/'))
                                                     ? 'IP-Adapter'
                                                     : dreamState.attachments?.some((a: any) => a.mimeType.startsWith('image/')) 
                                                         ? 'Image-to-Image' 
                                                         : 'Text-to-Image'
                                              }
                                              activeNodeId={engine.activeNodeId}
                                              dynamicWorkflow={engine.activeImageWorkflow} 
                                              inputImageUrl={dreamState.attachments?.find((a: any) => a.mimeType.startsWith('image/'))?.previewUrl}
                                              outputImageUrl={dreamState.generatedImageUrl}
                                            />
                                            {/* Overlay for interaction hint */}
                                            <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                                                 <span className="text-[9px] font-mono text-dim bg-black/80 px-1 rounded">DRAG & ZOOM ENABLED</span>
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
                <div className="relative bg-surface border border-subtle rounded-2xl p-4 sm:p-6 flex flex-col min-h-[500px]">
                    <VideoPanel
                        videoUrl={dreamState.generatedVideoUrl}
                        isGeneratingVideo={dreamState.isGeneratingVideo}
                        onGenerateVideo={() => engine.generateVideo(
                            editablePrompt,
                            engineManager.engines.find((e: any) => e.id === selectedVideoEngine)
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
                           <div className="fixed inset-0 z-[60] bg-app/90 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-surface border border-subtle-accent p-8 rounded-2xl max-w-lg w-full shadow-[0_0_50px_rgba(168,85,247,0.2)] animate-in zoom-in-95">
                              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <RotateCcw className="w-5 h-5 text-purple-400" />
                                Refine Iteration
                              </h3>
                              <p className="text-dim text-sm mb-6">
                                The dream is fluid. Describe what needs to change, and the Neural Engine will evolve the vision.
                              </p>

                              <textarea
                                value={feedbackPrompt}
                                onChange={e => setFeedbackPrompt(e.target.value)}
                                placeholder="e.g., Make it darker, add more neon lights, change the style to oil painting..."
                                className="w-full bg-app/50 border border-subtle rounded-xl p-4 text-white focus:border-purple-500 focus:outline-none min-h-[100px] mb-6"
                                autoFocus
                              />

                              <div className="flex gap-3">
                                <button
                                  onClick={() => setShowFeedbackModal(false)}
                                  className="flex-1 py-3 bg-card hover:bg-hover rounded-lg font-bold text-xs uppercase"
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
  );
};
