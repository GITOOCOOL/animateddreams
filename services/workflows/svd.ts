import { VideoSettings } from '../../types';

/**
 * modifySvdWorkflow:
 * Updates the SVD workflow with settings and input image.
 */
export const modifySvdWorkflow = (baseWorkflow: any, inputFilename: string, settings?: VideoSettings) => {
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
