import React from 'react';
import { Network, Activity, RefreshCw, Check, X, AlertTriangle, Mic } from 'lucide-react';
import { useConnections } from '../contexts/ConnectionContext';
import { checkComfyConnection } from '../services/comfyService';
import { checkOllamaConnection } from '../services/ollamaService';

const SystemSettingsPanel: React.FC = () => {
  const { connections, updateConnection } = useConnections();
  const [testStatus, setTestStatus] = React.useState<{ ollama: 'idle' | 'testing' | 'success' | 'error', comfy: 'idle' | 'testing' | 'success' | 'error' }>({ ollama: 'idle', comfy: 'idle' });

  const handleTestConnection = async (type: 'ollama' | 'comfy') => {
      setTestStatus(prev => ({ ...prev, [type]: 'testing' }));
      const host = type === 'ollama' ? connections.ollamaHost : connections.comfyHost;
      
      try {
          const result = type === 'ollama' 
              ? await checkOllamaConnection(host)
              : await checkComfyConnection(host);
          
          setTestStatus(prev => ({ ...prev, [type]: result ? 'success' : 'error' }));
          
          if (result) {
              setTimeout(() => setTestStatus(prev => ({ ...prev, [type]: 'idle' })), 2000);
          }
      } catch (e) {
          setTestStatus(prev => ({ ...prev, [type]: 'error' }));
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-2">
                <Network className="w-3 h-3" /> Network Connections
            </h4>
            
            {testStatus.comfy === 'error' && (
                <div className="bg-amber-900/20 border border-amber-500/30 p-2 rounded text-[10px] text-amber-500 flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <div>
                        <span className="font-bold">Connection Failed?</span> Check CORS.
                        <br/>Run ComfyUI with: <code className="bg-black/50 px-1 rounded text-amber-300">--enable-cors-header *</code>
                        </div>
                </div>
            )}

            {/* Ollama Host */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between">Ollama Host (Analysis)</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={connections.ollamaHost}
                        onChange={(e) => updateConnection('ollamaHost', e.target.value)}
                        className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-slate-300 outline-none focus:border-cyan-500 font-mono transition-colors"
                        placeholder="http://127.0.0.1:11434"
                    />
                    <button 
                        onClick={() => handleTestConnection('ollama')}
                        disabled={testStatus.ollama === 'testing'}
                        className={`px-4 rounded-lg border flex items-center justify-center transition-colors
                            ${testStatus.ollama === 'success' ? 'bg-green-500/20 border-green-500 text-green-500' : 
                                testStatus.ollama === 'error' ? 'bg-red-500/20 border-red-500 text-red-500' : 
                                'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                    >
                        {testStatus.ollama === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin"/> : 
                            testStatus.ollama === 'success' ? <Check className="w-4 h-4"/> :
                            testStatus.ollama === 'error' ? <X className="w-4 h-4"/> :
                            <Activity className="w-4 h-4"/>}
                    </button>
                </div>
            </div>

            {/* Comfy Host */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between">ComfyUI Host (Generation)</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={connections.comfyHost}
                        onChange={(e) => updateConnection('comfyHost', e.target.value)}
                        className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-slate-300 outline-none focus:border-cyan-500 font-mono transition-colors"
                        placeholder="http://127.0.0.1:8188"
                    />
                    <button 
                            onClick={() => handleTestConnection('comfy')}
                            disabled={testStatus.comfy === 'testing'}
                            className={`px-4 rounded-lg border flex items-center justify-center transition-colors
                            ${testStatus.comfy === 'success' ? 'bg-green-500/20 border-green-500 text-green-500' : 
                                testStatus.comfy === 'error' ? 'bg-red-500/20 border-red-500 text-red-500' : 
                                'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                    >
                        {testStatus.comfy === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin"/> : 
                            testStatus.comfy === 'success' ? <Check className="w-4 h-4"/> :
                            testStatus.comfy === 'error' ? <X className="w-4 h-4"/> :
                            <Activity className="w-4 h-4"/>}
                    </button>
                </div>
            </div>
        </div>
            
            {/* Voice Input Section */}
            <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-2">
                    <Mic className="w-3 h-3" /> Voice Input Engine
                </h4>

                <div className="space-y-4">
                    {/* Provider Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Transcription Provider</label>
                         <div className="grid grid-cols-3 gap-2">
                            {(['local', 'groq', 'openai'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => updateConnection('transcriptionProvider', p)}
                                    className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all
                                        ${connections.transcriptionProvider === p 
                                            ? 'bg-purple-900/50 border-purple-500 text-purple-400' 
                                            : 'bg-black/50 border-white/10 text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    {p === 'local' ? 'Browser (Local)' : p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key (Only for Cloud) */}
                    {connections.transcriptionProvider !== 'local' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between">
                                API Key ({connections.transcriptionProvider})
                            </label>
                            <input 
                                type="password" 
                                value={connections.transcriptionKey}
                                onChange={(e) => updateConnection('transcriptionKey', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-slate-300 outline-none focus:border-purple-500 font-mono transition-colors"
                                placeholder={`sk-...`}
                            />
                            <p className="text-[9px] text-slate-600">
                                {connections.transcriptionProvider === 'groq' ? 'Uses Groq `distil-whisper-large-v3-en` (Free Tier).' : 'Uses OpenAI `whisper-1`.'}
                            </p>
                        </div>
                    )}

                     {/* Local Info */}
                     {connections.transcriptionProvider === 'local' && (
                        <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-[10px] text-slate-400">
                            <p>Running <strong>Xenova/distil-whisper-small.en</strong> directly in your browser via WebGPU. Private & Free.</p>
                            <p className="mt-1 text-slate-500 italic">First run will download ~200MB model.</p>
                        </div>
                    )}
                </div>
            </div>


    </div>
  );
};

export default SystemSettingsPanel;
