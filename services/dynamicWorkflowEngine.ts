import { ComfySettings, WorkflowPreset } from "../types";

// Core Engine to manipulate ANY ComfyUI workflow
export class DynamicWorkflowEngine {
    
    // Heuristic: Inject User Settings into arbitrary workflow
    static injectExample(workflow: Record<string, any>, settings: ComfySettings, visualPrompt: string, originalPrompt: string): Record<string, any> {
        const newWorkflow = JSON.parse(JSON.stringify(workflow));
        const nodes = Object.entries(newWorkflow);

        // 1. Detect KSampler (The Brain) via class_type
        // We look for 'KSampler', 'KSamplerAdvanced', etc.
        const kSamplerEntry = nodes.find(([_, node]: any) => 
            node.class_type && (node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced')
        );

        if (kSamplerEntry) {
            const [id, sampler] = kSamplerEntry as [string, any];
            console.log(`[DynamicEngine] Found KSampler at ID: ${id}`);
            
            // Inject Settings
            if (sampler.inputs) {
                if (settings.seed) sampler.inputs.seed = settings.seed;
                else sampler.inputs.seed = Math.floor(Math.random() * 1000000000000);
                
                sampler.inputs.steps = settings.steps;
                sampler.inputs.cfg = settings.cfg;
                sampler.inputs.sampler_name = settings.sampler;
                sampler.inputs.scheduler = settings.scheduler;
            }
        
            // 2. Trace Conditioning (Positive / Negative)
            // KSampler inputs: "positive": ["id", slot], "negative": ["id", slot]
            if (sampler.inputs?.positive) {
                this.injectPrompt(newWorkflow, sampler.inputs.positive[0], visualPrompt, "Positive");
            }
            if (sampler.inputs?.negative) {
                // For negative, we often keep the preset's negative prompt, or append.
                // For now, let's just log it. If user wants custom negative, they edit the preset.
                // Or we can inject standard negative if empty.
                console.log(`[DynamicEngine] Traced Negative Conditioning to Node ${sampler.inputs.negative[0]}`);
            }
        } else {
            console.warn("[DynamicEngine] No KSampler found! Is this a valid generation workflow?");
        }

        // 3. Detect Checkpoint Loader
        const loaderEntry = nodes.find(([_, node]: any) => 
            node.class_type === 'CheckpointLoaderSimple'
        );
        if (loaderEntry && settings.model) {
             const [id, loader] = loaderEntry as [string, any];
             console.log(`[DynamicEngine] Found CheckpointLoader at ID: ${id}, setting model: ${settings.model}`);
             loader.inputs.ckpt_name = settings.model;
        }

        // 4. Input Image Injection (if applicable)
        // Look for LoadImage node
        // TODO: Logic for img2img vs txt2img routing is complex in dynamic flows.
        // For now, if we have an input image filename, we find the first LoadImage node and set it.
        // 5. Inject Custom Nodes (Expert Mode)
        if (settings.customNodes && settings.customNodes.length > 0) {
            settings.customNodes.forEach(node => {
                console.log(`[DynamicEngine] Injecting Custom Node: ${node.type} (#${node.id})`);
                newWorkflow[node.id] = {
                    inputs: node.inputs,
                    class_type: node.type,
                    _meta: { title: `Custom: ${node.type}` }
                };
            });
        }
        return newWorkflow;
    }

    // Recursively find the CLIPTextEncode Node
    // Graph Link: KSampler -> [Conditioning Node?] -> CLIPTextEncode
    static injectPrompt(workflow: Record<string, any>, nodeId: string, text: string, type: "Positive" | "Negative") {
        const node = workflow[nodeId];
        if (!node) return;

        if (node.class_type === 'CLIPTextEncode') {
             console.log(`[DynamicEngine] Injecting ${type} Prompt into Node ${nodeId}`);
             node.inputs.text = text;
        } else {
            // It might be a Reroute, or a LoRA Loader, or ControlNet Apply that passes conditioning through.
            // We need to walk UP the graph.
            // Check input links. "conditioning" or "CLIP" generally implies flow.
            // This is complex. For V1 Custom Workflows, we assume standard KSampler -> TextEncode direct link 
            // OR simple Lora chain.
            
            // Heuristic A: Does this node have a 'positive' or 'conditioning' input that is a link array?
            // If so, follow it.
            // For LoraLoader: inputs.model (model), inputs.clip (clip). 
            // Actually LoraLoader outputs MODEL and CLIP. It sits BEFORE TextEncode usually. 
            // But KSampler takes CONDITIONING. 
            // So KSampler -> [LoraLoader?] -> NO. LoraLoader modifies Model/CLIP, then goes into TextEncode.
            
            // So KSampler -> positive -> [CLIPTextEncode] (Output 0 is conditioning)
            // So if KSampler positive points to Node X, Node X MUST BE outputting Conditioning.
            // Common Nodes outputting Conditioning: CLIPTextEncode, ControlNetApply, FluxGuidance.
            
            if (node.inputs) {
                // Try to find an input that looks "upstream"
                // This is hard without a full map.
                // Fallback: Just search for ALL CLIPTextEncode nodes and if we find one with title "Positive", use it?
            }
        }
    }
}
