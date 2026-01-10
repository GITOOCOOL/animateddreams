import workflowTemplate from '../workflow_template.json';
import img2imgWorkflowTemplate from '../workflow_img2img.json';
import { ComfySettings } from '../types';

// Use local proxy path to avoid CORS/Mixed Content issues
const COMFY_HOST = '/api/comfy';
const COMFY_WS_HOST = '/api/comfy-ws';

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
export const checkComfyConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${COMFY_HOST}/system_stats`);
    return response.ok;
  } catch (error) {
    console.warn("ComfyUI connection check failed:", error);
    return false;
  }
};

/**
 * Fetches the list of available checkpoint models from ComfyUI.
 */
export const getAvailableModels = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${COMFY_HOST}/object_info/CheckpointLoaderSimple`);
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
const uploadImageToComfy = async (file: File | Blob): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('overwrite', 'true');

  const res = await fetch(`${COMFY_HOST}/upload/image`, {
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
export const getAvailableLoras = async (): Promise<string[]> => {
  try {
    // 1. Direct Fetch Strategy
    try {
      console.log("Fetching LoRAs from LoraLoader...");
      const directRes = await fetch(`${COMFY_HOST}/object_info/LoraLoader`);
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
    const response = await fetch(`${COMFY_HOST}/object_info`);
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
  settings?: ComfySettings
): Promise<string> => {

  let workflowTmpl: any = workflowTemplate;
  let uploadedFilename: string | undefined;

  // 1. If we have an input image, upload it and switch workflow
  if (inputImage) {
    console.log("Input image detected, uploading to ComfyUI...");
    try {
      uploadedFilename = await uploadImageToComfy(inputImage);
      workflowTmpl = img2imgWorkflowTemplate;
      console.log("Image uploaded:", uploadedFilename, "Switched to Img2Img workflow");
    } catch (err) {
      console.error("Failed to upload input image, falling back to Txt2Img:", err);
    }
  }

  const workflow = modifyWorkflow(workflowTmpl, visualPrompt, originalPrompt, settings, uploadedFilename);
  const clientId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}${COMFY_WS_HOST}?clientId=${clientId}`;

    const socket = new WebSocket(wsUrl);
    let promptId: string | null = null;

    // Heartbeat to keep connection alive
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 5000);

    socket.onopen = async () => {
      console.log("Connected to ComfyUI WebSocket via Proxy", clientId);
      // ... (queue logic remains same)
      try {
        const queueRes = await fetch(`${COMFY_HOST}/prompt`, {
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
        console.log("Prompt Queued with ID:", promptId);
      } catch (err) {
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
      }

      // Active Node Update
      if (message.type === 'executing' && message.data.prompt_id === promptId) {
        if (onActiveNode) {
          onActiveNode(message.data.node); // Pass the current node ID (or null when done)
        }
      }

      // Execution Finished
      if (promptId && message.type === 'executing' && message.data.node === null && message.data.prompt_id === promptId) {
        // ... (completion logic)
        clearInterval(pingInterval);
        console.log("ComfyUI Execution Finished for ID:", promptId);
        socket.close();

        try {
          await new Promise(r => setTimeout(r, 1000));
          const history = await getHistory(promptId);
          const imageUrl = extractImageUrl(history, promptId);
          console.log("Generated Image URL:", imageUrl);
          resolve(imageUrl);
        } catch (err) {
          console.error("Failed to extract image:", err);
          reject(err);
        }
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      clearInterval(pingInterval);
    };

    socket.onclose = () => clearInterval(pingInterval);
  });
};

const getHistory = async (promptId: string): Promise<ComfyHistoryResponse> => {
  const res = await fetch(`${COMFY_HOST}/history/${promptId}`);
  if (!res.ok) throw new Error("Failed to get history");
  return await res.json();
};

const extractImageUrl = (history: ComfyHistoryResponse, promptId: string): string => {
  const promptHistory = history[promptId];
  if (!promptHistory || !promptHistory.outputs) throw new Error("No output found in history");

  // Find the SaveImage node (Node "9" in our template)
  // Or just grab the first output available
  for (const nodeId in promptHistory.outputs) {
    const outputs = promptHistory.outputs[nodeId];
    if (outputs.images && outputs.images.length > 0) {
      const img = outputs.images[0];
      // Use local proxy path to retrieve image
      const url = `${COMFY_HOST}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
      console.log("FINAL GENERATED URL:", url);
      return url;
    }
  }
  throw new Error("No image output found");
};
