
import { useState, useCallback, useRef } from 'react';

interface AudioRecorderState {
    isRecording: boolean;
    audioBlob: Blob | null;
    error: string | null;
}

export const useAudioRecorder = () => {
    const [state, setState] = useState<AudioRecorderState>({
        isRecording: false,
        audioBlob: null,
        error: null
    });
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Use webm for broad support
            
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setState(prev => ({ ...prev, isRecording: false, audioBlob: blob }));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setState(prev => ({ ...prev, isRecording: true, error: null }));
        } catch (err: any) {
            setState(prev => ({ ...prev, error: "Microphone access denied or not available." }));
            console.error("Mic Error:", err);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const resetAudio = useCallback(() => {
        setState({ isRecording: false, audioBlob: null, error: null });
        chunksRef.current = [];
    }, []);

    return {
        ...state,
        startRecording,
        stopRecording,
        resetAudio
    };
};
