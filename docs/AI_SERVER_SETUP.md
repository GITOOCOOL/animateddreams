# AI Backend Server Setup Guide

This guide describes how to set up a dedicated AI server (e.g., a Windows PC with an NVIDIA GPU) to power the AnimatedDreams application running on a client device (e.g., a MacBook).

## Prerequisites
- **OS**: Windows 10/11 or Linux (Ubuntu 22.04+)
- **GPU**: NVIDIA RTX 3060 (12GB) or better recommended
- **Software**: Python 3.10+, Git, CUDA Toolkit
- **Build Tools**: [Rust](https://rustup.rs/) (Required for installing some Python packages)
- **Compilers**: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Select "Desktop development with C++")

> **Note**: If you see "metadata-generation-failed" errors, install Rust. If Rust complains about "Visual C++ prerequisites", choose **Option 1** to install the Visual Studio Community installer.

---

## 1. Ollama (LLM & Vision Analytics)
Ollama handles the dream interpretation and visual prompt generation.

1.  **Download & Install**: [https://ollama.com/download](https://ollama.com/download)
2.  **Network Configuration**:
    *   **Windows**: By default, Ollama only listens on `localhost`. To expose it to your LAN:
        1.  Quit Ollama from the taskbar.
        2.  Open PowerShell.
        3.  Set environment variable: `setx OLLAMA_HOST "0.0.0.0"`
        4.  Restart Ollama.
    *   **Linux**: Edit systemd service to add `Environment="OLLAMA_HOST=0.0.0.0"`.
3.  **Pull Models**:
    ```powershell
    ollama pull llama3:latest
    ollama pull llava:latest
    ```

---

## 2. ComfyUI (Image Generation)
ComfyUI handles the Stable Diffusion image generation pipeline.

1.  **Install**: Follow instructions at [ComfyUI GitHub](https://github.com/comfyanonymous/ComfyUI).
2.  **Launch Arguments (CRITICAL)**:
    You MUST enable CORS and listen on all interfaces for the web app to communicate with it.
    ```powershell
    python main.py --listen --enable-cors-header "*"
    ```
3.  **Checkpoints**: Ensure you have a standard SDXL or Flux model in your `models/checkpoints` folder.

---

## 3. Whisper Server (Voice Dictation)
Since Groq is cloud-based, we use a local Python script to provide an OpenAI-compatible transcription API using `faster-whisper`.

### A. Install Dependencies
```powershell
pip install fastapi uvicorn faster-whisper python-multipart
```

### B. Create Server Script
Save the following code as `whisper_server.py` in a dedicated folder:

```python
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from faster_whisper import WhisperModel
import shutil
import os
import tempfile

app = FastAPI()

# Configuration
MODEL_SIZE = "distil-large-v3" # Options: base, small, medium, large-v3, distil-large-v3
DEVICE = "cuda" # 'cpu' if no GPU
COMPUTE_TYPE = "float16" # 'int8' for lower VRAM usage

print(f"Loading Whisper Model ({MODEL_SIZE})...")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Model Loaded!")

@app.post("/v1/audio/transcriptions")
async def transcribe(file: UploadFile = File(...), model_name: str = Form(default="whisper-1")):
    print(f"Received audio: {file.filename}")
    
    # Create temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(tmp_path, beam_size=5)
        text = " ".join([segment.text for segment in segments]).strip()
        print(f"Transcription: {text[:50]}...")
        return {"text": text}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    # Host 0.0.0.0 exposes it to the LAN
    uvicorn.run(app, host="0.0.0.0", port=9000)
```

### C. Run Service
```powershell
python whisper_server.py
```
*Port 9000 will be opened.*

---

## 4. Connecting the Client (Mac/Laptop)

1.  Find the **Local IP Address** of your Server PC (e.g., `192.168.1.50`).
2.  Update your Client `.env` or App Settings:

**In App Settings:**
- **Ollama Host**: `http://192.168.1.50:11434`
- **ComfyUI Host**: `http://192.168.1.50:8188`
- **Transcription**: Select "Local URL" -> `http://192.168.1.50:9000/v1/audio/transcriptions`
