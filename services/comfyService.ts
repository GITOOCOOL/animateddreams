import { ComfySettings, VideoSettings } from '../types';
import { DynamicWorkflowEngine } from './dynamicWorkflowEngine';
import { generateWorkflowFromParameters, WorkflowParameters } from './workflowGenerator';

// Template imports for Video (SVD/AnimateDiff) - kept for now
import svdWorkflowTemplate from './workflow_svd.json';
import animatediffWorkflowTemplate from './workflow_animatediff.json'; 

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
 * Robust fetch wrapper that handles backend proxying for cross-origin ComfyUI hosts.
 */
const comfyFetch = async (host: string, path: string, options: RequestInit = {}) => {
    // Determine if the target host is effectively 'local' to the BROWSER
    const isLocalToBrowser = host.includes(window.location.hostname);
    
    // We only skip the proxy if it's the exact same machine/port as the web app (to avoid CORS)
    // or if it's a relative path.
    if (host.startsWith('/') || isLocalToBrowser) {
        return fetch(`${host}${path}`, options);
    }

    // Special case: If host is 127.0.0.1 but we are accessing via a LAN IP, 
    // the proxy (on the server) will hit ITSELF. This is a common misconfig.
    if (host.includes('127.0.0.1') || host.includes('localhost')) {
        console.warn(`[ComfyService] You are set to '127.0.0.1' but accessing from ${window.location.hostname}. This will likely fail as the proxy will look at the BACKEND machine, not your current machine. Use your actual LAN IP instead.`);
    }

    // Otherwise, route through our backend's proxy route to bypass browser CORS
    const proxyUrl = `/api/engines/proxy${path}`;
    const headers = {
        ...(options.headers || {}),
        'x-comfy-host': host
    } as Record<string, string>;

    return fetch(proxyUrl, { 
        ...options, 
        headers 
    });
};

/**
 * Fetches all available node types from the ComfyUI server.
 * This allows for dynamic node discovery and "Add Any Node" functionality.
 */
