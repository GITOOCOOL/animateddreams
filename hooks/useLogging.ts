import { useState, useCallback } from 'react';

export function useLogging() {
  const [logs, setLogs] = useState<string[]>([]);
  const [ollamaLogs, setOllamaLogs] = useState<string[]>([]);
  const [comfyLogs, setComfyLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]); // Keep last 50
  }, []);

  const addOllamaLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setOllamaLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  }, []);

  const addComfyLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setComfyLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  }, []);

  return {
    logs,
    ollamaLogs,
    comfyLogs,
    addLog,
    addOllamaLog,
    addComfyLog
  };
}
