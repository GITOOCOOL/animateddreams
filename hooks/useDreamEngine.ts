import { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeDreamGemini } from '../services/geminiService';
import { analyzeDreamTextOllama } from '../services/ollamaService';
import { generateComfyImage, generateComfyVideo, checkComfyConnection, getAvailableModels, getAvailableLoras } from '../services/comfyService';
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
    const [availableOllamaModels, setAvailableOllamaModels] = useState<string[]>([]); // New: Ollama Models
    
    // Analysis Settings
    const [analysisModel, setAnalysisModel] = useState<'gemini' | 'ollama' | 'raw' | null>(null);

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
        lora: 'None',
        loraStrength: 1.0,
        denoise: 0.75,
        seed: undefined
    });

    const [videoSettings, setVideoSettings] = useState<VideoSettings>({
        model: 'Google Veo',
        fps: 24,
        duration: 6,
        motionBucketId: 127
    });

    // Dual Agent Settings
    const [dualAgentSettings, setDualAgentSettings] = useState<import('../types').DualAgentSettings>({
        useDualAgent: true,
        psychologist: {
            provider: 'ollama',
            model: 'llama3:latest',
            temperature: 0.7,
            systemPrompt: "You are Dr. Jung, an expert analytical psychologist. Analyze the dream for hidden emotions and archetypal symbolism."
        },
        visualizer: {
            provider: 'ollama',
            model: 'llama3:latest',
            temperature: 0.7,
            systemPrompt: "You are an expert AI Art Director. Translate the dream's mood into a precise Stable Diffusion XL (SDXL) prompt."
        }
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

    // Initialization & Heartbeat
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

            } else if (!comfyOnline && isComfyConnected) {
                // State Transition: Online -> Offline
                setIsComfyConnected(false);
                addLog("Neural Core Offline");
                // Optional: Clear models? setAvailableModels([]); 
            }
            
            // Check Ollama (Ping Only) - Conditional: Only if selected or initializing
            const shouldCheckOllama = analysisModel === 'ollama' || analysisModel === null;
            
            if (shouldCheckOllama) {
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
                    addLog(`Ollama Detected (v${version}) - Model: ${textModel}`);

                    // Fetch Models List
                    ollamaSvc.getOllamaModels(connections.ollamaHost).then(models => {
                         setAvailableOllamaModels(models);
                         // Optional: addLog(`Ollama Models: ${models.join(', ')}`);
                    });
    
                } else if(!ollamaOnline && modelAvailability.ollama) {
                    // State Transition: Online -> Offline
                    setModelAvailability(prev => ({ ...prev, ollama: false }));
                    // addLog("Ollama Connection Lost"); // Optional logging
                }
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
    }, [addLog, comfyHost, connections.ollamaHost, isComfyConnected, modelAvailability.ollama, availableModels.length, analysisModel]);

    const processDream = async (dreamInput: string, attachments: DreamAttachment[] = []) => {
        if (!analysisModel) {
            addLog("[Error] No Analysis Engine Selected.");
            return;
        }
        if (!dreamInput.trim()) return;

        setDreamState(prev => ({
            ...prev,
            isLoading: true,
            isAnalyzing: true, // Show analysis progress bar
            analysisProgress: 0, // Reset to 0 first
            progress: 0, // Ensure generation bar is reset
            progressStatus: analysisModel === 'raw' ? 'Skipping Analysis...' : `Analyzing Pattern (${analysisModel})...`,
            error: null,
            analysis: null,
            rawText: dreamInput, // Store raw text for saving later
            attachments // Store attachments in state
        }));
        
        if (analysisModel === 'raw') {
             addLog("Analysis Skipped (Raw Mode)");
             // Immediate "Video/Image" ready state without analysis
             const dummyAnalysis = {
                title: "Raw Input",
                summary: "Direct visual translation of user input.",
                interpretation: "None",
                symbolism: [],
                visualPrompt: dreamInput
             };
             
             setDreamState(prev => ({
                ...prev,
                analysis: dummyAnalysis,
                analysisProgress: 100,
                progressStatus: 'Ready for Generation'
            }));
            addLog("Visual Prompt Ready (Raw)");
            return;
        }

        addLog(`Analyzing Dream Pattern using ${analysisModel.toUpperCase()}...`);

        try {
            let analysis;

            if (devSettings.mockAnalysis) {
                await new Promise(r => setTimeout(r, 1500)); // Fake delay
                analysis = {
                    title: "Mock Dream Analysis",
                    summary: "This is a simulated analysis of the dream.",
                    interpretation: "The dream reflects a desire for testing functionality without API costs.",
                    symbolism: ["Testing", "Simulation", "Efficiency"],
                    visualPrompt: "A holographic debugging interface, neon blue wires, glitch art style, floating code snippets, cyberpunk aesthetic"
                };
                addLog("[MOCK] Analysis generated successfully");
            } else if (analysisModel === 'ollama') {
                addLog(`[Ollama] Sending request to ${dreamState.attachments?.length ? 'Vision' : 'Text'} model...`);
                analysis = await analyzeDreamTextOllama(
                    dreamInput, 
                    attachments, 
                    connections.ollamaHost, 
                    dualAgentSettings,
                    addOllamaLog
                );
                addLog(`[Ollama] Analysis received. Title: ${analysis.title}`);
            } else {
                addLog(`[Gemini] Sending request to cloud...`);
                analysis = await analyzeDreamGemini(dreamInput, attachments);
                addLog(`[Gemini] Analysis received.`);
            }

            setDreamState(prev => ({
                ...prev,
                analysis,
                isAnalyzing: false, // Hide analysis progress bar
                analysisProgress: 100,
                progressStatus: 'Analysis Complete'
            }));
            addLog("Visual Prompt Generated");            

        } catch (error) {
            console.error(error);
            setDreamState(prev => ({
                ...prev,
                isLoading: false, // Stop loading spinner
                error: error instanceof Error ? error.message : 'Failed to process',
                showFallbackConfirmation: true // Trigger fallback UI
            }));
            addLog(`Error: ${error}`);
            addLog("Waiting for user fallback confirmation...");
        } finally {
            if (!dreamState.showFallbackConfirmation) {
                 setDreamState(prev => ({ ...prev, isLoading: false }));
            }
        }
    };

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
            analysisProgress: 0, // Hide/Reset analysis bar
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
                        let status = val >= max ? 'Decoding High-Res Image...' : `Sampling ${val}/${max}`;
                        if (stats && val > 1) {
                            status += ` · ${stats.itS.toFixed(2)}it/s`;
                            if (stats.eta > 0) status += ` · ${stats.eta}s left`;
                        }
                        
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

        } catch (error) {
            console.error(error);
            setDreamState(prev => ({
                ...prev,
                isGeneratingImage: false,
                progress: 0,
                error: "Generation failed"
            }));
            addLog(`Generation Failed: ${error}`);
        }
    };

    const generateVideo = async () => {
        if (!dreamState.generatedImageUrl) {
             addLog("[Error] No Source Image. Please generate an image first.");
             return;
        }

        setDreamState(prev => ({
            ...prev,
            isGeneratingVideo: true,
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
                     comfyHost
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

    return {
        dreamState,
        setDreamState,
        activeNodeId,
        isComfyConnected,
        isRemote,
        comfySettings,
        setComfySettings,
        availableModels,
        availableLoras,
        availableOllamaModels,
        processDream,
        generateImage,
        generateVideo,
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
        dualAgentSettings,
        setDualAgentSettings
    };
};
