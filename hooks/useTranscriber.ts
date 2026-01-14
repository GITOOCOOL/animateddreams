
import { useEffect, useState, useCallback, useRef } from 'react';

export interface TranscriberState {
    isBusy: boolean;
    isModelLoading: boolean;
    progress: number; // 0-100
    text: string;
    error: string | null;
}

export function useTranscriber() {
    const [state, setState] = useState<TranscriberState>({
        isBusy: false,
        isModelLoading: false,
        progress: 0,
        text: '',
        error: null
    });

    const worker = useRef<Worker | null>(null);

    useEffect(() => {
        if (!worker.current) {
            // Point to the source file so Vite bundles it
            worker.current = new Worker(new URL('../workers/whisper.worker.js', import.meta.url), {
                type: 'module'
            });

            worker.current.onerror = (err) => {
                console.error("[useTranscriber] Worker Error:", err);
                setState(prev => ({ ...prev, isBusy: false, error: "Worker crashed. Check console." }));
            };

            worker.current.addEventListener('message', (event) => {
                const { status, data } = event.data;
                console.log(`[useTranscriber] Worker Message: ${status}`, data);

                switch (status) {
                    case 'loading':
                        setState(prev => ({ 
                            ...prev, 
                            isModelLoading: true, 
                            progress: data?.progress || 0 
                        }));
                        break;
                    case 'ready':
                        setState(prev => ({ 
                            ...prev, 
                            isModelLoading: false, 
                            progress: 100, 
                            isBusy: false 
                        }));
                        break;
                    case 'complete':
                        setState(prev => ({ 
                            ...prev, 
                            isBusy: false, 
                            text: typeof data === 'string' ? data : data.text 
                        }));
                        break;
                    case 'error':
                        setState(prev => ({ 
                            ...prev, 
                            isBusy: false, 
                            error: data 
                        }));
                        break;
                }
            });
            
            // Initiate load
            worker.current.postMessage({ type: 'load' });
        }

        return () => {
            if(worker.current) {
                worker.current.terminate();
                worker.current = null;
            }
        };
    }, []);

    const transcribe = useCallback((audioBlob: Blob) => {
        if (!worker.current) return;

        setState(prev => ({ ...prev, isBusy: true, error: null, text: '' }));
        
        // Convert Blob to Float32Array
        const fileReader = new FileReader();
        fileReader.onloadend = async () => {
            const arrayBuffer = fileReader.result as ArrayBuffer;
            const audioCTX = new AudioContext({ sampleRate: 16000 });
            const audioBuffer = await audioCTX.decodeAudioData(arrayBuffer);
            const audioData = audioBuffer.getChannelData(0);
            
            worker.current?.postMessage({
                type: 'transcribe',
                audio: audioData
            });
        };
        fileReader.readAsArrayBuffer(audioBlob);
    }, []);

    return {
        ...state,
        transcribe
    };
}
