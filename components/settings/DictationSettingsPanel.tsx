import React from 'react';
import { Mic } from 'lucide-react';
import { useConnections } from '../../contexts/ConnectionContext';

const DictationSettingsPanel: React.FC = () => {
    const { connections, updateConnection } = useConnections();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Voice Input Section */}
            <div className="space-y-4">
               
                <div className="space-y-4">
                    {/* Provider Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-dim">Transcription Provider</label>
                            <div className="grid grid-cols-4 gap-2">
                            {(['local', 'groq', 'openai', 'custom'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => updateConnection('transcriptionProvider', p)}
                                    className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all
                                        ${connections.transcriptionProvider === p 
                                            ? 'bg-purple-900/50 border-purple-500 text-purple-400' 
                                            : 'bg-card border-subtle text-dim hover:text-main hover:bg-hover'}`}
                                >
                                    {p === 'local' ? 'WebGPU' : p === 'custom' ? 'Local URL' : p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key (Only for Cloud) */}
                    {(connections.transcriptionProvider === 'groq' || connections.transcriptionProvider === 'openai') && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] uppercase font-bold text-dim flex justify-between">
                                API Key ({connections.transcriptionProvider})
                            </label>
                            <input 
                                type="password" 
                                value={connections.transcriptionKey}
                                onChange={(e) => updateConnection('transcriptionKey', e.target.value)}
                                className="w-full bg-app border border-subtle rounded-lg p-3 text-xs text-main outline-none focus:border-purple-500 font-mono transition-colors"
                                placeholder={`sk-...`}
                            />
                            <p className="text-[9px] text-dim">
                                {connections.transcriptionProvider === 'groq' ? 'Uses Groq `distil-whisper-large-v3-en` (Free Tier).' : 'Uses OpenAI `whisper-1`.'}
                            </p>
                        </div>
                    )}

                    {/* Custom URL Input */}
                    {connections.transcriptionProvider === 'custom' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] uppercase font-bold text-dim flex justify-between">
                                Custom Whisper URL
                            </label>
                            <input 
                                type="text" 
                                value={connections.transcriptionUrl}
                                onChange={(e) => updateConnection('transcriptionUrl', e.target.value)}
                                className="w-full bg-app border border-subtle rounded-lg p-3 text-xs text-main outline-none focus:border-purple-500 font-mono transition-colors"
                                placeholder="http://localhost:9000/v1/audio/transcriptions"
                            />
                            <p className="text-[9px] text-dim">
                                Ensure your local Whisper server is running and accessible. URL must end with <code>/v1/audio/transcriptions</code>.
                            </p>
                        </div>
                    )}

                        {/* Local Info */}
                        {connections.transcriptionProvider === 'local' && (
                        <div className="bg-card border border-subtle p-3 rounded-lg text-[10px] text-slate-400">
                            <p>Running <strong>Xenova/distil-whisper-small.en</strong> directly in your browser via WebGPU. Private & Free.</p>
                            <p className="mt-1 text-dim italic">First run will download ~200MB model.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DictationSettingsPanel;
