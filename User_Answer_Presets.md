# Audit of Legacy Workflow Presets

You incorrectly suspected the system was drifting because these **Legacy Presets** were overriding the new Dynamic Generator. Here is what they contained:

## 1. Standard Text-to-Image (`standard-t2i`)
**File**: `workflow_template.json`
**Settings (Hardcoded):**
- **Model**: `juggernautXL_ragnarokBy.safetensors`
- **Steps**: 50
- **CFG**: 5.5
- **Sampler**: `dpmpp_2m`
- **Scheduler**: `karras`
- **Denoise**: 1.0
- **Negative Prompt**: *"bad anatomy, blurry eyes..."* (Standard long negative)

## 2. Standard Image-to-Image (`standard-i2i`)
**File**: `workflow_img2img.json`
**Settings (Hardcoded):**
- **Model**: `juggernautXL_ragnarokBy.safetensors`
- **Steps**: 50 (High for img2img!)
- **CFG**: 5.5
- **Denoise**: 0.65
- **Sampler**: `dpmpp_2m`

## ⚠️ The Issue
Because `useWorkflow.ts` defaulted to `standard-t2i`, the application was prioritizing this **Static JSON** over your UI settings. Even if you changed the slider to "Steps: 20", the system sent "Steps: 50" because it was running the Preset.

## 🛠️ The Fix (implemented immediately)
I am updating `useWorkflow.ts` to default to a **"Dynamic Mode"**.
- **Behavior**: `customWorkflow` will be `null` by default.
- **Result**: `comfyService` will use `workflowGenerator.ts` to build the JSON *fresh* from your UI parameters every time found in `SettingsPanel`.
- **Full Control**: Restored.
