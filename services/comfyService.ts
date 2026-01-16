import workflowTemplate from '../workflow_template.json';
import img2imgWorkflowTemplate from '../workflow_img2img.json';
import svdWorkflowTemplate from './workflow_svd.json';
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
        images: {
          filename: string;
          subfolder: string;
          type: string;
        }[];
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
    const response = await fetch(`${host}/object_info/CheckpointLoaderSimple`);
    if (!response.ok) throw new Error("Failed to fetch object info");

    const data = await response.json();
    // ComfyUI object_info format for dropdowns: [ ["option1", "option2"] ]
    const models = data.CheckpointLoaderSimple.input.required.ckpt_name[0];
    return models || [];
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return [];
  }
};

/**
 * Uploads an image to ComfyUI for use in generation.
 */
const uploadImageToComfy = async (file: File | Blob, host: string): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
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
 * modifyWorkflow:
 * Recursively updates the prompt in the workflow JSON.
 */
const modifyWorkflow = (baseWorkflow: any, visualPrompt: string, originalPrompt: string, settings?: ComfySettings, inputImageFilename?: string) => {
  const newWorkflow = JSON.parse(JSON.stringify(baseWorkflow));

  // Update Positive Prompt (Node 6)
  if (newWorkflow["6"] && newWorkflow["6"].inputs) {
    newWorkflow["6"].inputs.text = `${visualPrompt}, detailed face, realistic eyes, natural skin texture, masterpiece, best quality, 8k`;
  }

  // Custom Metadata Injection (Node 99)
  // This node is not connected to the output but stores the user's original text in the workflow metadata
  newWorkflow["99"] = {
    inputs: {
      text: `ORIGINAL USER DREAM: ${originalPrompt}`,
      clip: ["4", 1] // Connect to dummy CLIP so it's valid
    },
    class_type: "CLIPTextEncode",
    _meta: { title: "METADATA: User Input" }
  };

  // Update Settings (Node 3 - KSampler)
  if (newWorkflow["3"] && newWorkflow["3"].inputs && settings) {
    newWorkflow["3"].inputs.steps = settings.steps;
    newWorkflow["3"].inputs.cfg = settings.cfg;
    newWorkflow["3"].inputs.sampler_name = settings.sampler;
    newWorkflow["3"].inputs.scheduler = settings.scheduler;

    // If Img2Img, apply denoise
    if (inputImageFilename) {
      newWorkflow["3"].inputs.denoise = settings.denoise;
    } else {
      newWorkflow["3"].inputs.denoise = 1; // Always 1 for Txt2Img
    }

    // Seed logic
    if (settings.seed) {
      newWorkflow["3"].inputs.seed = settings.seed;
    } else {
      newWorkflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000000);
    }
  } else if (newWorkflow["3"] && newWorkflow["3"].inputs) {
    // Default randomize if no settings provided or legacy
    newWorkflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000000);
  }

  // If Img2Img: Set the LoadImage node (Node 11)
  if (inputImageFilename && newWorkflow["11"] && newWorkflow["11"].inputs) {
    newWorkflow["11"].inputs.image = inputImageFilename;
  }

  // Update Checkpoint/Model (Node 4)
  if (newWorkflow["4"] && newWorkflow["4"].inputs && settings && settings.model) {
    newWorkflow["4"].inputs.ckpt_name = settings.model;
  }

  // Update Empty Latent Image Dimensions (Node 5)
  if (newWorkflow["5"] && newWorkflow["5"].inputs && settings) {
    newWorkflow["5"].inputs.width = settings.width || 1024;
    newWorkflow["5"].inputs.height = settings.height || 1024;
  }

  // Inject LoRA if selected
  if (settings && settings.lora && settings.lora !== "None") {
    // Create a new LoraLoader node (Arbitrary ID 100)
    console.log(`[Workflow] Injecting LoRA Node: ${settings.lora} (Strength: ${settings.loraStrength})`);
    newWorkflow["100"] = {
      inputs: {
        lora_name: settings.lora,
        strength_model: settings.loraStrength || 1.0,
        strength_clip: settings.loraStrength || 1.0,
        model: ["4", 0], // Connect to Checkpoint
        clip: ["4", 1]   // Connect to Checkpoint
      },
      class_type: "LoraLoader",
      _meta: { title: "Dynamic LoRA" }
    };

    // Rewire downstream nodes to use LoRA output instead of Checkpoint
    // KSampler (Node 3) needs Model from LoRA (100)
    if (newWorkflow["3"] && newWorkflow["3"].inputs) {
      newWorkflow["3"].inputs.model = ["100", 0];
    }

    // CLIP Text Encode Positive (Node 6) needs CLIP from LoRA (100)
    if (newWorkflow["6"] && newWorkflow["6"].inputs) {
      newWorkflow["6"].inputs.clip = ["100", 1];
    }

    // CLIP Text Encode Negative (Node 7) needs CLIP from LoRA (100)
    if (newWorkflow["7"] && newWorkflow["7"].inputs) {
      newWorkflow["7"].inputs.clip = ["100", 1];
    }

    // Img2Img VAE Encode (Node 10) uses VAE from Checkpoint (4), so no change needed there
    // VAE Decode (Node 8) uses VAE from Checkpoint (4), so no change needed there
  }

  return newWorkflow;
};

