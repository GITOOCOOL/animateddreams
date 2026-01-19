import { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeDreamGemini } from '../services/geminiService';
import { generateComfyImage, generateComfyVideo, checkComfyConnection, getAvailableModels, getAvailableLoras, getAvailableIPAdapters, cancelGeneration } from '../services/comfyService';
import { saveDreamToDatabase } from '../services/storageService';
import { DreamState, ComfySettings, VideoSettings, DreamAttachment } from '../types';
import { useConnections } from '../contexts/ConnectionContext';

// Polyfill for crypto.randomUUID in insecure contexts (HTTP LAN)
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Simple UUID v4 polyfill
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> (+c / 4)).toString(16)
    );
};

export const useDreamEngine = (
    addLog: (msg: string) => void, 
    addOllamaLog: (msg: string) => void, 
    addComfyLog: (msg: string) => void, 
    devSettings = { mockAnalysis: false, mockGeneration: false }
) => {
    const { connections } = useConnections();
    const comfyHost = connections.runpodServerId 
        ? `https://${connections.runpodServerId}-8188.proxy.runpod.net` 
        : connections.comfyHost;
    const [dreamState, setDreamState] = useState<DreamState>({
        isLoading: false,
        progress: 0,
        analysisProgress: 0,
        progressStatus: 'Ready',
        analysisStatus: 'Ready', // Init separate status
        rawText: '',
        attachments: [],
        analysis: null,
        generatedImageUrl: null,
        generatedVideoUrl: null,
        isAnalyzing: false,
        isGeneratingImage: false,
        isGeneratingVideo: false,
        error: null,
        showFallbackConfirmation: false
    });

    const [isCheckingModels, setIsCheckingModels] = useState({
        gemini: false,
        ollama: false,
        raw: false
    });

    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [isComfyConnected, setIsComfyConnected] = useState(false);
    const [isRemote, setIsRemote] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]); // Comfy Models
    const [availableLoras, setAvailableLoras] = useState<string[]>([]);
    const [availableIPAdapters, setAvailableIPAdapters] = useState<string[]>([]);
    const [availableNodeTypes, setAvailableNodeTypes] = useState<string[]>([]); // New State
    const [availableOllamaModels, setAvailableOllamaModels] = useState<string[]>([]); // New: Ollama Models
    
    // Analysis Settings
    const [analysisModel, setAnalysisModel] = useState<'gemini' | 'ollama' | 'raw' | null>(null);

    // Active Workflow State (for Visualization)
    const [activeWorkflow, setActiveWorkflow] = useState<any>(null);

    // Comfy Settings State
    const [comfySettings, setComfySettings] = useState<ComfySettings>({
        steps: 25,
        cfg: 7.0,
        sampler: 'euler',
        scheduler: 'normal',
        width: 1344,
        height: 768,
        batchSize: 1,
        model: '', // User must select
        loras: [], // Multi-LoRA Support
        lora: 'None', // Legacy: Keep for now until full migration
        loraStrength: 1.0,
        denoise: 0.75,
        seed: undefined,
        ipAdapterModel: ''
    });

    const [videoSettings, setVideoSettings] = useState<VideoSettings>({
        model: '', // Requires manual selection
        fps: 24,
        duration: 6,
        motionBucketId: 127
    });

    // Multi-Layer Pipeline Settings
    const [analysisPipeline, setAnalysisPipeline] = useState<import('../types').AnalysisPipeline>({
        layers: [
            {
                id: 'default-layer-vision',
                name: "Image Analyzer",
                role: "Vision",
                enabled: true,
                config: {
                    provider: 'ollama',
                    model: import.meta.env.VITE_OLLAMA_VISION_MODEL || 'llava:latest',
                    temperature: 0.2,
                    systemPrompt: "You are an expert Computer Vision Analyst. Describe the main subject, lighting, colors, style, and composition of the input image. Be specific and focus on artistic intent."
                }
            },
            {
                id: 'default-layer-enhancer',
                name: "Prompt Engineer",
                role: "Enhancer",
                enabled: true,
                config: {
                    provider: 'ollama',
                    model: import.meta.env.VITE_OLLAMA_TEXT_MODEL || 'llama3:latest',
                    temperature: 0.7,
                    systemPrompt: "You are an expert AI Art Director. ENHANCE the input concept into a high-quality SDXL prompt. RETAIN user intent but ADD professional keywords (8k, unreal engine 5, cinematic). Focus on visual descriptors."
                }
            },
            {
                id: 'default-layer-json',
                name: "JSON Formatter",
                role: "Formatter",
                enabled: true,
                config: {
                    provider: 'ollama',
                    model: import.meta.env.VITE_OLLAMA_TEXT_MODEL || 'llama3:latest',
                    temperature: 0.1,
                    systemPrompt: "You are a Data Formatter. Convert the provided artistic description into a valid JSON object. \n\nReturn ONLY valid JSON with this exact structure:\n{ \"title\": \"...\", \"summary\": \"...\", \"interpretation\": \"...\", \"symbolism\": [...], \"mood\": \"...\", \"visualPrompt\": \"...\" }"
                }
            }
        ]
    });


    // Engine Versions
    const [engineVersions, setEngineVersions] = useState({
        ollama: null as string | null,
        comfy: null as string | null
    });

    // Model Availability State
    const [modelAvailability, setModelAvailability] = useState({
        gemini: false,
        ollama: false,
        raw: true
    });

    // Refs
    const abortRef = useRef<AbortController | null>(null);

    // Initial Progress Loop
    useEffect(() => {
        // checks removed to allow dynamic updates when settings change

        const checkAllConnections = async () => {
            // Check ComfyUI (Ping Only)
            const comfyOnline = await checkComfyConnection(comfyHost);
            
            // State Transition: Offline -> Online (or Initial Check)
            if (comfyOnline && !isComfyConnected) {
                setIsComfyConnected(true);
                
                // Fetch Heavy Data (Models, LoRAs, Stats) ONLY on Connect
                import('../services/comfyService').then(m => m.getSystemStats(comfyHost).then(stats => {
                    let version = "Connected";
                    if (stats && stats.system && stats.system.os) {
                         version = "v0.3.14+"; 
                         setEngineVersions(prev => ({ ...prev, comfy: version }));
                    } else {
                         setEngineVersions(prev => ({ ...prev, comfy: version }));
                    }
                }));

                getAvailableModels(comfyHost).then(models => {
                    setAvailableModels(models);
                    if (models.length > 0) {
                        addLog(`Neural Core Online (${models.length} Models Available)`);
                    } else {
                        addLog("Neural Core Online (No Models Found)");
                    }
                });
                getAvailableLoras(comfyHost).then(loras => setAvailableLoras(loras));
                getAvailableIPAdapters(comfyHost).then(ips => {
                     setAvailableIPAdapters(ips);
                     // Set default if exists and not set
                     if (ips.length > 0) {
                         setComfySettings(prev => ({ ...prev, ipAdapterModel: ips.find(m => m.includes('plus_sdxl_vit-h')) || ips[0] }));
                     }
                });
                // Fetch Node Definitions
                import('../services/comfyService').then(m => m.getAvailableNodeTypes(comfyHost).then(types => setAvailableNodeTypes(types)));

            } else if (!comfyOnline && isComfyConnected) {
                // State Transition: Online -> Offline
                setIsComfyConnected(false);
                addLog("Neural Core Offline");
                // Optional: Clear models? setAvailableModels([]); 
            }
            
            // Check Ollama (Ping Only) - Conditional: always check for now
            const ollamaSvc = await import('../services/ollamaService');
            const ollamaOnline = await ollamaSvc.checkOllamaConnection(connections.ollamaHost);
            
            if (ollamaOnline && !modelAvailability.ollama) {
                // State Transition: Offline -> Online
                setModelAvailability(prev => ({ ...prev, ollama: true }));
                
                // Fetch Version only on connect
                const ver = await ollamaSvc.getOllamaVersion(connections.ollamaHost);
                const version = ver || "Unknown";
                setEngineVersions(prev => ({ ...prev, ollama: version }));

                const textModel = import.meta.env.VITE_OLLAMA_TEXT_MODEL || 'llama3:latest';
                addLog(`Ollama Detected (v${version})`);

                // Fetch Models List
                ollamaSvc.getOllamaModels(connections.ollamaHost).then(models => {
                        setAvailableOllamaModels(models);
                }); // Check every 10s for new models? maybe overkill.
                
            } else if(!ollamaOnline && modelAvailability.ollama) {
                // State Transition: Online -> Offline
                setModelAvailability(prev => ({ ...prev, ollama: false }));
                // addLog("Ollama Connection Lost"); // Optional logging
            }
            
        };

        // Initial check
        checkAllConnections();

        // Heartbeat Interval (10 seconds)
        const intervalId = setInterval(checkAllConnections, 10000);

        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            setIsRemote(true);
        }

        return () => clearInterval(intervalId);
    }, [addLog, comfyHost, connections.ollamaHost, isComfyConnected, modelAvailability.ollama, availableModels.length]);

    const processDream = async (dreamInput: string, attachments: DreamAttachment[] = []) => {
        if (!dreamInput.trim()) return;

        // Check for RAW bypass
        if (analysisModel === 'raw') {
            setDreamState(prev => ({
                ...prev,
                isAnalyzing: true, 
                analysisProgress: 50, 
                error: null,
                analysisStatus: 'Bypassing Neural Analysis...',
                rawText: dreamInput,
                attachments
            }));
            
            // Simulate brief delay for UX
            await new Promise(r => setTimeout(r, 600));

            const dummyAnalysis = {
                title: "Direct Input",
                summary: "Raw input used directly.",
                interpretation: "Neural bypass active.",
                symbolism: [],
                visualPrompt: dreamInput, 
                mood: "Neutral"
            };
            
            setDreamState(prev => ({
                ...prev,
                isAnalyzing: false,
                analysisProgress: 100,
                analysisStatus: 'Ready',
                analysis: dummyAnalysis
            }));
            addLog("[System] Analysis Bypassed (Raw Mode).");
            return;
        }

        const activeLayers = analysisPipeline.layers.filter(l => l.enabled);
        
        if (activeLayers.length === 0) {
             addLog("[Error] No active analysis layers defined.");
             return;
        }

        abortRef.current = new AbortController();

        setDreamState(prev => ({
            ...prev,
            isAnalyzing: true, 
            analysisProgress: 0, 
            error: null,
            analysisStatus: 'Starting Pipeline...',
            currentLayerId: undefined,
            rawText: dreamInput,
            attachments
        }));
        
        // Multi-Layer Execution Loop
        let currentContext = dreamInput; // Output of previous layer inputs into next
        let finalJsonResult: any = null;

        try {
            const ollamaSvc = await import('../services/ollamaService');
            
            for (let i = 0; i < activeLayers.length; i++) {
                
                if (abortRef.current?.signal.aborted) throw new Error("Analysis Cancelled");

                const layer = activeLayers[i];
                addLog(`[Pipeline] Running Layer ${i+1}: ${layer.name} (${layer.config.provider})`);
                
                setDreamState(prev => ({
                    ...prev,
                    currentLayerId: layer.id,
                    analysisStatus: `Processing: ${layer.name}...`,
                    analysisProgress: Math.round(((i) / activeLayers.length) * 100)
                }));

                let layerOutput;

                if (layer.config.provider === 'raw') {
                    // Pass-through or simple verify
                    layerOutput = currentContext;
                    addLog(`[Pipeline] Raw Pass-through.`);
                } else if (layer.config.provider === 'ollama') {
                     // Run Ollama Layer
                     layerOutput = await ollamaSvc.runOllamaLayer(
                        connections.ollamaHost, 
                        layer.config, 
                        // For first layer, use raw input. For others, use context.
                        // We append "Original Input: ..." if needed, but for now simple chain.
                        // Actually, we should probably keep original input accessible.
                        i === 0 ? currentContext : `Original Request: ${dreamInput}\n\nContext to Process:\n${typeof currentContext === 'string' ? currentContext : JSON.stringify(currentContext)}`,
                        currentContext,
                        attachments.map(a => a.base64),
                        addOllamaLog,
                        abortRef.current?.signal
                     );
                } else if (layer.config.provider === 'gemini') {
                     // Wrapper for Gemini (assumes it handles string/json)
                     addLog(`[Pipeline] Gemini Layer invoked.`);
                     const fullPrompt = layer.config.systemPrompt 
                        ? `${layer.config.systemPrompt}\n\nInput: ${typeof currentContext === 'string' ? currentContext : JSON.stringify(currentContext)}` 
                        : typeof currentContext === 'string' ? currentContext : JSON.stringify(currentContext);
                     
                     const geminiResult = await analyzeDreamGemini(fullPrompt, attachments);
                     layerOutput = geminiResult; 
                }

                // Check for Refusals / Safety Filters
                if (typeof layerOutput === 'string') {
                    const REFUSAL_PATTERNS = [
                        "I cannot create explicit content",
                        "I cannot fulfill this request",
                        "I apologize",
                        "safety guidelines",
                        "unable to generate",
                        "explicit or adult content",
                        "I cannot generate"
                    ];
                    
                    const lowerOutput = layerOutput.toLowerCase();
                    if (REFUSAL_PATTERNS.some(p => lowerOutput.includes(p.toLowerCase()))) {
                         addLog(`[System] Model Refusal Detected: "${layerOutput.slice(0, 50)}..."`);
                         throw new Error("Model Refused Request (Safety Filter). Try using 'Raw Mode' or adjusting your prompt.");
                    }
                }

                // Update Context for next layer
                currentContext = layerOutput;
                
                // If it's the last layer, use this as final result
                if (i === activeLayers.length - 1) {
                    finalJsonResult = layerOutput;
                }
            }
            
            if (abortRef.current?.signal.aborted) throw new Error("Analysis Cancelled");

            // Final Validation
            // Ensure we have a valid DreamAnalysis object (title, visualPrompt, etc)
            // If the last layer output is just a string, we wrap it.
            let validAnalysis: any = finalJsonResult;
            
             // Robust Validation Strategy
            if (typeof validAnalysis === 'string') {
                 // Try to see if it's a stringified JSON
                 try {
                     const parsed = JSON.parse(validAnalysis);
                     if (typeof parsed === 'object' && parsed !== null) {
                         validAnalysis = parsed;
                     } 
                 } catch (e) {
                     // Not JSON, assume raw string
                 }
            }
            
            // Check if it's still a string (failed parse) or missing visualPrompt
            if (typeof validAnalysis === 'string') {
                 validAnalysis = {
                    title: "Pipeline Result (Raw)",
                    summary: "Generated via multi-layer pipeline.",
                    interpretation: validAnalysis.slice(0, 100) + "...",
                    symbolism: [],
                    visualPrompt: validAnalysis, 
                    mood: "Neutral"
                 };
            } else if (typeof validAnalysis === 'object' && validAnalysis !== null) {
                 // Check for "visualPrompt", fallback to common synonyms
                 if (!validAnalysis.visualPrompt) {
                     validAnalysis.visualPrompt = validAnalysis.visual_prompt || validAnalysis.prompt || validAnalysis.sdxl_prompt || validAnalysis.description;
                 }
                 
                 // If STILL missing, fallback to stringifying the whole object as prompt (better than error)
                 if (!validAnalysis.visualPrompt) {
                     validAnalysis.visualPrompt = JSON.stringify(validAnalysis);
                 }

                 // CRITICAL: Ensure arrays exist to prevent UI Crashes
                 if (!Array.isArray(validAnalysis.symbolism)) {
                     validAnalysis.symbolism = [];
                 }
                 if (!validAnalysis.mood) validAnalysis.mood = "Neutral";
                 if (!validAnalysis.title) validAnalysis.title = "Untitled Analysis";
            } else {
                 // Null or undefined
                 throw new Error("Pipeline returned empty result.");
            }

            setDreamState(prev => ({
                ...prev,
                analysis: validAnalysis,
                isAnalyzing: false, // Done
                analysisProgress: 100,
                analysisStatus: 'Pipeline Complete',
                currentLayerId: undefined // Reset visualizer active state
            }));
            addLog("Pipeline Execution Successful");            

        } catch (error) {
            console.error(error);
            setDreamState(prev => ({
                ...prev,
                isLoading: false, 
                analysisProgress: 0,
                isAnalyzing: false, 
                error: error instanceof Error ? error.message : 'Pipeline Failed',
                showFallbackConfirmation: error instanceof Error && error.message === "Analysis Cancelled" ? false : true 
            }));
            addLog(`Pipeline Error: ${error}`);
            if (!(error instanceof Error && error.message === "Analysis Cancelled")) {
                addLog("Waiting for fallback...");
            }
        } finally {
            abortRef.current = null;
            if (!dreamState.showFallbackConfirmation) {
                 setDreamState(prev => ({ ...prev, isLoading: false }));
            }
        }
    };

    const cancelAnalysis = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            addLog("[System] Analysis Cancellation Requested.");
        }
    }, [addLog]);

    const generateImage = async (originalPrompt: string, inputImage?: File, analysisOverride?: any) => {
        const analysisToUse = analysisOverride || dreamState.analysis;
        if (!analysisToUse) return;
        
        if (!comfySettings.model) {
            addLog("[Error] No Neural Model Selected. Please configure in settings.");
            alert("Please select a model in settings before generating."); // Simple feedback for now
            return;
        }

        setDreamState(prev => ({
            ...prev,
            isGeneratingImage: true,
            progress: 0, // Reset generation progress
            progressStatus: 'Initializing Core...',
            generatedImageUrl: undefined
        }));
        addLog("Initiating Generation...");

        try {
            let imageUrl;
            
            if (devSettings.mockGeneration) {
                await new Promise(r => setTimeout(r, 2000));
                // Use a placeholder image from a public source or local asset
                imageUrl = "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?q=80&w=2070&auto=format&fit=crop"; 
                addLog("[MOCK] Image generated successfully");
                
                // Simulate progress updates
                setDreamState(prev => ({ ...prev, progress: 100, progressStatus: 'Complete' }));
            } else {
                imageUrl = await generateComfyImage(
                    analysisToUse.visualPrompt,
                    originalPrompt,
                    (val, max, stats) => {
                        let status = `Sampling ${val}/${max}`;
                        
                        // Always append stats if available
                        if (stats && (stats.itS > 0 || stats.eta > 0)) {
                            status += ` · ${stats.itS.toFixed(2)}it/s`;
                            if (stats.eta > 0) status += ` · ${stats.eta}s left`;
                        }
                        
                        // If complete, append decoding
                        if (val >= max) {
                             status = `Decoding... ${stats ? `(${stats.itS.toFixed(2)}it/s)` : ''}`;
                        }

                        console.log("Progress Update:", status); // Debug log

                        setDreamState(prev => ({
                            ...prev,
                            progress: Math.round((val / max) * 100),
                            progressStatus: status
                        }));
                    },
                    (nodeId) => setActiveNodeId(nodeId),
                    inputImage || dreamState.attachments?.find(a => a.mimeType.startsWith('image/'))?.file,
                    comfySettings,
                    addComfyLog, // <--- CORRECT LOGGER
                    comfyHost
                );
            }

            setDreamState(prev => ({
                ...prev,
                isGeneratingImage: false,
                progress: 100,
                progressStatus: 'Complete',
                generatedImageUrl: imageUrl
            }));
            addLog("Generation Successful");

            // Save to Database
            try {
                await saveDreamToDatabase({
                    id: generateUUID(),
                    rawText: dreamState.rawText || originalPrompt, // Fallback to prompt if rawText missing
                    analysis: analysisToUse,
                    generatedImageUrl: imageUrl
                });
                addLog("Dream Saved to History");
            } catch (saveError) {
                console.error("Failed to save dream:", saveError);
                addLog(`Warning: Failed to save dream (${saveError})`);
            }

            return imageUrl;

        } catch (error: any) {
            console.error(error);
            
            // Enhanced Error Handling for Common Missing Models
            let errorMessage = "Generation failed";
            if (error?.message?.includes("ClipVision model not found")) {
                 errorMessage = "Missing Dependency: CLIP Vision Model. Please download 'CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors' to 'ComfyUI/models/clip_vision'.";
            } else if (error?.message?.includes("IPAdapter")) {
                 errorMessage = `IP-Adapter Error: ${error.message}. Verify models in 'ComfyUI/models/ipadapter'.`;
            } else {
                 errorMessage = `Generation Failed: ${error?.message || error}`;
            }

            setDreamState(prev => ({
                ...prev,
                isGeneratingImage: false,
                progress: 0,
                error: errorMessage
            }));
            addLog(`[Error] ${errorMessage}`);
        }
    };

    const generateVideo = async (promptOverride?: string) => {
        const isAnimateDiff = videoSettings.model?.toLowerCase().includes('animate') || videoSettings.model?.toLowerCase().includes('motion');
        
        if (!dreamState.generatedImageUrl && !isAnimateDiff) {
             addLog("[Error] No Source Image. Please generate an image first or switch to an AnimateDiff model.");
             return;
        }

        setDreamState(prev => ({
            ...prev,
            isGeneratingVideo: true,
            generatedVideoUrl: null, // Clear previous output
            progress: 0,
            progressStatus: 'Initializing SVD Core...'
        }));
        addLog("Initiating Video Generation...");

        try {
            let videoUrl;
            if (devSettings.mockGeneration) {
                 await new Promise(r => setTimeout(r, 3000));
                 videoUrl = "https://cdn.pixabay.com/vimeo/328456616/bamboos-27137.mp4?width=1280&hash=8f278c2e6f47702f3068f303250486829701469e";
                 addLog("[MOCK] Video generated.");
            } else {
                 videoUrl = await generateComfyVideo(
                     dreamState.generatedImageUrl,
                     videoSettings,
                     (val, max) => {
                        setDreamState(prev => ({
                            ...prev,
                            progress: Math.round((val / max) * 100),
                            progressStatus: `Rendering Frame ${val}/${max}`
                        }));
                     },
                     addLog,
                     comfyHost,
                     promptOverride || dreamState.analysis?.visualPrompt || dreamState.rawText || "A cinematic video",
                     (nodeId) => setActiveNodeId(nodeId), // Active Node Tracking
                     (workflow) => setActiveWorkflow(workflow) // Workflow Structure Capture
                 );
            }

            setDreamState(prev => ({
                ...prev,
                isGeneratingVideo: false,
                progress: 100,
                progressStatus: 'Complete',
                generatedVideoUrl: videoUrl
            }));
            addLog("Video Generation Successful");

            // Save to Database
            const analysisToSave = dreamState.analysis || {
                title: "Video Generation",
                summary: "Direct video generation",
                interpretation: "None",
                symbolism: [],
                visualPrompt: promptOverride || dreamState.rawText || "Video"
            };

            try {
                await saveDreamToDatabase({
                    id: generateUUID(),
                    rawText: dreamState.rawText || "Video Generation",
                    analysis: analysisToSave, // Safe assertion or fallback
                    generatedVideoUrl: videoUrl
                });
                addLog("Video Dream Saved to History");
            } catch (saveError) {
                console.error("Failed to save video dream:", saveError);
                addLog(`Warning: Failed to save video (${saveError})`);
            }

        } catch (error) {
             console.error(error);
             setDreamState(prev => ({
                ...prev,
                isGeneratingVideo: false,
                error: "Video generation failed"
             }));
             addLog(`Video Failed: ${error}`);
        }
    };

    const resetState = () => {
        setDreamState({ isLoading: false, progress: 0, analysisProgress: 0, progressStatus: 'Ready', rawText: '', attachments: [], analysis: null, generatedImageUrl: null, generatedVideoUrl: null, isAnalyzing: false, isGeneratingImage: false, isGeneratingVideo: false, error: null, showFallbackConfirmation: false });
        setActiveNodeId(null);
        addLog("System Reset");
    };

    const confirmFallbackGeneration = () => {
        const dummyAnalysis = {
            title: "Direct Generation",
            summary: "Analysis bypassed.",
            interpretation: "Direct interpretation of raw input.",
            symbolism: [],
            visualPrompt: dreamState.rawText || "No Input"
        };

        setDreamState(prev => ({
          ...prev,
          showFallbackConfirmation: false,
          error: null, // Clear error
          analysis: dummyAnalysis
        }));
        addLog("Fallback confirmed. Ready for manual generation.");
        // generateImage(dreamState.rawText || "", undefined, dummyAnalysis); // Removed to allow manual config
    };

    const cancelFallback = () => {
        setDreamState(prev => ({ ...prev, showFallbackConfirmation: false, isLoading: false }));
        addLog("Fallback cancelled.");
    };

    const triggerGeminiCheck = async () => {
        setIsCheckingModels(prev => ({ ...prev, gemini: true }));
        const avail = await import('../services/geminiService').then(m => m.checkGeminiAvailability());
        setModelAvailability(prev => ({ ...prev, gemini: avail }));
        setIsCheckingModels(prev => ({ ...prev, gemini: false }));
        if (avail) addLog("Gemini 1.5 Flash: Online");
        else addLog("Gemini Unavailable (Check Quota/Key)");
        return avail;
    };

    const cancelRender = useCallback(async () => {
        if (dreamState.isGeneratingImage || dreamState.isGeneratingVideo) {
            addLog("Cancelling generation...");
            setDreamState(prev => ({
                ...prev,
                isGeneratingImage: false,
                isGeneratingVideo: false,
                isLoading: false,
                progressStatus: 'Cancelled'
            }));
            await cancelGeneration(comfyHost);
        }
    }, [dreamState.isGeneratingImage, dreamState.isGeneratingVideo, comfyHost, addLog]);

    return {
        dreamState,
        setDreamState,
        activeNodeId,
        activeWorkflow,
        isComfyConnected,
        isRemote,
        comfySettings,
        setComfySettings,
        availableModels,
        availableLoras,
        availableIPAdapters,
        availableNodeTypes,
        availableOllamaModels,
        processDream,
        cancelAnalysis, // New
        generateImage,
        generateVideo,
        cancelRender, // Exposed
        resetState,
        analysisModel,
        setAnalysisModel,
        confirmFallbackGeneration,
        cancelFallback,
        modelAvailability,
        isCheckingModels,
        engineVersions,
        videoSettings,
        setVideoSettings,
        triggerGeminiCheck,
        analysisPipeline,
        setAnalysisPipeline
    };
};
