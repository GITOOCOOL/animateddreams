import workflowTemplate from '../workflow_template.json';
import img2imgWorkflowTemplate from '../workflow_img2img.json';
import ipadapterWorkflowTemplate from '../workflow_ipadapter.json';
import svdWorkflowTemplate from './workflow_svd.json';
import animatediffWorkflowTemplate from './workflow_animatediff.json';
import { ComfySettings, VideoSettings } from '../types';
import { DynamicWorkflowEngine } from './dynamicWorkflowEngine';

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
        const inputs = data.LoraLoader?.input?.required?.lora_name;
        if (Array.isArray(inputs) && Array.isArray(inputs[0])) {
          return inputs[0];
        }
      } 
    } catch (e) {
      console.warn("Direct LoraLoader fetch error:", e);
    }

    // 2. Fallback Scan Strategy
    const response = await fetch(`${host}/object_info`);
    if (!response.ok) throw new Error("Failed to fetch object info");

    const data = await response.json();
    const keys = Object.keys(data);

    for (const key of keys) {
      const inputs = data[key]?.input?.required?.lora_name;
      if (inputs && Array.isArray(inputs) && Array.isArray(inputs[0])) {
        if (inputs[0].length > 0) {
          return inputs[0];
        }
      }
    }

    return [];
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
      const ipAdapter = getInput(newWorkflow, "20");
      ipAdapter.model = currentModelSource;

      if (settings?.ipAdapterWeight !== undefined) {
          ipAdapter.weight = settings.ipAdapterWeight;
      }
      
      if (getInput(newWorkflow, "21")) {
          newWorkflow["21"].inputs.model = currentModelSource;

          if (settings.ipAdapterModel) {
              newWorkflow["21"].inputs.ipadapter_file = settings.ipAdapterModel;
          } else if (settings.ipAdapterPreset) {
              newWorkflow["21"].inputs.preset = settings.ipAdapterPreset;
          }
      }

      currentModelSource = ["20", 0];
  }

  // C. Img2Img VAE / Latent Logic (Bypassing Scale if needed)
  if (settings?.useOriginalDimensions) {
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
  host: string = '/api/comfy',
  customWorkflow?: Record<string, any>
): Promise<string> => {

  const log = (msg: string) => {
    console.log(msg);
    if (onLog) onLog(msg);
  };

  log(`[System] Initializing Neural Generation Sequence...`);
  
  if (settings) log(`[Settings] Model: ${settings.model}, Steps: ${settings.steps}, Sampler: ${settings.sampler}`);

  let workflowTmpl: any = workflowTemplate;
  let uploadedFilename: string | undefined;

  // 1. If we have an input image, upload it...
  if (inputImage) {
    try {
      uploadedFilename = await uploadImageToComfy(inputImage, host);
      if (settings?.useIpAdapter) {
          workflowTmpl = ipadapterWorkflowTemplate;
          log(`[Upload] Image uploaded. Switching to IP-Adapter workflow.`);
      } else {
          workflowTmpl = img2imgWorkflowTemplate;
          log(`[Upload] Image uploaded. Switching to Img2Img workflow.`);
      }
    } catch (err) {
      log(`[Error] Failed to upload input image: ${err}`);
    }
  }

  // Choose Workflow: Custom > Template
  let workflow: any;
  if (customWorkflow) {
      log(`[Workflow] Using Custom/Preset Workflow.`);
      workflow = DynamicWorkflowEngine.injectExample(customWorkflow, settings || {} as ComfySettings, visualPrompt, originalPrompt);
  } else {
      workflow = modifyWorkflow(workflowTmpl, visualPrompt, originalPrompt, settings, uploadedFilename);
  }

  const clientId = generateUUID();

  return new Promise((resolve, reject) => {
    const wsUrl = getWsUrl(host, clientId);
    log(`[Connection] Connecting to WebSocket: ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);
    let promptId: string | null = null;
    let pingInterval: any = null;
    let pollingInterval: any = null;

    pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 5000);

    socket.onopen = async () => {
      log(`[Connection] Connected to Neural Core (ID: ${clientId})`);
      try {
        const queueRes = await fetch(`${host}/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: workflow, client_id: clientId })
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

    let lastStepTime = Date.now();

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'progress' && message.data.prompt_id === promptId && onProgress) {
        const value = message.data.value;
        const max = message.data.max;
        const now = Date.now();
        const timeDiff = now - lastStepTime; 
        lastStepTime = now;
        const itPerSec = timeDiff > 0 ? 1000 / timeDiff : 0;
        const remainingSteps = max - value;
        const etaSeconds = itPerSec > 0 ? Math.ceil(remainingSteps / itPerSec) : 0;
        onProgress(value, max, { itS: itPerSec, eta: etaSeconds });
        if (value % 5 === 0 || value === max) {
             log(`[Progress] Sampling: ${value}/${max} (${itPerSec.toFixed(2)} it/s)`);
        }
      }

      if (message.type === 'executing' && message.data.prompt_id === promptId) {
        if (onActiveNode) onActiveNode(message.data.node);
      }

      if (promptId && message.type === 'executing' && message.data.node === null && message.data.prompt_id === promptId) {
        log(`[Complete] Generation finished. Retrieving image...`);
        clearInterval(pingInterval);
        if (pollingInterval) clearInterval(pollingInterval);
        socket.close();

        try {
          await new Promise(r => setTimeout(r, 1000));
          const history = await getHistory(promptId, host);
          const imageUrl = extractImageUrl(history, promptId, host);
          log(`[Success] Image generated: ${imageUrl}`);
          resolve(imageUrl);
        } catch (err) {
          log(`[Error] Failed to retrieve final image: ${err}`);
          reject(err);
        }
      }
    };

    pollingInterval = setInterval(async () => {
        if (!promptId) return;
        try {
            const history = await getHistory(promptId, host);
            if (history[promptId] && history[promptId].outputs) {
                log(`[Fallback] Detected completion via polling.`);
                clearInterval(pingInterval);
                clearInterval(pollingInterval);
                socket.close();
                const imageUrl = extractImageUrl(history, promptId, host);
                resolve(imageUrl);
            }
        } catch (e) {}
    }, 2000);

    socket.onerror = (err) => {
      log(`[Socket Error] WebSocket error.`);
      console.error(err);
    };

    socket.onclose = () => {
      clearInterval(pingInterval);
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
  if (!promptHistory || !promptHistory.outputs) throw new Error("No output found");

  for (const nodeId in promptHistory.outputs) {
    const outputs = promptHistory.outputs[nodeId];
    if (outputs.images && outputs.images.length > 0) {
      const img = outputs.images[0];
      return `${host}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type}`;
    }
    if (outputs.gifs && outputs.gifs.length > 0) {
      const vid = outputs.gifs[0];
      return `${host}/view?filename=${vid.filename}&subfolder=${vid.subfolder || ''}&type=${vid.type}`; 
    }
    if (outputs.videos && outputs.videos.length > 0) {
       const vid = outputs.videos[0];
       return `${host}/view?filename=${vid.filename}&subfolder=${vid.subfolder || ''}&type=${vid.type}`;
    }
  }
  throw new Error("No media output found");
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
      if (settings.model === 'Google Veo') {
           newWorkflow["14"].inputs.ckpt_name = "svd_xt.safetensors"; 
      } else {
           newWorkflow["14"].inputs.ckpt_name = settings.model;
      }
  }

  // Node 12: SVD Conditioning
  if (newWorkflow["12"] && newWorkflow["12"].inputs && settings) {
      newWorkflow["12"].inputs.video_frames = (settings.duration || 2) * (settings.fps || 8); 
      newWorkflow["12"].inputs.motion_bucket_id = settings.motionBucketId || 127;
      newWorkflow["12"].inputs.fps = settings.fps || 6;
      if (settings.width) newWorkflow["12"].inputs.width = settings.width;
      if (settings.height) newWorkflow["12"].inputs.height = settings.height;
  }

  // Node 3: KSampler (Randomize seed)
  if (newWorkflow["3"] && newWorkflow["3"].inputs) {
      newWorkflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000000);
  }

  return newWorkflow;
}

