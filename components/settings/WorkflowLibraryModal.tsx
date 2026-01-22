import React, { useState, useEffect } from 'react';
import { Search, Trash2, Download, AlertCircle, Loader2, X, FileJson, Calendar, Code, Copy, Check, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

interface SavedWorkflow {
    id: number | string;
    name: string;
    description: string;
    workflow: Record<string, any>;
    createdAt: string;
}

interface WorkflowLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoad: (workflow: SavedWorkflow) => void;
    onImport?: (json: any, name: string) => void;
}

const WorkflowLibraryModal: React.FC<WorkflowLibraryModalProps> = ({ isOpen, onClose, onLoad, onImport }) => {
    const { token } = useAuth();
    const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<number | string | null>(null);
    const [viewingWorkflow, setViewingWorkflow] = useState<SavedWorkflow | null>(null);
    const [copied, setCopied] = useState(false);
    
    const [isImporting, setIsImporting] = useState(false);
    const [importText, setImportText] = useState('');

    // Fetch workflows
    useEffect(() => {
        if (isOpen) {
            fetchWorkflows();
        }
    }, [isOpen]);

    const fetchWorkflows = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/workflows', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Fetch failed (${res.status}): ${txt}`);
            }
            const data = await res.json();
            setWorkflows(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Could not load workflows. Check connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number | string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this workflow preset?')) return;

        setDeletingId(id);
        try {
            const res = await fetch(`/api/workflows/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete');
            setWorkflows(prev => prev.filter(w => w.id !== id));
        } catch (err) {
            alert('Failed to delete workflow');
        } finally {
            setDeletingId(null);
        }
    };

    const handleImport = () => {
        try {
            const json = JSON.parse(importText);
            if (onImport) {
                onImport(json, 'Imported ' + new Date().toLocaleTimeString());
                setIsImporting(false);
                setImportText('');
                onClose();
            }
        } catch (e) {
            alert('Invalid JSON format');
        }
    };
    const handleDownload = (workflow: SavedWorkflow) => {
        const blob = new Blob([JSON.stringify(workflow.workflow, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${workflow.name.replace(/\s+/g, '_')}_workflow.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopyJson = () => {
        if (!viewingWorkflow) return;
        navigator.clipboard.writeText(JSON.stringify(viewingWorkflow.workflow, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const filteredWorkflows = workflows.filter(w => 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        w.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-app/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative w-full max-w-2xl bg-surface border-subtle rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-card border-b border-subtle">
                            <div>
                                <h3 className="font-bold text-main flex items-center gap-2">
                                    <FileJson className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    Workflow Library
                                </h3>
                                <p className="text-xs text-dim mt-1">Manage your saved generation presets</p>
                            </div>
                            <button onClick={onClose} className="text-dim hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Bar & Actions */}
                        <div className="p-4 border-b border-subtle bg-surface flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-dim" />
                                <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search library..."
                                    className="w-full bg-app border border-subtle rounded-lg pl-9 pr-4 py-2 text-sm text-main outline-none focus:border-cyan-500/50 transition-colors"
                                />
                            </div>
                            <button 
                                onClick={() => setIsImporting(!isImporting)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all ${isImporting ? 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-card text-dim border-subtle hover:text-main'}`}
                            >
                                <Upload className="w-4 h-4" /> {isImporting ? 'CLOSE' : 'IMPORT'}
                            </button>
                        </div>

                        {/* Import Area */}
                        {isImporting && (
                            <div className="p-4 bg-card border-b border-subtle animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-black uppercase text-accent mb-2 block tracking-widest">Paste Workflow JSON</label>
                                <textarea 
                                    value={importText}
                                    onChange={e => setImportText(e.target.value)}
                                    placeholder="Paste ComfyUI API JSON here..."
                                    className="w-full h-32 bg-app border border-subtle rounded-lg p-3 font-mono text-[10px] text-main outline-none focus:border-accent transition-colors mb-3"
                                />
                                <button 
                                    onClick={handleImport}
                                    disabled={!importText.trim()}
                                    className="w-full py-2 bg-accent text-black font-black text-[10px] uppercase rounded border border-transparent hover:bg-accent/90 transition-all disabled:opacity-30 tracking-widest"
                                >
                                    LOAD INTO SYSTEM
                                </button>
                            </div>
                        )}

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-card border-b border-subtle">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-500">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span className="text-xs uppercase font-bold">Loading Library...</span>
                                </div>
                            ) : error ? (
                                <div className="text-center p-8 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-500/20">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-sm font-bold">{error}</p>
                                </div>
                            ) : filteredWorkflows.length === 0 ? (
                                <div className="text-center p-12 text-dim italic">
                                    {searchQuery ? 'No matching workflows found.' : 'No saved workflows yet. Create one from the Generator!'}
                                </div>
                            ) : (
                                filteredWorkflows.map(workflow => (
                                    <div 
                                        key={workflow.id} 
                                        className="bg-surface border-subtle rounded-lg p-4 hover:border-purple-500/50 transition-colors group relative"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-main text-sm">{workflow.name}</h4>
                                                <p className="text-xs text-dim mt-1 line-clamp-2">{workflow.description || "No description provided."}</p>
                                                <div className="flex items-center gap-2 mt-3 text-[10px] text-dim font-mono">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(workflow.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => setViewingWorkflow(workflow)}
                                                    className="p-1.5 text-dim hover:text-cyan-500 transition-colors"
                                                    title="View JSON"
                                                >
                                                    <Code className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownload(workflow)}
                                                    className="p-1.5 text-dim hover:text-green-500 transition-colors"
                                                    title="Download JSON"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => onLoad(workflow)}
                                                    className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
                                                >
                                                     Load
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDelete(workflow.id, e)}
                                                    disabled={deletingId === workflow.id}
                                                    className="p-1.5 text-dim hover:text-red-500 transition-colors disabled:opacity-50"
                                                    title="Delete Workflow"
                                                >
                                                    {deletingId === workflow.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* JSON Viewer Overlay */}
            <AnimatePresence>
                {viewingWorkflow && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-black/90 backdrop-blur-md"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="w-full max-w-4xl bg-surface border border-subtle-accent rounded-2xl flex flex-col max-h-full shadow-3xl"
                        >
                            <div className="p-6 border-b border-subtle flex items-center justify-between">
                                <div>
                                    <h4 className="text-main font-bold flex items-center gap-2">
                                        <Code className="w-4 h-4 text-cyan-400" />
                                        Workflow JSON: {viewingWorkflow.name}
                                    </h4>
                                    <p className="text-xs text-dim mt-1">Raw ComfyUI API configuration</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={handleCopyJson}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-main rounded-lg transition-all"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-cyan-500" />}
                                        {copied ? 'COPIED!' : 'COPY JSON'}
                                    </button>
                                    <button 
                                        onClick={() => setViewingWorkflow(null)}
                                        className="p-2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden p-6">
                                <div className="h-full bg-app border border-subtle p-4 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed text-cyan-50/70 opacity-80">
                                    <pre>{JSON.stringify(viewingWorkflow.workflow, null, 2)}</pre>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
};

export default WorkflowLibraryModal;
