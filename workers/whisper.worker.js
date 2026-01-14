
console.log("[Worker] Whisper Worker Starting...");
import { pipeline, env } from '@xenova/transformers';

// CRITICAL: Force remote download from Hugging Face
env.allowLocalModels = false;
env.useBrowserCache = true; // Re-enable cache for performance
env.token = null; // Ensure no invalid token is sent
console.log("[Worker] Env Configured:", { allowLocal: env.allowLocalModels, useCache: env.useBrowserCache });

// Singleton for the pipeline
class MyTranscriptionPipeline {
  static task = 'automatic-speech-recognition';
  static model = 'Xenova/whisper-tiny.en'; 
  static instance = null;
  static loadingPromise = null;

  static async getInstance(progress_callback = null) {
    if (this.instance) return this.instance;

    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
       const pipe = await pipeline(this.task, this.model, { progress_callback });
       this.instance = pipe;
       return pipe;
    })();

    return this.loadingPromise;
  }
}

self.addEventListener('message', async (event) => {
  const { type, audio } = event.data;

  if (type === 'load') {
    try {
        await MyTranscriptionPipeline.getInstance((data) => {
            self.postMessage({
                status: 'loading',
                data: data
            });
        });
        self.postMessage({ status: 'ready' });
    } catch (e) {
        console.error("[Worker] Load Error:", e);
        self.postMessage({ status: 'error', data: e.message });
    }
    return;
  }

  if (type === 'transcribe') {
    try {
      console.log("[Worker] Transcription Request Received");
      // Pass callback to ensure loading feedback if this is the first call
      let transcriber = await MyTranscriptionPipeline.getInstance((data) => {
          self.postMessage({ status: 'loading', data });
      });

      console.log("[Worker] Pipeline Ready. Starting Inference...");
      const output = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe',
        return_timestamps: false,
      });
      console.log("[Worker] Inference Complete");

      self.postMessage({
        status: 'complete',
        data: output
      });

    } catch (e) {
      console.error("[Worker] Transcribe Error:", e);
      self.postMessage({ status: 'error', data: e.message });
    }
  }
});
