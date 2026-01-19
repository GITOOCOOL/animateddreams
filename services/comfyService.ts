import workflowTemplate from '../workflow_template.json';
import img2imgWorkflowTemplate from '../workflow_img2img.json';
import ipadapterWorkflowTemplate from '../workflow_ipadapter.json';
import svdWorkflowTemplate from './workflow_svd.json';
import animatediffWorkflowTemplate from './workflow_animatediff.json';
import { ComfySettings, VideoSettings } from '../types';

// Helper to get WS URL from HTTP Host
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

/**
 * Fetches all available node types from the ComfyUI server.
 * This allows for dynamic node discovery and "Add Any Node" functionality.
 */
export const getAvailableNodeTypes = async (host: string): Promise<string[]> => {
    try {
        const response = await fetch(`${host}/object_info`);
        if (!response.ok) throw new Error("Failed to fetch object info");
        const data = await response.json();
        return Object.keys(data);
    } catch (error) {
        console.error("Failed to fetch node definitions:", error);
        return [];
    }
};

const getWsUrl = (host: string, clientId: string) => {
    if (host.startsWith('/')) {
        // It's a relative path (proxy), use window.location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        // Assume standard proxy setup where /api/comfy-ws maps to /ws on target
        // But here we just hit the proxy endpoint on our server
        return `${protocol}//${wsHost}/api/comfy-ws?clientId=${clientId}`;
    }
    // It's a full URL (http://ip:port)
    const url = new URL(host);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}/ws?clientId=${clientId}`;
};

// ComfyUI API types
interface ComfyQueueResponse {
  prompt_id: string;
  number: number;
  node_errors: any;
}

interface ComfyHistoryResponse {
  [prompt_id: string]: {
    outputs: {
      [node_id: string]: {
        images?: {
          filename: string;
          subfolder: string;
          type: string;
        }[];
        gifs?: { filename: string; subfolder: string; type: string }[];
        videos?: { filename: string; subfolder: string; type: string }[];
      };
    };
  };
}

/**
 * Checks if the ComfyUI server is reachable.
 */
export const checkComfyConnection = async (host: string): Promise<boolean> => {
  try {
    const response = await fetch(`${host}/system_stats`);
    return response.ok;
  } catch (error) {
    console.warn("ComfyUI connection check failed:", error);
    return false;
  }
};

/**
 * Fetches system stats (including version/OS info if available).
 */
export const getSystemStats = async (host: string): Promise<any> => {
  try {
    const response = await fetch(`${host}/system_stats`);
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
};


/**
 * Fetches the list of available checkpoint models from ComfyUI.
 */
export const getAvailableModels = async (host: string): Promise<string[]> => {
  try {
    const models = new Set<string>();

    // 1. Fetch Standard Checkpoints
    try {
        const response = await fetch(`${host}/object_info/CheckpointLoaderSimple`);
        if (response.ok) {
            const data = await response.json();
            const ckpts = data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
            if (Array.isArray(ckpts)) ckpts.forEach(m => models.add(m));
        }
    } catch (e) {
        console.warn("Failed to fetch standard checkpoints", e);
    }

    // 2. Fetch AnimateDiff Models (Motion Modules)
    try {
        // Try Gen1 Loader
        const adResponse = await fetch(`${host}/object_info/ADE_AnimateDiffLoaderGen1`);
        if (adResponse.ok) {
            const data = await adResponse.json();
            const adModels = data.ADE_AnimateDiffLoaderGen1?.input?.required?.model_name?.[0]; // Gen1 uses 'model_name'
            if (Array.isArray(adModels)) adModels.forEach(m => models.add(m));
        } else {
             // Fallback to legacy loader if Gen1 missing
            const legacyResponse = await fetch(`${host}/object_info/ADE_AnimateDiffLoader`);
            if (legacyResponse.ok) {
                const data = await legacyResponse.json();
                const adModels = data.ADE_AnimateDiffLoader?.input?.required?.model_name?.[0];
                if (Array.isArray(adModels)) adModels.forEach(m => models.add(m));
            }
        }
    } catch (e) {
        console.warn("Failed to fetch AnimateDiff models", e);
    }

    return Array.from(models).sort();
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return [];
  }
};

/**
 * Uploads an image to ComfyUI for use in generation.
 */
const uploadImageToComfy = async (file: File | Blob, host: string): Promise<string> => {
  console.log(`[ComfyService] Uploading image: ${file instanceof File ? file.name : 'Blob'} (${file.size} bytes)`);
  
  const formData = new FormData();
  // Ensure we pass a filename arg, as some servers/proxies require it for correct multipart header
  const filename = file instanceof File ? file.name : `upload-${Date.now()}.png`;
  formData.append('image', file, filename);
  formData.append('overwrite', 'true');

  const res = await fetch(`${host}/upload/image`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) throw new Error(`Failed to upload image: ${res.statusText}`);

  const data = await res.json();
  // Returns the filename (and subfolder/type if applicable, but usually just name is enough for LoadImage node)
  return data.name;
};

/**
 * Fetches the list of available LoRAs from ComfyUI.
 */
export const getAvailableLoras = async (host: string): Promise<string[]> => {
  try {
    // 1. Direct Fetch Strategy
    try {
      console.log("Fetching LoRAs from LoraLoader...");
      const directRes = await fetch(`${host}/object_info/LoraLoader`);
      if (directRes.ok) {
        const data = await directRes.json();
        // Debug log
        console.log("LoraLoader Data:", data);

        // Standard ComfyUI structure: data.LoraLoader.input.required.lora_name[0] -> ["lora1", "lora2"]
        const inputs = data.LoraLoader?.input?.required?.lora_name;
        if (Array.isArray(inputs) && Array.isArray(inputs[0])) {
          console.log("Found LoRAs (Direct):", inputs[0]);
          return inputs[0];
        }
      } else {
        console.warn("LoraLoader fetch failed:", directRes.status);
      }
    } catch (e) {
      console.warn("Direct LoraLoader fetch error:", e);
    }

    // 2. Fallback Scan Strategy
    console.log("Falling back to full object scan...");
    const response = await fetch(`${host}/object_info`);
    if (!response.ok) throw new Error("Failed to fetch object info");

    const data = await response.json();
    let foundLoras: string[] = [];
    const keys = Object.keys(data);

    for (const key of keys) {
      const inputs = data[key]?.input?.required?.lora_name;
      if (inputs && Array.isArray(inputs) && Array.isArray(inputs[0])) {
        if (inputs[0].length > 0) {
          console.log(`Found LoRA list in node '${key}'`);
          foundLoras = inputs[0];
          break;
        }
      }
    }

    return foundLoras;
  } catch (error) {
    console.error("Failed to fetch LoRAs:", error);
    return [];
  }
};

/**
 * Fetches the list of available IP Adapter models.
 */
export const getAvailableIPAdapters = async (host: string): Promise<string[]> => {
    try {
        const response = await fetch(`${host}/object_info/IPAdapterModelLoader`);
        if (!response.ok) throw new Error("Failed to fetch object info");

        const data = await response.json();
        // data.IPAdapterModelLoader.input.required.ipadapter_file[0]
        const models = data.IPAdapterModelLoader?.input?.required?.ipadapter_file?.[0];
        return models || [];
    } catch (error) {
        console.error("Failed to fetch IP Adapters:", error);
        return [];
    }
};

// Helper to get safe node input
const getInput = (workflow: any, nodeId: string) => {
    if (!workflow[nodeId]) return null;
    if (!workflow[nodeId].inputs) workflow[nodeId].inputs = {};
    return workflow[nodeId].inputs;
};

/**
 * Cancels the current generation request.
 */
export const cancelGeneration = async (host: string): Promise<void> => {
    try {
        await fetch(`${host}/interrupt`, { method: 'POST' });
        await fetch(`${host}/queue`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clear: true }) 
        });
        console.log("Generation cancelled via API");
    } catch (e) {
        console.error("Failed to cancel generation:", e);
    }
};

/**
 * modifyWorkflow:
 * Recursively updates the prompt in the workflow JSON.
 */
const modifyWorkflow = (baseWorkflow: any, visualPrompt: string, originalPrompt: string, settings?: ComfySettings, inputImageFilename?: string) => {
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

/**
 * Generates an image using a local ComfyUI instance.
 * Returns the URL of the generated image.
 */

export const generateComfyImage = async (
  visualPrompt: string,
  originalPrompt: string,
  onProgress?: (val: number, max: number, stats?: { itS: number, eta: number }) => void,
  onActiveNode?: (nodeId: string | null) => void,
  inputImage?: File,
  settings?: ComfySettings,
  onLog?: (message: string) => void,
  host: string = '/api/comfy' // Default for backward compatibility
): Promise<string> => {

  const log = (msg: string) => {
    console.log(msg);
    if (onLog) onLog(msg);
  };

  log(`[System] Initializing Neural Generation Sequence...`);
  

  
  if (settings) log(`[Settings] Model: ${settings.model}, Steps: ${settings.steps}, Sampler: ${settings.sampler}`);

  let workflowTmpl: any = workflowTemplate;
  let uploadedFilename: string | undefined;

  // 1. If we have an input image, upload it and switch workflow
  if (inputImage) {
    log("[Input] Input image detected, uploading to Neural Core...");
    try {
      uploadedFilename = await uploadImageToComfy(inputImage, host);
      
      if (settings?.useIpAdapter) {
          workflowTmpl = ipadapterWorkflowTemplate;
          log(`[Upload] Image uploaded: ${uploadedFilename}. Switching to IP-Adapter (Face ID) workflow.`);
      } else {
          workflowTmpl = img2imgWorkflowTemplate;
          log(`[Upload] Image uploaded: ${uploadedFilename}. Switching to Img2Img workflow.`);
      }

    } catch (err) {
      log(`[Error] Failed to upload input image, falling back to Txt2Img: ${err}`);
      console.error("Failed to upload input image, falling back to Txt2Img:", err);
    }
  }

  const workflow = modifyWorkflow(workflowTmpl, visualPrompt, originalPrompt, settings, uploadedFilename);
  const clientId = generateUUID();

  return new Promise((resolve, reject) => {
    const wsUrl = getWsUrl(host, clientId);

    log(`[Connection] Connecting to WebSocket: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    let promptId: string | null = null;

    // Heartbeat to keep connection alive
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 5000);

    socket.onopen = async () => {
      log(`[Connection] Connected to Neural Core (ID: ${clientId})`);
      // ... (queue logic remains same)
      try {
        log(`[Queue] Sending prompt configuration to KSampler...`);
        const queueRes = await fetch(`${host}/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: workflow,
            client_id: clientId
          })
        });

        if (!queueRes.ok) throw new Error(`Failed to queue prompt: ${queueRes.statusText}`);

        const queueData: ComfyQueueResponse = await queueRes.json();
        promptId = queueData.prompt_id;
        log(`[Queue] Prompt successfully queued (ID: ${promptId})`);
      } catch (err) {
        log(`[Error] Failed to queue prompt: ${err}`);
        clearInterval(pingInterval);
        socket.close();
        reject(err);
      }
    };

    // Timing State
    let startTime = Date.now();
    let lastStepTime = Date.now();
    let pollingInterval: any = null;

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      // Progress Update
      if (message.type === 'progress' && message.data.prompt_id === promptId && onProgress) {
        const value = message.data.value;
        const max = message.data.max;
        
        // Calculate Metrics
        const now = Date.now();
        const timeDiff = now - lastStepTime; // Time since last step in ms
        lastStepTime = now;
        
        // it/s calculation (instantenous or smoothed could be done, simpler is instantaneous)
        // Avoid division by zero
        const itPerSec = timeDiff > 0 ? 1000 / timeDiff : 0;
        
        // ETA calculation
        const remainingSteps = max - value;
        const etaSeconds = itPerSec > 0 ? Math.ceil(remainingSteps / itPerSec) : 0;

        onProgress(value, max, { itS: itPerSec, eta: etaSeconds });
        
        if (value === 1) {
             startTime = Date.now(); // Reset start time on first real step
             log(`[Progress] Started sampling...`);
        } else if (value % 5 === 0 || value === max) { // Log every 5 steps to reduce noise
             log(`[Progress] Sampling: ${value}/${max} (${itPerSec.toFixed(2)} it/s, ETA: ${etaSeconds}s)`);
        }
      }

      // Active Node Update
      if (message.type === 'executing' && message.data.prompt_id === promptId) {
        if (onActiveNode) {
          const nodeId = message.data.node;
          onActiveNode(nodeId);
          if (nodeId) log(`[Node] Executing Node ID: ${nodeId}`);
        }
      }

      // Execution Finished
      if (promptId && message.type === 'executing' && message.data.node === null && message.data.prompt_id === promptId) {
        log(`[Complete] Generation finished. Post-processing...`);
        clearInterval(pingInterval);
        if (pollingInterval) clearInterval(pollingInterval);
        console.log("ComfyUI Execution Finished for ID:", promptId);
        socket.close();

        try {
          await new Promise(r => setTimeout(r, 1000));
          log(`[Storage] Retrieving high-res output...`);
          const history = await getHistory(promptId, host);
          const imageUrl = extractImageUrl(history, promptId, host);
          log(`[Success] Image generated: ${imageUrl}`);
          console.log("Generated Image URL:", imageUrl);
          resolve(imageUrl);
        } catch (err) {
          log(`[Error] Failed to retrieve final image: ${err}`);
          console.error("Failed to extract image:", err);
          reject(err);
        }
      }
    };

    // Polling Fallback to handle WebSocket failures
    pollingInterval = setInterval(async () => {
        if (!promptId) return;
        try {
            const history = await getHistory(promptId, host);
            if (history[promptId] && history[promptId].outputs) {
                log(`[Fallback] Detected completion via polling.`);
                clearInterval(pingInterval);
                clearInterval(pollingInterval); // Clear self
                socket.close();
                
                const imageUrl = extractImageUrl(history, promptId, host);
                log(`[Success] Image generated (Polling): ${imageUrl}`);
                resolve(imageUrl);
            }
        } catch (e) {
            // Ignore polling errors (history might not be ready)
        }
    }, 2000);

    socket.onerror = (err) => {
      log(`[Socket Error] WebSocket error occurred.`);
      console.error("WebSocket error:", err);
      // Do not reject immediately, let polling try to recover or user cancel
    };

    socket.onclose = () => {
      log(`[Connection] WebSocket closed.`);
      clearInterval(pingInterval);
      // Do not clear pollingInterval here, as we might want to keep checking if it finished just as socket closed
      // But usually if socket closes unexpectedly, we might want to stop. 
      // However, for robustness, let's keep polling for a bit or rely on the user to cancel if it's truly dead.
      // Actually, safest to clean up if we rely on WS for liveness. 
      // But here we want to survive a WS drop if the job finishes.
    };
  });
};

const getHistory = async (promptId: string, host: string): Promise<ComfyHistoryResponse> => {
  const res = await fetch(`${host}/history/${promptId}`);
  if (!res.ok) throw new Error("Failed to get history");
  return await res.json();
};

const extractImageUrl = (history: ComfyHistoryResponse, promptId: string, host: string): string => {
  const promptHistory = history[promptId];
  if (!promptHistory || !promptHistory.outputs) throw new Error("No output found in history");

  // Find the SaveImage node (Node "9" in our template)
  // Or just grab the first output available
  // Find the SaveImage node (Node "9" in our template)
  // Or just grab the first output available
  for (const nodeId in promptHistory.outputs) {
    const outputs = promptHistory.outputs[nodeId];
    
    // Check for Images
    if (outputs.images && outputs.images.length > 0) {
      const img = outputs.images[0];
      const url = `${host}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type}`;
      console.log("FINAL GENERATED URL (Image):", url);
      return url;
    }
    
    // Check for Gifs (AnimateDiff)
    if (outputs.gifs && outputs.gifs.length > 0) {
      const vid = outputs.gifs[0];
      // Note: format=mp4 might strictly expect a converter or be ignored for static files. 
      // Safest is to just view the file as is if we suspect issues. 
      // But keeping format=mp4 for preview consistency if server supports it.
      const url = `${host}/view?filename=${vid.filename}&subfolder=${vid.subfolder || ''}&type=${vid.type}`; 
      console.log("FINAL GENERATED URL (Gif/WebP):", url);
      return url;
    }

    // Check for Videos (VHS / SVD)
    if (outputs.videos && outputs.videos.length > 0) {
       const vid = outputs.videos[0];
       const url = `${host}/view?filename=${vid.filename}&subfolder=${vid.subfolder || ''}&type=${vid.type}`;
       console.log("FINAL GENERATED URL (Video):", url);
       return url;
    }
    
    // Debug Log: What DID we get?
    console.log(`[Comfy] Node ${nodeId} output keys:`, Object.keys(outputs));
  }
  
  console.error("Full History Output for Prompt:", JSON.stringify(promptHistory, null, 2));
  throw new Error("No media output found in history (checked images, gifs, videos). Check console for 'Full History Output'.");
};

/**
 * modifySvdWorkflow:
 * Updates the SVD workflow with settings and input image.
 */
const modifySvdWorkflow = (baseWorkflow: any, inputFilename: string, settings?: VideoSettings) => {
  const newWorkflow = JSON.parse(JSON.stringify(baseWorkflow));

  // Node 15: LoadImage (Input conditioning)
  if (newWorkflow["15"] && newWorkflow["15"].inputs) {
    newWorkflow["15"].inputs.image = inputFilename;
  }

  // Node 14: Checkpoint Model
  if (settings && settings.model && newWorkflow["14"]) {
      // If user selected "Google Veo", we might default to SVD since Veo isn't local.
      // But if they selected a specific .safetensors, use it.
      // For now, if "Google Veo" is selected in UI, we default to "svd_xt.safetensors" for local fallback
      // or just pass it if user actually has a model named "Google Veo" (unlikely).
      if (settings.model === 'Google Veo') {
           newWorkflow["14"].inputs.ckpt_name = "svd_xt.safetensors"; 
      } else {
           newWorkflow["14"].inputs.ckpt_name = settings.model;
      }
  }

  // Node 12: SVD Conditioning
  if (newWorkflow["12"] && newWorkflow["12"].inputs && settings) {
      // Removed 25 frame clamp to allow longer generations (SVD-XT can do 25, going higher might degrade but user requested control)
      newWorkflow["12"].inputs.video_frames = (settings.duration || 2) * (settings.fps || 8); 
      newWorkflow["12"].inputs.motion_bucket_id = settings.motionBucketId || 127;
      newWorkflow["12"].inputs.fps = settings.fps || 6;
      if (settings.width) newWorkflow["12"].inputs.width = settings.width;
      if (settings.height) newWorkflow["12"].inputs.height = settings.height;
  }

  // Node 3: KSampler (Randomize seed)
  if (newWorkflow["3"] && newWorkflow["3"].inputs) {
      newWorkflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000000);
      
      // We could add steps/cfg to VideoSettings if desired, using defaults for now
  }

  return newWorkflow;
}

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
const modifyAnimateDiffWorkflow = (baseWorkflow: any, settings: VideoSettings, positivePrompt: string, originalPrompt: string, inputFilename?: string) => {
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

export const generateComfyVideo = async (
    inputImageUrl: string, // Might be empty for AnimateDiff (Txt2Vid)
    settings: VideoSettings,
    onProgress?: (val: number, max: number) => void,
    onLog?: (msg: string) => void,
    host: string = '/api/comfy',
    promptText: string = "A cinematic shot",
    onNodeActive?: (nodeId: string) => void,
    onWorkflowReady?: (workflow: any) => void
): Promise<string> => {
    const log = (msg: string) => {
        console.log(msg);
        if (onLog) onLog(msg);
    };

    if (!settings.model) {
        log("[Error] No video model selected. Please configure a model in video settings.");
        throw new Error("No video model selected");
    }

    let workflow: any; // Declare once
    
    // BRANCH: AnimateDiff (Txt2Video)
    if (settings.model.toLowerCase().includes('animate') || settings.model.toLowerCase().includes('motion')) {
         log(`[Video] Mode: AnimateDiff (Text-to-Video)`);
         log(`[Video] Base Model: ${settings.baseModel || 'Default'}`);
         
         // Setup for Hybrid Mode (Image + Text)
         let adInputFilename = undefined;
         if (settings.useIpAdapter && inputImageUrl) {
              log(`[Video] Hybrid Mode Active: Processing Reference Image...`);
              try {
                 // Reuse fetch/upload logic
                 const urlObj = new URL(inputImageUrl, window.location.origin);
                 const filenameParam = urlObj.searchParams.get("filename");
                 if (filenameParam) {
                     const res = await fetch(inputImageUrl);
                     const blob = await res.blob();
                     const file = new File([blob], "hybrid_ref.png", { type: "image/png" });
                     adInputFilename = await uploadImageToComfy(file, host);
                 } else {
                     const res = await fetch(inputImageUrl);
                     const blob = await res.blob();
                     const file = new File([blob], "hybrid_ref.png", { type: "image/png" });
                     adInputFilename = await uploadImageToComfy(file, host);
                 }
                 log(`[Video] Reference Image Prepared: ${adInputFilename}`);
              } catch (e) {
                  log(`[Warning] Failed to upload reference image for IP-Adapter: ${e}`);
              }
         }

         workflow = modifyAnimateDiffWorkflow(animatediffWorkflowTemplate, settings, promptText, promptText, adInputFilename);
         
    } else {
        // BRANCH: SVD (Img2Video)
        log(`[Video] Mode: SVD (Image-to-Video)`);
        
        let inputFilename = "example.png";
    
        try {
            log(`[Video] Preparing input frame from: ${inputImageUrl}`);
            // If it's a Comfy URL, we can parse it.
            const urlObj = new URL(inputImageUrl, window.location.origin);
            const filenameParam = urlObj.searchParams.get("filename");
            
            if (filenameParam) {
                 const res = await fetch(inputImageUrl);
                 const blob = await res.blob();
                 const file = new File([blob], "svd_init.png", { type: "image/png" });
                 inputFilename = await uploadImageToComfy(file, host);
            } else {
                 // Remote URL or data URI
                 const res = await fetch(inputImageUrl);
                 const blob = await res.blob();
                 const file = new File([blob], "svd_init.png", { type: "image/png" });
                 inputFilename = await uploadImageToComfy(file, host);
            }
            log(`[Video] Input frame uploaded: ${inputFilename}`);
    
        } catch (e) {
            log(`[Error] Failed to prepare input image: ${e}`);
            throw e;
        }
    
        workflow = modifySvdWorkflow(svdWorkflowTemplate, inputFilename, settings);
    }
    const clientId = generateUUID();

    // Expose workflow for visualization immediately
    if (onWorkflowReady) onWorkflowReady(workflow);

    return new Promise((resolve, reject) => {
        const wsUrl = getWsUrl(host, clientId);
        const socket = new WebSocket(wsUrl);
        let promptId: string | null = null;
        let pingInterval: any;

        const cleanup = () => {
            clearInterval(pingInterval);
            if (socket.readyState === WebSocket.OPEN) socket.close();
        };

        socket.onopen = async () => {
             try {
                pingInterval = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' }));
                }, 5000);

                const queueRes = await fetch(`${host}/prompt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: workflow, client_id: clientId })
                });

                if (!queueRes.ok) throw new Error("Failed to queue video prompt");
                const data = await queueRes.json();
                promptId = data.prompt_id;
                log(`[Video] Generation queued (ID: ${promptId})`);
             } catch (e) {
                 cleanup();
                 reject(e);
             }
        };

        socket.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === 'executing') {
                    if (onNodeActive && message.data.node) {
                        onNodeActive(message.data.node);
                    }
                } else if (message.type === 'progress') {
                    // Filter progress for our specific prompt if possible, or just pass it
                    if (message.data.prompt_id === promptId && onProgress) {
                         const { value, max } = message.data;
                         onProgress(value, max);
                    }
                } else if (message.type === 'execution_start') {
                    log('Execution started...');
                } else if (message.type === 'execution_error') {
                   log(`Error at node ${message.data.node_id}: ${message.data.exception_message}`);
                   if (onLog) onLog(`[Error] Node ${message.data.node_id} failed.`);
                }

                // Completion Check
                if (promptId && message.type === 'executing' && message.data.node === null && message.data.prompt_id === promptId) {
                     log("[Video] Generation Complete. Retrieving video...");
                     cleanup(); // Close socket

                     try {
                         // Wait a moment for file system flush
                         await new Promise(r => setTimeout(r, 1000));
                         
                         const history = await getHistory(promptId, host);
                         const videoUrl = extractImageUrl(history, promptId, host); 
                         resolve(videoUrl);
                     } catch (e) {
                         reject(e);
                     }
                }
            } catch (e) {
                console.error("Failed to parse WS message:", e);
            }
        };
        
        socket.onerror = (e) => {
             cleanup();
             reject(e);
        };
    });
};