export const getAvailableNodeTypes = async (host: string): Promise<string[]> => {
    try {
        const response = await comfyFetch(host, '/object_info');
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
    const response = await comfyFetch(host, '/system_stats');
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
    const response = await comfyFetch(host, '/system_stats');
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
        const response = await comfyFetch(host, '/object_info/CheckpointLoaderSimple');
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
        const adResponse = await comfyFetch(host, '/object_info/ADE_AnimateDiffLoaderGen1');
        if (adResponse.ok) {
            const data = await adResponse.json();
            const adModels = data.ADE_AnimateDiffLoaderGen1?.input?.required?.model_name?.[0]; // Gen1 uses 'model_name'
            if (Array.isArray(adModels)) adModels.forEach(m => models.add(m));
        } else {
             // Fallback to legacy loader if Gen1 missing
            const legacyResponse = await comfyFetch(host, '/object_info/ADE_AnimateDiffLoader');
            if (legacyResponse.ok) {
                const data = await legacyResponse.json();
                const adModels = data.ADE_AnimateDiffLoader?.input?.required?.model_name?.[0];
                if (Array.isArray(adModels)) adModels.forEach(m => models.add(m));
            }
        }
    } catch (e) {
        console.warn("Failed to fetch AnimateDiff models", e);
    }

    // 3. Fetch from CheckpointLoader (some custom nodes use this name)
    try {
        const response = await comfyFetch(host, '/object_info/CheckpointLoader');
        if (response.ok) {
            const data = await response.json();
            const ckpts = data.CheckpointLoader?.input?.required?.ckpt_name?.[0];
            if (Array.isArray(ckpts)) ckpts.forEach(m => models.add(m));
        }
    } catch (e) {
        console.warn("Failed to fetch from CheckpointLoader", e);
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
  
  const res = await comfyFetch(host, '/upload/image', {
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
      const directRes = await comfyFetch(host, '/object_info/LoraLoader');
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
    const response = await comfyFetch(host, '/object_info');
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
        const response = await comfyFetch(host, '/object_info/IPAdapterModelLoader');
        if (!response.ok) throw new Error("Failed to fetch object info");

        const data = await response.json();
        const models = data.IPAdapterModelLoader?.input?.required?.ipadapter_file?.[0];
        return models || [];
    } catch (error) {
        console.error("Failed to fetch IP Adapters:", error);
        return [];
    }
};
/**
 * Fetches the list of available samplers from ComfyUI.
 */
export const getAvailableSamplers = async (host: string): Promise<string[]> => {
    try {
        const response = await comfyFetch(host, '/object_info/KSampler');
        if (!response.ok) throw new Error("Failed to fetch KSampler info");
        const data = await response.json();
        const samplers = data.KSampler?.input?.required?.sampler_name?.[0];
        return Array.isArray(samplers) ? samplers : [];
    } catch (error) {
        console.error("Failed to fetch samplers:", error);
        return [];
    }
};

/**
 * Fetches the list of available schedulers from ComfyUI.
 */
export const getAvailableSchedulers = async (host: string): Promise<string[]> => {
    try {
        const response = await comfyFetch(host, '/object_info/KSampler');
        if (!response.ok) throw new Error("Failed to fetch KSampler info");
        const data = await response.json();
        const schedulers = data.KSampler?.input?.required?.scheduler?.[0];
        return Array.isArray(schedulers) ? schedulers : [];
    } catch (error) {
        console.error("Failed to fetch schedulers:", error);
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
        await comfyFetch(host, '/interrupt', { method: 'POST' });
        await comfyFetch(host, '/queue', { 
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

  let uploadedFilename: string | undefined;

  // 1. If we have an input image, upload it...
  if (inputImage) {
    try {
      uploadedFilename = await uploadImageToComfy(inputImage, host);
      log(`[Upload] Image uploaded successfully: ${uploadedFilename}`);
    } catch (err) {
      log(`[Error] Failed to upload input image: ${err}`);
      throw err;
    }
  }

  // Choose Workflow: Custom > Generated from Parameters
  let workflow: any;
  
  if (customWorkflow) {
      log(`[Workflow] Using Custom/Preset Workflow.`);
      // If a custom workflow is provided, we use it AS IS.
      // We might inject seed if it's missing or if explicitly requested, but for now 
      // we assume the Custom Workflow is "Ready to Run".
      // TODO: Maybe still allow simple prompt injection if the user wants?
      workflow = customWorkflow; 
      
      // Attempt to inject random seed if KSampler exists, just to ensure variety
      // This is a minimal touch approach
      Object.values(workflow).forEach((node: any) => {
          if (node.class_type === 'KSampler' && node.inputs) {
              node.inputs.seed = Math.floor(Math.random() * 1000000000000);
          }
      });
      
  } else if (settings) {
      log(`[Workflow] Generating Dynamic Workflow from Parameters.`);
      
      const params: WorkflowParameters = {
          model: settings.model,
          positivePrompt: visualPrompt,
          negativePrompt: "nsfw, nude, deformed, blurry, bad anatomy, disfigured, watermark, text, signature", // Default negative or from settings (if we add negative to settings)
          steps: settings.steps,
          cfg: settings.cfg,
          sampler: settings.sampler,
          scheduler: settings.scheduler || 'normal',
          width: settings.width,
          height: settings.height,
          denoise: settings.denoise,
          seed: settings.seed, // If undefined, generator creates random
          loras: settings.loras?.map(l => ({ 
              name: l.name, 
              strength: l.strength 
          })),
          useIpAdapter: settings.useIpAdapter,
          ipAdapterModel: settings.ipAdapterModel,
          ipAdapterWeight: settings.ipAdapterWeight,
          ipAdapterPreset: settings.ipAdapterPreset,
          inputImagePath: uploadedFilename,
          workflowType: inputImage 
            ? (settings.useIpAdapter ? 'ipadapter' : 'img2img') 
            : 'txt2img'
      };

      workflow = generateWorkflowFromParameters(params);
      
  } else {
      throw new Error("No settings provided for generation.");
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
        const queueRes = await comfyFetch(host, '/prompt', {
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
  const res = await comfyFetch(host, `/history/${promptId}`);
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
                const queueRes = await comfyFetch(host, '/prompt', {
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
