#!/bin/bash

# Configuration
COMFY_DIR="$1"

if [ -z "$COMFY_DIR" ]; then
    echo "Usage: ./download_models.sh <path_to_ComfyUI>"
    echo "Example: ./download_models.sh /Users/suraj/ComfyUI"
    exit 1
fi

echo "Target ComfyUI Directory: $COMFY_DIR"

# 1. IP-Adapter Model (SDXL Plus ViT-H)
IPADAPTER_DIR="$COMFY_DIR/models/ipadapter"
echo "Creating directory: $IPADAPTER_DIR"
mkdir -p "$IPADAPTER_DIR"

echo "Downloading IP-Adapter Plus (SDXL)..."
curl -L -o "$IPADAPTER_DIR/ip-adapter-plus_sdxl_vit-h.safetensors" \
    "https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus_sdxl_vit-h.safetensors"

# 2. CLIP Vision Model (ViT-H)
CLIP_DIR="$COMFY_DIR/models/clip_vision"
echo "Creating directory: $CLIP_DIR"
mkdir -p "$CLIP_DIR"

echo "Downloading CLIP Vision Model..."
curl -L -o "$CLIP_DIR/CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" \
    "https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"

echo "--------------------------------------------------------"
echo "Downloads Complete!"
echo "Please restart ComfyUI to load the new models."
echo "--------------------------------------------------------"
