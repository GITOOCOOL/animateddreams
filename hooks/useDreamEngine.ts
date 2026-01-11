import { useState, useCallback, useEffect } from 'react';
import { analyzeDream } from '../services/geminiService';
import { generateComfyImage, checkComfyConnection, getAvailableModels, getAvailableLoras } from '../services/comfyService';
import { DreamState, ComfySettings, Attachment } from '../types';

export const useDreamEngine = (addLog: (msg: string) => void) => {
    const [dreamState, setDreamState] = useState<DreamState>({
        isLoading: false,
        progress: 0,
        progressStatus: 'Ready'
    });

    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [isComfyConnected, setIsComfyConnected] = useState(false);
    const [isRemote, setIsRemote] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [availableLoras, setAvailableLoras] = useState<string[]>([]);

    // Comfy Settings State
    const [comfySettings, setComfySettings] = useState<ComfySettings>({
        steps: 25,
        cfg: 7.0,
        sampler: 'dpmpp_2m',
        scheduler: 'karras',
        width: 1344,
        height: 768,
        batchSize: 1,
        model: 'juggernautXL_v9Rundiffusionphoto2.safetensors',
        lora: 'None',
        loraStrength: 1.0,
        denoise: 0.75,
        seed: undefined
    });

    // Initialization
    useEffect(() => {
        checkComfyConnection().then(connected => {
            setIsComfyConnected(connected);
            if (connected) {
                addLog("System Online");
                getAvailableModels().then(models => {
                    setAvailableModels(models);
                    if (models.length > 0 && !models.includes(comfySettings.model)) {
                        setComfySettings(prev => ({ ...prev, model: models[0] }));
                    }
                });
                getAvailableLoras().then(loras => setAvailableLoras(loras));
            } else {
                addLog("Neural Core Offline");
            }
        });

        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            setIsRemote(true);
        }
    }, []);

    const processDream = async (dreamInput: string) => {
        if (!dreamInput.trim()) return;

        setDreamState(prev => ({
            ...prev,
            isLoading: true,
            progress: 10,
            progressStatus: 'Analyzing Pattern...',
            error: undefined,
            analysis: undefined
        }));
        addLog("Analyzing Dream Pattern...");

        try {
            const analysis = await analyzeDream(dreamInput);
            setDreamState(prev => ({
                ...prev,
                analysis,
                progress: 40,
                progressStatus: 'Analysis Complete'
            }));
            addLog("Visual Prompt Generated");
        } catch (error) {
            console.error(error);
            setDreamState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to process'
            }));
            addLog(`Error: ${error}`);
        } finally {
            setDreamState(prev => ({ ...prev, isLoading: false }));
        }
    };

    const generateImage = async (originalPrompt: string, inputImage?: File) => {
        if (!dreamState.analysis) return;

        setDreamState(prev => ({
            ...prev,
            isGeneratingImage: true,
            progress: 0,
            progressStatus: 'Initializing Core...',
            generatedImageUrl: undefined
        }));
        addLog("Initiating Generation...");

        try {
            const imageUrl = await generateComfyImage(
                dreamState.analysis.visualPrompt,
                originalPrompt,
                (val, max) => {
                    setDreamState(prev => ({
                        ...prev,
                        progress: Math.round((val / max) * 100),
                        progressStatus: `Sampling ${val}/${max}`
                    }));
                },
                (nodeId) => setActiveNodeId(nodeId),
                inputImage || dreamState.attachments?.find(a => a.mimeType.startsWith('image/'))?.file,
                comfySettings,
                addLog
            );

            setDreamState(prev => ({
                ...prev,
                isGeneratingImage: false,
                progress: 100,
                progressStatus: 'Complete',
                generatedImageUrl: imageUrl
            }));
            addLog("Generation Successful");
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

    const resetState = () => {
        setDreamState({ isLoading: false, progress: 0, progressStatus: 'Ready' });
        setActiveNodeId(null);
        addLog("System Reset");
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
        processDream,
        generateImage,
        resetState
    };
};