/**
 * Generates an image using a local ComfyUI instance.
 * Returns the URL of the generated image.
 */

export const generateComfyImage = async (
  visualPrompt: string,
  originalPrompt: string,
  onProgress?: (val: number, max: number) => void,
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
      workflowTmpl = img2imgWorkflowTemplate;
      log(`[Upload] Image uploaded successfully: ${uploadedFilename}. Switching to Img2Img workflow.`);
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

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      // Progress Update
      if (message.type === 'progress' && message.data.prompt_id === promptId && onProgress) {
        onProgress(message.data.value, message.data.max);
        if (message.data.value === 1) log(`[Progress] Started sampling...`);
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

    socket.onerror = (err) => {
      log(`[Socket Error] WebSocket error occurred.`);
      console.error("WebSocket error:", err);
      clearInterval(pingInterval);
    };

    socket.onclose = () => {
      log(`[Connection] WebSocket closed.`);
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
  if (!promptHistory || !promptHistory.outputs) throw new Error("No output found in history");

  // Find the SaveImage node (Node "9" in our template)
  // Or just grab the first output available
  for (const nodeId in promptHistory.outputs) {
    const outputs = promptHistory.outputs[nodeId];
    if (outputs.images && outputs.images.length > 0) {
      const img = outputs.images[0];
      // Use configured host path to retrieve image
      const url = `${host}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
      console.log("FINAL GENERATED URL:", url);
      return url;
    }
  }
  throw new Error("No image output found");
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
      newWorkflow["12"].inputs.video_frames = Math.min(25, settings.duration * settings.fps); // Frame count approximation
      newWorkflow["12"].inputs.motion_bucket_id = settings.motionBucketId || 127;
      newWorkflow["12"].inputs.fps = settings.fps || 6;
  }

  // Node 3: KSampler (Randomize seed)
  if (newWorkflow["3"] && newWorkflow["3"].inputs) {
      newWorkflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000000);
      
      // We could add steps/cfg to VideoSettings if desired, using defaults for now
  }

  return newWorkflow;
}

export const generateComfyVideo = async (
    inputImageUrl: string,
    settings: VideoSettings,
    onProgress?: (val: number, max: number) => void,
    onLog?: (msg: string) => void,
    host: string = '/api/comfy'
): Promise<string> => {
    const log = (msg: string) => {
        console.log(msg);
        if (onLog) onLog(msg);
    };

    log(`[Video] Initializing SVD Sequence...`);
    
    // We need the filename of the generated image currently in ComfyUI output.
    // However, inputImageUrl from state might be a URL like http://host/view?filename=...
    // We need to either re-upload it or extract the filename if it's already on server.
    // Simplest robust way: Fetch the image blob from URL and re-upload to 'input' folder.
    
    let inputFilename = "example.png";

    try {
        log(`[Video] Preparing input frame from: ${inputImageUrl}`);
        // If it's a Comfy URL, we can parse it.
        const urlObj = new URL(inputImageUrl, window.location.origin);
        const filenameParam = urlObj.searchParams.get("filename");
        
        if (filenameParam) {
             // It's already on the server, but likely in 'output'. SVD LoadImage needs it?
             // LoadImage usually looks in 'input'.
             // We should fetch and re-upload to be safe and simple.
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

    const workflow = modifySvdWorkflow(svdWorkflowTemplate, inputFilename, settings);
    const clientId = generateUUID();

    return new Promise((resolve, reject) => {
        const wsUrl = getWsUrl(host, clientId);

        const socket = new WebSocket(wsUrl);
        let promptId: string | null = null;

        const pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' }));
        }, 5000);

        socket.onopen = async () => {
             try {
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
                 clearInterval(pingInterval);
                 socket.close();
                 reject(e);
             }
        };

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
             
            if (message.type === 'progress' && message.data.prompt_id === promptId && onProgress) {
                onProgress(message.data.value, message.data.max);
            }

            if (promptId && message.type === 'executing' && message.data.node === null && message.data.prompt_id === promptId) {
                 log("[Video] Generation Complete. Retrieving video...");
                 clearInterval(pingInterval);
                 socket.close();

                 try {
                     await new Promise(r => setTimeout(r, 1000));
                     const history = await getHistory(promptId, host);
                     // For SVD, output is SaveAnimatedWEBP (Node 9)
                     // Re-use logic or custom extract
                     const videoUrl = extractImageUrl(history, promptId, host); // Works for video nodes too usually if format is standard
                     resolve(videoUrl);
                 } catch (e) {
                     reject(e);
                 }
            }
        };
        
        socket.onerror = (e) => {
             clearInterval(pingInterval);
             reject(e);
        };
    });
};
