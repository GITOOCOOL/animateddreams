
import React, { useState, useEffect, useRef } from 'react';
import { DreamState, DreamAttachment } from './types';
import { analyzeDreamText, generateDreamImage, generateDreamVideo } from './services/geminiService';
import AnalysisCard from './components/AnalysisCard';
import MediaPanel from './components/MediaPanel';
import { Moon, Star, Sparkles, RefreshCw, AlertTriangle, Zap, Radio, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';

const App = () => {
  // Application State
  const [dreamState, setDreamState] = useState<DreamState>({
    rawText: '',
    attachments: [],
    analysis: null,
    generatedImageUrl: null,
    generatedVideoUrl: null,
    isAnalyzing: false,
    isGeneratingImage: false,
    isGeneratingVideo: false,
    error: null,
  });

  const [hasApiKey, setHasApiKey] = useState(false);
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

    setDreamState(prev => ({ ...prev, isAnalyzing: true, error: null }));
    try {
      const analysis = await analyzeDreamText(dreamState.rawText, dreamState.attachments);
      setDreamState(prev => ({ 
        ...prev, 
        analysis, 
        isAnalyzing: false 
      }));
    } catch (err: any) {
      setDreamState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        error: err.message || "Failed to analyze dream" 
      }));
    }
  };

  const handleGenerateImage = async () => {
    if (!dreamState.analysis?.visualPrompt) return;

    setDreamState(prev => ({ ...prev, isGeneratingImage: true, error: null }));
    try {
      const url = await generateDreamImage(dreamState.analysis.visualPrompt);
      setDreamState(prev => ({ 
        ...prev, 
        generatedImageUrl: url, 
        isGeneratingImage: false 
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
          <button 
             className="mt-6 md:mt-0 px-6 py-2 rounded-none border border-cyan-500 text-cyan-500 font-mono text-xs uppercase hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]"
             onClick={resetInterface}
          >
            [ Reset_Interface ]
          </button>
        </header>

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
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleAnalyze}
                    disabled={(!dreamState.rawText.trim() && dreamState.attachments.length === 0) || dreamState.isAnalyzing}
                    className={`
                      px-8 py-4 font-bold uppercase tracking-widest text-sm transition-all flex items-center gap-3 w-full justify-center
                      ${(!dreamState.rawText.trim() && dreamState.attachments.length === 0)
                        ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed' 
                        : dreamState.isAnalyzing
                          ? 'bg-slate-800 border border-purple-500 text-purple-400 cursor-wait'
                          : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]'
                      }
                    `}
                  >
                    {dreamState.isAnalyzing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {dreamState.isAnalyzing ? 'Processing...' : 'Analyze_Data'}
                  </button>
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
                  <span>STEP_02</span> <span className="text-purple-600">SEMANTIC_DECODE (GEMINI)</span>
                </li>
                <li className="flex justify-between">
                  <span>STEP_03</span> <span className="text-pink-600">VISUAL_SYNTHESIS (IMAGEN/VEO)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7 space-y-10">
            {dreamState.analysis ? (
              <>
                <AnalysisCard analysis={dreamState.analysis} />
                <MediaPanel 
                  imageUrl={dreamState.generatedImageUrl}
                  videoUrl={dreamState.generatedVideoUrl}
                  isGeneratingImage={dreamState.isGeneratingImage}
                  isGeneratingVideo={dreamState.isGeneratingVideo}
                  onGenerateImage={handleGenerateImage}
                  onGenerateVideo={handleGenerateVideo}
                  hasAnalysis={!!dreamState.analysis}
                  videoEnabled={hasApiKey}
                  onSelectKey={handleSelectKey}
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
      </div>
    </div>
  );
};

export default App;
