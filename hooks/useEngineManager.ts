import { useEngineContext } from '../contexts/EngineContext';

// Re-export types for compatibility
export type { EngineConfig, EngineStatus } from '../contexts/EngineContext';

/**
 * Hook to access the global Engine Manager state.
 * This now wraps the EngineContext to ensure a single source of truth across the app.
 */
export const useEngineManager = () => {
  return useEngineContext();
};

