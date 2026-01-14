import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import shutil
import os
import tempfile

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
# "tiny", "base", "small", "medium", "large-v3"
# "distil-large-v3" is a good balance of speed and accuracy
MODEL_SIZE = "distil-large-v3"

# Automatic Device Selection
# Try CUDA first (NVIDIA GPU), then generic CPU
try:
    print(f"Attempting to load Whisper Model ({MODEL_SIZE}) on CUDA...")
    try:
        # Try float16 first (default for modern GPUs)
        model = WhisperModel(MODEL_SIZE, device="cuda", compute_type="float16")
    except Exception as e:
        print(f"⚠️ Float16 failed (common on GTX 10xx), trying int8: {e}")
        # Fallback to int8 (works well on Pascal architecture like GTX 1070)
        model = WhisperModel(MODEL_SIZE, device="cuda", compute_type="int8")
        
    DEVICE = "cuda"
    print("✅ Model Loaded Successfully on GPU (CUDA)!")
except Exception as e:
    print(f"⚠️ CUDA Load Failed: {e}")
    print(f"Falling back to CPU...")
    DEVICE = "cpu"
    # CPU needs int8 usually for speed, or float32 if strict
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    print("✅ Model Loaded Successfully on CPU!")

@app.post("/v1/audio/transcriptions")
async def transcribe(file: UploadFile = File(...), model_name: str = Form(default="whisper-1")):
    print(f"Received audio: {file.filename}")
    
    suffix = os.path.splitext(file.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # ENABLE VAD FILTER -> This is the magic fix!
        segments, info = model.transcribe(
            tmp_path, 
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        full_text = []
        for segment in segments:
            # Filter out low-probability hallucinations
            if segment.avg_logprob > -1.0: 
                full_text.append(segment.text)
        
        text = " ".join(full_text).strip()
        
        # Double check for common hallucination
        if text.lower().replace(".", "") in ["thank you", "thanks", "you"]:
            text = ""

        print(f"Transcription: {text[:50]}...")
        return {"text": text}
    except Exception as e:
        print(f"Transcription Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE}

if __name__ == "__main__":
    # Host 0.0.0.0 exposes it to the LAN
    uvicorn.run(app, host="0.0.0.0", port=8000)
