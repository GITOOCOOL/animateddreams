
import { generateWorkflowFromParameters, WorkflowParameters } from './services/workflowGenerator';

const params: WorkflowParameters = {
    model: "v1-5-pruned.ckpt",
    positivePrompt: "A beautiful landscape",
    negativePrompt: "ugly, blurry",
    steps: 20,
    cfg: 7,
    sampler: "euler_ancestral",
    scheduler: "normal",
    width: 512,
    height: 512,
    denoise: 1.0,
    workflowType: 'txt2img'
};

const workflow = generateWorkflowFromParameters(params);
console.log(JSON.stringify(workflow, null, 2));

const paramsLoras: WorkflowParameters = {
    ...params,
    loras: [
        { name: "detail_slider.safetensors", strength: 1.0 }
    ]
};
console.log("\n--- With LoRA ---\n");
console.log(JSON.stringify(generateWorkflowFromParameters(paramsLoras), null, 2));
