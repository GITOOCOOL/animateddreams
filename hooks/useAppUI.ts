import { useState, useEffect } from 'react';

export type ArchitectureViewMode = 'client' | 'server' | 'ai';

export function useAppUI() {
  // Dialogs & Panels
  const [showLogin, setShowLogin] = useState(false);
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false);
  const [isAnalysisSettingsOpen, setIsAnalysisSettingsOpen] = useState(false);
  const [isGenerationSettingsOpen, setIsGenerationSettingsOpen] = useState(false);
  const [isVideoSettingsOpen, setIsVideoSettingsOpen] = useState(false);
  const [isDictationSettingsOpen, setIsDictationSettingsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  // Dev & Visuals
  const [showDevTools, setShowDevTools] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);
  const [showArchitectureView, setShowArchitectureView] = useState(false);
  const [architectureViewMode, setArchitectureViewMode] = useState<ArchitectureViewMode>('client');

  // Architecture Viewer Global Toggler
  useEffect(() => {
    (window as any).toggleArchitectureView = (mode: ArchitectureViewMode = 'client') => {
        setArchitectureViewMode(mode);
        setShowArchitectureView(true);
    };
  }, []);

  return {
    showLogin, setShowLogin,
    isSystemSettingsOpen, setIsSystemSettingsOpen,
    isAnalysisSettingsOpen, setIsAnalysisSettingsOpen,
    isGenerationSettingsOpen, setIsGenerationSettingsOpen,
    isVideoSettingsOpen, setIsVideoSettingsOpen,
    isDictationSettingsOpen, setIsDictationSettingsOpen,
    isGalleryOpen, setIsGalleryOpen,
    showDevTools, setShowDevTools,
    showLogs, setShowLogs,
    showVisualizationModal, setShowVisualizationModal,
    showArchitectureView, setShowArchitectureView,
    architectureViewMode, setArchitectureViewMode
  };
}
