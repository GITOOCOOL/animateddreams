import { ComfySettings } from '../../types';
import { getInput } from './utils';

/**
 * modifyImageWorkflow:
 * Recursively updates the prompt in the workflow JSON for standard image generation.
 * Handles Txt2Img, Img2Img (with LoRA and IPAdapter support).
 */
export const modifyImageWorkflow = (baseWorkflow: any, visualPrompt: string, originalPrompt: string, settings?: ComfySettings, inputImageFilename?: string) => {
  const newWorkflow = JSON.parse(JSON.stringify(baseWorkflow));

  // --- 1. Basic Parameter Updates ---

  // Update Positive Prompt (Node 6)
  if (getInput(newWorkflow, "6")) {
    newWorkflow["6"].inputs.text = `${visualPrompt}, detailed face, realistic eyes, natural skin texture, masterpiece, best quality, 8k`;
  }

  // Custom Metadata Injection (Node 99)
  newWorkflow["99"] = {
    inputs: {
      text: `ORIGINAL USER DREAM: ${originalPrompt}`,
      clip: ["4", 1] // Dummy connection
    },
    class_type: "CLIPTextEncode",
    _meta: { title: "METADATA: User Input" }
  };

  // Update KSampler Settings (Node 3)
  const kSampler = getInput(newWorkflow, "3");
  if (kSampler) {
    if (settings) {
        kSampler.steps = settings.steps;
        kSampler.cfg = settings.cfg;
        kSampler.sampler_name = settings.sampler;
        kSampler.scheduler = settings.scheduler;
        kSampler.denoise = inputImageFilename ? settings.denoise : 1;
        kSampler.seed = settings.seed ?? Math.floor(Math.random() * 1000000000000);
    } else {
        kSampler.seed = Math.floor(Math.random() * 1000000000000);
    }
  }

  // Update Checkpoint (Node 4)
  if (getInput(newWorkflow, "4") && settings?.model) {
    newWorkflow["4"].inputs.ckpt_name = settings.model;
  }

  // Update Dimensions (Node 5 - Empty Latent)
  if (getInput(newWorkflow, "5") && settings) {
    newWorkflow["5"].inputs.width = settings.width || 1024;
    newWorkflow["5"].inputs.height = settings.height || 1024;
  }

  // Update Image Scale (Node 12)
  if (getInput(newWorkflow, "12") && settings) {
      newWorkflow["12"].inputs.width = settings.width || 1024;
      newWorkflow["12"].inputs.height = settings.height || 1024;
  }

  // Update Input Image (Node 11)
  if (inputImageFilename && getInput(newWorkflow, "11")) {
    newWorkflow["11"].inputs.image = inputImageFilename;
  }


  // --- 2. Advanced Logic & Chaining ---
  // We need to carefully chain: Checkpoint -> [LoRA] -> [IPAdapter] -> KSampler
  // We track the "current source" for Model and CLIP.

  let currentModelSource = ["4", 0]; // Default: Checkpoint output 0
  let currentClipSource = ["4", 1];  // Default: Checkpoint output 1

  // A. LoRA Injection (Iterative Chaining)
  if (settings && settings.loras && settings.loras.length > 0) {
      settings.loras.forEach((lora, index) => {
          if (!lora.name || lora.name === "None") return;

          console.log(`[Workflow] Injecting LoRA ${index + 1}: ${lora.name} (Strength: ${lora.strength})`);
          
          const loraNodeId = `100${index}`; // Unique ID for each LoRA
          
          newWorkflow[loraNodeId] = {
            inputs: {
              lora_name: lora.name,
              strength_model: lora.strength,
              strength_clip: lora.strength,
              model: currentModelSource,
              clip: currentClipSource
            },
            class_type: "LoraLoader",
            _meta: { title: `Dynamic LoRA ${index + 1}` }
          };

          // Update sources to point to this LoRA's output
          currentModelSource = [loraNodeId, 0];
          currentClipSource = [loraNodeId, 1];
      });
  } else if (settings && (settings as any).lora && (settings as any).lora !== "None") {
      // BACKWARD COMPATIBILITY for old settings
       console.log(`[Workflow] Injecting LoRA (Legacy): ${(settings as any).lora}`);
       const loraNodeId = "100";
       newWorkflow[loraNodeId] = {
            inputs: {
              lora_name: (settings as any).lora,
              strength_model: (settings as any).loraStrength || 1.0,
              strength_clip: (settings as any).loraStrength || 1.0,
              model: currentModelSource,
              clip: currentClipSource
            },
            class_type: "LoraLoader",
            _meta: { title: "Dynamic LoRA" }
       };
       currentModelSource = [loraNodeId, 0];
       currentClipSource = [loraNodeId, 1];
  }

  // B. IP Adapter Injection (Node 20)
  // Only if present in the template (meaning we switched to IPAdapter workflow)
  if (newWorkflow["20"]) {
      console.log(`[Workflow] Configuring IP Adapter...`);
      const ipAdapter = getInput(newWorkflow, "20");
      
      // Update Model Input to come from current chain (Checkpoint or LoRA)
      ipAdapter.model = currentModelSource;

      // Set Weight/Strength if provided
      if (settings?.ipAdapterWeight !== undefined) {
          ipAdapter.weight = settings.ipAdapterWeight;
      }
      
      if (getInput(newWorkflow, "21")) {
          // Unified Loader (V2) Logic
          // 1. Connect Model (Crucial for V2 Validation)
          newWorkflow["21"].inputs.model = currentModelSource;

          // 2. Set PRESET (or Manual File)
          if (settings.ipAdapterModel) {
              // Manual File Override (Attempting to pass file directly)
              // Note: Only some versions of UnifiedLoader support direct file paths
              newWorkflow["21"].inputs.ipadapter_file = settings.ipAdapterModel;
              console.log(`[Workflow] Manual IP-Adapter Model: ${settings.ipAdapterModel}`);
          } else if (settings.ipAdapterPreset) {
              newWorkflow["21"].inputs.preset = settings.ipAdapterPreset;
          }
      }

      // Update model source to point to IP Adapter output
      // IP Adapter returns a MODEL (output 0)
      currentModelSource = ["20", 0];
      
      // CLIP is NOT modified by IPAdapterAdvanced, so currentClipSource remains as is.
  }

  // C. Img2Img VAE / Latent Logic (Bypassing Scale if needed)
  if (settings?.useOriginalDimensions) {
      // VAEEncode (10)
      if (getInput(newWorkflow, "10")) {
          newWorkflow["10"].inputs.pixels = ["11", 0];
      }
  }


  // --- 3. Final Wiring to KSampler & Text Encoders ---

  // Connect KSampler (3)
  if (kSampler) {
      kSampler.model = currentModelSource;
      // Note: KSampler doesn't take CLIP, it takes Positive/Negative conditioning
  }

  // Connect Text Encoders (6 & 7) to the correct CLIP source
  if (getInput(newWorkflow, "6")) newWorkflow["6"].inputs.clip = currentClipSource;
  if (getInput(newWorkflow, "7")) newWorkflow["7"].inputs.clip = currentClipSource;

  return newWorkflow;
};
