/**
 * ComfyUI Workflow Generator
 * 
 * Generates valid ComfyUI workflow JSON from user-configured parameters.
 * NO hardcoded modifications - what the user configures is what gets sent.
 */

export interface WorkflowParameters {
    // Model & Checkpoint
    model: string;
    
    // Prompts
    positivePrompt: string;
    negativePrompt?: string;
    
    // Sampling Parameters
    steps: number;
    cfg: number;
    sampler: string;
    scheduler: string;
    seed?: number;
    denoise?: number;
    
    // Image Dimensions
    width: number;
    height: number;
    
    // LoRAs (optional)
    loras?: Array<{
        name: string;
        strength: number;
        modelStrength?: number;
        clipStrength?: number;
    }>;
    
    // IP-Adapter (optional, for face matching)
    useIpAdapter?: boolean;
    ipAdapterModel?: string;
    ipAdapterWeight?: number;
    ipAdapterPreset?: string;
    inputImagePath?: string; // For img2img or IP-Adapter
    
    // Workflow Type
    workflowType: 'txt2img' | 'img2img' | 'ipadapter';
}

/**
 * Generates a ComfyUI workflow JSON from parameters.
 * This creates a minimal, standard workflow structure that ComfyUI can execute.
 */
export function generateWorkflowFromParameters(params: WorkflowParameters): Record<string, any> {
    const seed = params.seed ?? Math.floor(Math.random() * 1000000000000);
    
    // Base workflow structure
    const workflow: Record<string, any> = {};
    
    let nodeId = 1;
    
    // 1. Checkpoint Loader
    const checkpointLoaderId = String(nodeId++);
    workflow[checkpointLoaderId] = {
        inputs: {
            ckpt_name: params.model
        },
        class_type: "CheckpointLoaderSimple",
        _meta: {
            title: "Load Checkpoint"
        }
    };
    
    // 2. Positive Prompt (CLIPTextEncode)
    const positivePromptId = String(nodeId++);
    workflow[positivePromptId] = {
        inputs: {
            text: params.positivePrompt,
            clip: [checkpointLoaderId, 1] // CLIP output from checkpoint loader
        },
        class_type: "CLIPTextEncode",
        _meta: {
            title: "Positive Prompt"
        }
    };
    
    // 3. Negative Prompt (CLIPTextEncode)
    const negativePromptId = String(nodeId++);
    workflow[negativePromptId] = {
        inputs: {
            text: params.negativePrompt || "",
            clip: [checkpointLoaderId, 1]
        },
        class_type: "CLIPTextEncode",
        _meta: {
            title: "Negative Prompt"
        }
    };
    
    // Track conditioning outputs (for LoRA chaining)
    let positiveConditioningSource = [positivePromptId, 0];
    let negativeConditioningSource = [negativePromptId, 0];
    let modelSource = [checkpointLoaderId, 0];
    let clipSource = [checkpointLoaderId, 1];
    
    // 4. LoRA Loaders (if any)
    if (params.loras && params.loras.length > 0) {
        params.loras.forEach((lora, index) => {
            const loraLoaderId = String(nodeId++);
            workflow[loraLoaderId] = {
                inputs: {
                    lora_name: lora.name,
                    strength_model: lora.modelStrength ?? lora.strength,
                    strength_clip: lora.clipStrength ?? lora.strength,
                    model: modelSource,
                    clip: clipSource
                },
                class_type: "LoraLoader",
                _meta: {
                    title: `LoRA ${index + 1}: ${lora.name}`
                }
            };
            
            // Update sources to chain LoRAs
            modelSource = [loraLoaderId, 0];
            clipSource = [loraLoaderId, 1];
        });
        
        // Re-encode prompts with LoRA-modified CLIP
        const loraPositivePromptId = String(nodeId++);
        workflow[loraPositivePromptId] = {
            inputs: {
                text: params.positivePrompt,
                clip: clipSource
            },
            class_type: "CLIPTextEncode",
            _meta: {
                title: "Positive Prompt (with LoRA)"
            }
        };
        
        const loraNegativePromptId = String(nodeId++);
        workflow[loraNegativePromptId] = {
            inputs: {
                text: params.negativePrompt || "",
                clip: clipSource
            },
            class_type: "CLIPTextEncode",
            _meta: {
                title: "Negative Prompt (with LoRA)"
            }
        };
        
        positiveConditioningSource = [loraPositivePromptId, 0];
        negativeConditioningSource = [loraNegativePromptId, 0];
    }
    
    // 4.5 IP-Adapter (for Face/Style matching)
    if (params.useIpAdapter && params.inputImagePath) {
        const isSdxl = params.model.toLowerCase().includes('sdxl') || params.model.toLowerCase().includes('ragnarok');
        const clipVisionModel = isSdxl 
            ? "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" 
            : "CLIP-ViT-bigG-14-laion2B-39B-b160k.safetensors";

        const clipVisionId = String(nodeId++);
        workflow[clipVisionId] = {
            inputs: { clip_name: clipVisionModel },
            class_type: "CLIPVisionLoader",
            _meta: { title: "CLIP Vision Loader" }
        };

        const ipAdapterModelId = String(nodeId++);
        workflow[ipAdapterModelId] = {
            inputs: { ipadapter_file: params.ipAdapterModel || (isSdxl ? "ip-adapter-plus_sdxl_vit-h.safetensors" : "ip-adapter-plus_sd15.safetensors") },
            class_type: "IPAdapterModelLoader",
            _meta: { title: "IPAdapter Model Loader" }
        };

        const loadReferenceImageId = String(nodeId++);
        workflow[loadReferenceImageId] = {
            inputs: { image: params.inputImagePath },
            class_type: "LoadImage",
            _meta: { title: "Reference Image (IP-Adapter)" }
        };

        const ipAdapterId = String(nodeId++);
        workflow[ipAdapterId] = {
            inputs: {
                weight: params.ipAdapterWeight ?? 0.8,
                noise: 0.0,
                weight_type: "original",
                start_at: 0.0,
                end_at: 1.0,
                unfold_batch: false,
                ipadapter: [ipAdapterModelId, 0],
                clip_vision: [clipVisionId, 0],
                image: [loadReferenceImageId, 0],
                model: modelSource
            },
            class_type: "IPAdapter",
            _meta: { title: "IP-Adapter" }
        };

        modelSource = [ipAdapterId, 0];
    }
    
    // 5. Empty Latent Image (for txt2img) or Load Image (for img2img)
    let latentSource;
    
    if (params.workflowType === 'txt2img' || !params.inputImagePath) {
        const emptyLatentId = String(nodeId++);
        workflow[emptyLatentId] = {
            inputs: {
                width: params.width,
                height: params.height,
                batch_size: 1
            },
            class_type: "EmptyLatentImage",
            _meta: {
                title: "Empty Latent Image"
            }
        };
        latentSource = [emptyLatentId, 0];
    } else {
        // img2img workflow
        const loadImageId = String(nodeId++);
        workflow[loadImageId] = {
            inputs: {
                image: params.inputImagePath
            },
            class_type: "LoadImage",
            _meta: {
                title: "Load Image"
            }
        };
        
        const vaeEncodeId = String(nodeId++);
        workflow[vaeEncodeId] = {
            inputs: {
                pixels: [loadImageId, 0],
                vae: [checkpointLoaderId, 2] // VAE from checkpoint
            },
            class_type: "VAEEncode",
            _meta: {
                title: "VAE Encode"
            }
        };
        
        latentSource = [vaeEncodeId, 0];
    }
    
    // 6. KSampler
    const ksampleId = String(nodeId++);
    workflow[ksampleId] = {
        inputs: {
            seed: seed,
            steps: params.steps,
            cfg: params.cfg,
            sampler_name: params.sampler,
            scheduler: params.scheduler,
            denoise: params.denoise ?? 1.0,
            model: modelSource,
            positive: positiveConditioningSource,
            negative: negativeConditioningSource,
            latent_image: latentSource
        },
        class_type: "KSampler",
        _meta: {
            title: "KSampler"
        }
    };
    
    // 7. VAE Decode
    const vaeDecodeId = String(nodeId++);
    workflow[vaeDecodeId] = {
        inputs: {
            samples: [ksampleId, 0],
            vae: [checkpointLoaderId, 2]
        },
        class_type: "VAEDecode",
        _meta: {
            title: "VAE Decode"
        }
    };
    
    // 8. Save Image
    const saveImageId = String(nodeId++);
    workflow[saveImageId] = {
        inputs: {
            filename_prefix: "AnimatedDreams",
            images: [vaeDecodeId, 0]
        },
        class_type: "SaveImage",
        _meta: {
            title: "Save Image"
        }
    };
    
    return workflow;
}

