import { VideoSettings } from '../../types';

// Helper to inject IP Adapter nodes into a workflow
const injectIpAdapterNodes = (workflow: any, settings: VideoSettings, inputFilename: string) => {
    // Modern IPAdapter Plus (V2) Architecture
    // 100: IPAdapter Unified Loader (Loads Model + CLIP Vision)
    // 102: Load Image (Reference)
    // 103: IPAdapter (Apply)

    const isSdxl = settings.model?.toLowerCase().includes("sdxl");
    // Use user selection OR fallback
    const preset = settings.ipAdapterPreset || "STANDARD (medium strength)";


    console.log(`[Workflow] Injecting IP-Adapter (V2) - Preset: ${preset}`);

    // Node 100: Unified Loader
    workflow["100"] = {
        inputs: { 
            preset: preset,
            model: ["4", 0] // Optional: Can pass model to validate compatibility? 
                            // Actually UnifiedLoader usually just outputs ipadapter. 
                            // Let's check standard usage. 
                            // Usually: UnifiedLoader -> IPAdapter.
        },
        class_type: "IPAdapterUnifiedLoader",
        _meta: { title: "IPAdapter Unified Loader" }
    };

    // Node 102: Input Image
    workflow["102"] = {
        inputs: { image: inputFilename, upload: "image" },
        class_type: "LoadImage",
        _meta: { title: "Load Reference Image" }
    };

    // Node 103: Apply IPAdapter
    workflow["103"] = {
        inputs: {
            weight: settings.ipAdapterWeight || 0.6,
            weight_type: "standard",
            noise: 0.0,
            start_at: 0.0,
            end_at: 1.0,
            ipadapter: ["100", 1], // From Unified Loader (Index 1 is IPADAPTER, Index 0 is MODEL)
            image: ["102", 0],     // From Load Image
            model: ["4", 0]        // From Checkpoint
        },
        class_type: "IPAdapter",   // The new V2 name (was IPAdapterApply)
        _meta: { title: "Apply IPAdapter" }
    };

    // Re-route the Model flow
    // Node 4 (Checkpoint) -> Node 103 (IPAdapter) -> Node 40 (AnimateDiff)
    if (workflow["40"]) {
        workflow["40"].inputs.model = ["103", 0];
    }

    return workflow;
};

/**
 * modifyAnimateDiffWorkflow:
 * Updates the AnimateDiff workflow with settings and prompts.
 */
export const modifyAnimateDiffWorkflow = (baseWorkflow: any, settings: VideoSettings, positivePrompt: string, originalPrompt: string, inputFilename?: string) => {
  let newWorkflow = JSON.parse(JSON.stringify(baseWorkflow));

  // Inject IP-Adapter if enabled
  if (settings.useIpAdapter && inputFilename) {
      newWorkflow = injectIpAdapterNodes(newWorkflow, settings, inputFilename);
  }

  // Node 4: Checkpoint Loader (Base Model)
  if (newWorkflow["4"] && settings.baseModel) {
      newWorkflow["4"].inputs.ckpt_name = settings.baseModel;
  }

  // Node 40: AnimateDiff Loader (Motion Module)
  if (newWorkflow["40"]) {
      // If we have other motion modules in the future, we could select them here.
      // For now, it defaults to what's in the template or fixed.
      // But if we want to allow selecting different motion modules like "v3" vs "lightning", 
      // we could use settings.model if it maps to filenames.
      // Assuming settings.model is 'animatediff_v3', we might want to map it specific files if needed.
      // For now, let's assume the template has a sensible default or valid one.
  }
  
  // Node 6: Positive Prompt
  if (newWorkflow["6"]) {
      newWorkflow["6"].inputs.text = `(best quality, masterpiece), ${positivePrompt}`;
  }
  
  // Node 7: Negative Prompt
  if (newWorkflow["7"]) {
      newWorkflow["7"].inputs.text = "(worst quality, low quality:1.4), watermark, logo, text, subtitles";
  }

  // Node 42: Empty Latent Video (Resolution & Batch Size)
  if (newWorkflow["42"]) {
       if (settings.width) newWorkflow["42"].inputs.width = settings.width;
       if (settings.height) newWorkflow["42"].inputs.height = settings.height;
       
       // Calculate batch_size based on duration & fps
       // AnimateDiff batch_size = Total Frames
       const totalFrames = (settings.duration || 2) * (settings.fps || 8);
       newWorkflow["42"].inputs.batch_size = totalFrames;
  }

  // Node 3: KSampler
  if (newWorkflow["3"]) {
      newWorkflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000000);
      
      const isLightning = settings.model?.toLowerCase().includes("lightning");
      if (isLightning) {
           newWorkflow["3"].inputs.steps = 6;
           newWorkflow["3"].inputs.cfg = 1.5; // Lightning needs ~1-2 CFG
      } else {
           // Standard AnimateDiff / SDXL
           newWorkflow["3"].inputs.steps = 25;
           newWorkflow["3"].inputs.cfg = 7.0; // Standard CFG
      }
  }

  return newWorkflow;
};
