
import { pipeline } from '@xenova/transformers';

// Singleton for the pipeline
class MyTranscriptionPipeline {
  static task = 'automatic-speech-recognition';
  // Use a quantized model for speed and size (distil-whisper)
  static model = 'Xenova/distil-whisper-small.en'; 
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
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
        self.postMessage({ status: 'error', data: e.message });
    }
    return;
  }

  if (type === 'transcribe') {
    try {
      let transcriber = await MyTranscriptionPipeline.getInstance();

      const output = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe',
        return_timestamps: false, // simpler for now
      });

      self.postMessage({
        status: 'complete',
        data: output
      });

    } catch (e) {
      self.postMessage({ status: 'error', data: e.message });
    }
  }
});