/**
 * Validates a ComfyUI workflow JSON structure.
 * Checks for required node types and connections.
 */
export function validateWorkflow(workflow: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if workflow is empty
    if (!workflow || Object.keys(workflow).length === 0) {
        errors.push("Workflow is empty");
        return { valid: false, errors };
    }
    
    // Check for required node types
    const nodeTypes = Object.values(workflow).map((node: any) => node.class_type);
    
    const requiredTypes = ['CheckpointLoaderSimple', 'KSampler', 'SaveImage'];
    requiredTypes.forEach(type => {
        if (!nodeTypes.includes(type)) {
            errors.push(`Missing required node type: ${type}`);
        }
    });
    
    // Check each node has class_type and inputs
    Object.entries(workflow).forEach(([id, node]: [string, any]) => {
        if (!node.class_type) {
            errors.push(`Node ${id} missing class_type`);
        }
        if (!node.inputs) {
            errors.push(`Node ${id} missing inputs`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Extracts parameters from a ComfyUI workflow JSON.
 * Useful for loading saved workflows back into the UI.
 */
export function extractParametersFromWorkflow(workflow: Record<string, any>): Partial<WorkflowParameters> {
    const params: Partial<WorkflowParameters> = {};
    
    // Find nodes by class_type
    const nodes = Object.values(workflow);
    
    // Checkpoint
    const checkpoint = nodes.find((n: any) => n.class_type === 'CheckpointLoaderSimple');
    if (checkpoint) {
        params.model = checkpoint.inputs.ckpt_name;
    }
    
    // KSampler
    const ksampler = nodes.find((n: any) => n.class_type === 'KSampler');
    if (ksampler) {
        params.steps = ksampler.inputs.steps;
        params.cfg = ksampler.inputs.cfg;
        params.sampler = ksampler.inputs.sampler_name;
        params.scheduler = ksampler.inputs.scheduler;
        params.seed = ksampler.inputs.seed;
        params.denoise = ksampler.inputs.denoise;
    }
    
    // Empty Latent (for dimensions)
    const emptyLatent = nodes.find((n: any) => n.class_type === 'EmptyLatentImage');
    if (emptyLatent) {
        params.width = emptyLatent.inputs.width;
        params.height = emptyLatent.inputs.height;
    }
    
    // Prompts (CLIPTextEncode)
    const textEncodeNodes = nodes.filter((n: any) => n.class_type === 'CLIPTextEncode');
    if (textEncodeNodes.length >= 2) {
        params.positivePrompt = textEncodeNodes[0].inputs.text;
        params.negativePrompt = textEncodeNodes[1].inputs.text;
    }
    
    // LoRAs
    const loraNodes = nodes.filter((n: any) => n.class_type === 'LoraLoader');
    if (loraNodes.length > 0) {
        params.loras = loraNodes.map((node: any) => ({
            name: node.inputs.lora_name,
            strength: node.inputs.strength_model,
            modelStrength: node.inputs.strength_model,
            clipStrength: node.inputs.strength_clip
        }));
    }
    
    return params;
}