export const generateComfyVideo = async (
    visualPrompt: string,
    settings: VideoSettings,
    onProgress?: (val: number, max: number, stats?: any) => void,
    onActiveNode?: (nodeId: string | null) => void,
    inputImage?: File,
    customWorkflow?: Record<string, any>,
    onLog?: (message: string) => void,
    host: string = '/api/comfy'
): Promise<string> => {

    const log = (msg: string) => {
        console.log(msg);
        if (onLog) onLog(msg);
    };

    log(`[System] Initializing Video Generation...`);

    let uploadedFilename: string | undefined;

    // Upload Input Image (Video usually needs it, e.g. SVD)
    if (inputImage) {
        log("[Input] Uploading source image for video...");
        try {
            uploadedFilename = await uploadImageToComfy(inputImage, host);
        } catch (err) {
            log(`[Error] Failed to upload input image: ${err}`);
            throw err; 
        }
    }

    let workflow: any;
    if (customWorkflow) {
         log(`[Workflow] Using Custom Video Workflow.`);
         workflow = DynamicWorkflowEngine.injectExample(customWorkflow, {} as any, visualPrompt, "Original");
    } else {
         workflow = modifySvdWorkflow(svdWorkflowTemplate, uploadedFilename || "", settings);
    }

    const clientId = generateUUID();

    return new Promise((resolve, reject) => {
        const wsUrl = getWsUrl(host, clientId);
        log(`[Connection] Connecting to WebSocket: ${wsUrl}`);
        const socket = new WebSocket(wsUrl);
        let promptId: string | null = null;
        let pingInterval: any = null;

        pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping' }));
            }
        }, 5000);

        socket.onopen = async () => {
             // ... queue logic similar to image ...
             try {
                const queueRes = await fetch(`${host}/prompt`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt: workflow, client_id: clientId })
                });
                if (!queueRes.ok) throw new Error("Failed to queue");
                const qd = await queueRes.json();
                promptId = qd.prompt_id;
                log(`[Queue] Video Queued: ${promptId}`);
             } catch(e) {
                 reject(e);
             }
        };

        socket.onmessage = async (event) => {
             const message = JSON.parse(event.data);
             // ... progress logic ...
             if (message.type === 'progress' && message.data.prompt_id === promptId && onProgress) {
                 onProgress(message.data.value, message.data.max, null);
             }
             if (message.type === 'executing' && message.data.node === null && message.data.prompt_id === promptId) {
                 log("[Complete] Video Logic Finished. Fetching...");
                 clearInterval(pingInterval);
                 socket.close();
                 // Delay for file write
                 setTimeout(async () => {
                     try {
                         const history = await getHistory(promptId!, host);
                         const url = extractImageUrl(history, promptId!, host); 
                         resolve(url);
                     } catch(e) { reject(e); }
                 }, 1000);
             }
        };

        socket.onerror = (e) => reject(e);
    });
};
