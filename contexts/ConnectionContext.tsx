import React, { createContext, useContext, useState, useEffect } from 'react';

interface ConnectionSettings {
    ollamaHost: string;
    comfyHost: string;
    backendUrl: string;
    transcriptionProvider: 'local' | 'groq' | 'openai' | 'custom';
    transcriptionKey: string;
    transcriptionUrl: string;
    transcriptionModel: string;
}

interface ConnectionContextType {
    connections: ConnectionSettings;
    updateConnection: (key: keyof ConnectionSettings, value: string) => void;
    resetToDefaults: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

const DEFAULT_SETTINGS: ConnectionSettings = {
    ollamaHost: import.meta.env.VITE_OLLAMA_API_HOST || 'http://127.0.0.1:11434',
    comfyHost: import.meta.env.VITE_COMFY_API_HOST || 'http://127.0.0.1:8188',
    // In dev, usually localhost:3001, but we can allow override
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
    transcriptionProvider: import.meta.env.VITE_GROQ_API_KEY ? 'groq' : 'local',
    transcriptionKey: import.meta.env.VITE_GROQ_API_KEY || '',
    transcriptionUrl: 'https://api.openai.com/v1/audio/transcriptions',
    transcriptionModel: 'whisper-1' 
};

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [connections, setConnections] = useState<ConnectionSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('animated_dreams_connections');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Smart Hydration: If Environment has a key but Storage is empty/missing, use Environment
                if (import.meta.env.VITE_GROQ_API_KEY && !parsed.transcriptionKey) {
                     parsed.transcriptionKey = import.meta.env.VITE_GROQ_API_KEY;
                     // Also force provider if we found a key
                     if (parsed.transcriptionProvider === 'local') {
                         parsed.transcriptionProvider = 'groq'; 
                     }
                }
                setConnections(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse stored connections", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const updateConnection = (key: keyof ConnectionSettings, value: string) => {
        setConnections(prev => {
            const next = { ...prev, [key]: value };
            localStorage.setItem('animated_dreams_connections', JSON.stringify(next));
            return next;
        });
    };

    const resetToDefaults = () => {
        setConnections(DEFAULT_SETTINGS);
        localStorage.removeItem('animated_dreams_connections');
    };

    if (!isLoaded) return null; // Prevent hydration mismatch or flash of wrong config

    return (
        <ConnectionContext.Provider value={{ connections, updateConnection, resetToDefaults }}>
            {children}
        </ConnectionContext.Provider>
    );
};

export const useConnections = () => {
    const context = useContext(ConnectionContext);
    if (!context) {
        throw new Error("useConnections must be used within a ConnectionProvider");
    }
    return context;
};
