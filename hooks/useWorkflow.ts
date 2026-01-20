import { useState, useEffect } from 'react';
import { WorkflowPreset } from '../types';

import workflowTemplate from '../workflow_template.json';
import img2imgWorkflowTemplate from '../workflow_img2img.json';
import videoWorkflowTemplate from '../services/workflow_svd.json';

const DEFAULT_PRESETS: WorkflowPreset[] = [
    {
        id: 'standard-t2i',
        name: 'Standard Text-to-Image',
        description: 'Default SDXL Workflow with Refiner support.',
        version: '1.0',
        type: 'image',
        workflow: workflowTemplate,
        nodeMapping: {
            ksampler: "3",
            checkpoint: "4",
            positive: "6",
            negative: "7",
            output: "9"
        }
    },
    {
        id: 'standard-i2i',
        name: 'Standard Image-to-Image',
        description: 'SDXL Img2Img with VAE Encode.',
        version: '1.0',
        type: 'image',
        workflow: img2imgWorkflowTemplate,
        nodeMapping: {
             ksampler: "3",
             checkpoint: "4",
             positive: "6",
             negative: "7",
             image_input: "11",
             output: "9"
        }
    },
    {
        id: 'svd-video',
        name: 'Stable Video Diffusion',
        description: 'Image-to-Video generation using SVD-XT.',
        version: '1.0',
        type: 'video',
        workflow: videoWorkflowTemplate,
        nodeMapping: {
             ksampler: "3",
             checkpoint: "14",
             image_input: "15",
             output: "9" // Video Save
        }
    }
];

export function useWorkflow() {
    const [presets, setPresets] = useState<WorkflowPreset[]>(DEFAULT_PRESETS);
    
    // Image Workflow State
    const [activeImagePresetId, setActiveImagePresetId] = useState<string>('standard-t2i');
    const [customImageWorkflow, setCustomImageWorkflow] = useState<Record<string, any> | null>(null);

    // Video Workflow State
    const [activeVideoPresetId, setActiveVideoPresetId] = useState<string>('svd-video');
    const [customVideoWorkflow, setCustomVideoWorkflow] = useState<Record<string, any> | null>(null);

    const activeImageWorkflow = customImageWorkflow || presets.find(p => p.id === activeImagePresetId)?.workflow;
    const activeVideoWorkflow = customVideoWorkflow || presets.find(p => p.id === activeVideoPresetId)?.workflow;

    const loadPreset = (id: string, type: 'image' | 'video') => {
        if (type === 'image') {
            setCustomImageWorkflow(null);
            setActiveImagePresetId(id);
        } else {
            setCustomVideoWorkflow(null);
            setActiveVideoPresetId(id);
        }
    };

    const importWorkflow = (json: Record<string, any>, name: string, type: 'image' | 'video') => {
        const newPreset: WorkflowPreset = {
            id: `custom-${type}-${Date.now()}`,
            name: name,
            description: `Imported Custom ${type === 'image' ? 'Image' : 'Video'} Workflow`,
            version: "0.1",
            type: type,
            workflow: json
        };
        setPresets(prev => [...prev, newPreset]);
        
        if (type === 'image') {
            setActiveImagePresetId(newPreset.id);
        } else {
            setActiveVideoPresetId(newPreset.id);
        }
    };

    return {
        presets,
        
        // Image Accessors
        activeImagePresetId,
        activeImageWorkflow,
        imagePresets: presets.filter(p => p.type === 'image'),
        loadImagePreset: (id: string) => loadPreset(id, 'image'),
        importImageWorkflow: (json: any, name: string) => importWorkflow(json, name, 'image'),
        
        // Video Accessors
        activeVideoPresetId,
        activeVideoWorkflow,
        videoPresets: presets.filter(p => p.type === 'video'),
        loadVideoPreset: (id: string) => loadPreset(id, 'video'),
        importVideoWorkflow: (json: any, name: string) => importWorkflow(json, name, 'video'),

        // Backwards compatibility / Generic
        setCustomWorkflow: setCustomImageWorkflow // Default to image for simple overrides
    };
}
