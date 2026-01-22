import React, { useState } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SaveWorkflowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, description: string, isUpdate: boolean) => Promise<void>;
    initialData?: { name?: string; description?: string };
    allowUpdate?: boolean;
}

const SaveWorkflowModal: React.FC<SaveWorkflowModalProps> = ({ isOpen, onClose, onSave, initialData, allowUpdate }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setName(initialData?.name || '');
            setDescription(initialData?.description || '');
        }
    }, [isOpen, initialData]);

    const handleAction = async (isUpdate: boolean) => {
        if (!name.trim()) {
            setError('Workflow name is required');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            await onSave(name, description, isUpdate);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save workflow. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

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
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative w-full max-w-md bg-surface border border-subtle rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                            <h3 className="font-bold text-main flex items-center gap-2">
                                <Save className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                {allowUpdate ? 'Update Workflow' : 'Save Workflow'}
                            </h3>
                            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-dim">Workflow Name</label>
                                <input 
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., My Crystal City Style"
                                    className="w-full bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded-lg p-3 text-sm text-main outline-none focus:border-cyan-500 transition-colors"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-dim">Description (Optional)</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add notes about this workflow..."
                                    className="w-full h-24 bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded-lg p-3 text-sm text-main outline-none focus:border-cyan-500 transition-colors resize-none"
                                />
                            </div>

                            {error && (
                                <p className="text-xs text-red-500 font-bold bg-red-100 dark:bg-red-900/20 p-2 rounded border border-red-500/20">
                                    {error}
                                </p>
                            )}

                            <div className="flex justify-end pt-4 gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mr-2"
                                >
                                    Cancel
                                </button>

                                {allowUpdate && (
                                    <button
                                        type="button"
                                        onClick={() => handleAction(true)}
                                        disabled={isSaving || !name.trim()}
                                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Update Active
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => handleAction(false)}
                                    disabled={isSaving || !name.trim()}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${allowUpdate ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                                >
                                    {(!allowUpdate && isSaving) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {allowUpdate ? 'Save as New' : 'Save Selection'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SaveWorkflowModal;
