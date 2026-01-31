import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LLMProvider = "lmstudio" | "ollama" | "openai-compatible" | "openai";

export interface LLMSettings {
  provider: LLMProvider;
  serverUrl: string;
  model: string;
  apiKey: string; // For OpenAI cloud
}

interface LLMState {
  settings: LLMSettings;
  isConnected: boolean;
  lastError: string | null;
  setSettings: (settings: Partial<LLMSettings>) => void;
  setConnectionStatus: (connected: boolean, error?: string) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: LLMSettings = {
  provider: "lmstudio",
  serverUrl: "http://localhost:1234/v1",
  model: "",
  apiKey: "",
};

// Provider default URLs
export const PROVIDER_DEFAULTS: Record<LLMProvider, { url: string; port: number }> = {
  lmstudio: { url: "http://localhost:1234/v1", port: 1234 },
  ollama: { url: "http://localhost:11434", port: 11434 },
  "openai-compatible": { url: "http://localhost:8080/v1", port: 8080 },
  openai: { url: "https://api.openai.com/v1", port: 443 },
};

export const useLLMStore = create<LLMState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      isConnected: false,
      lastError: null,

      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
          // Reset connection status when settings change
          isConnected: false,
          lastError: null,
        })),

      setConnectionStatus: (connected, error) =>
        set({
          isConnected: connected,
          lastError: error || null,
        }),

      resetToDefaults: () =>
        set({
          settings: DEFAULT_SETTINGS,
          isConnected: false,
          lastError: null,
        }),
    }),
    {
      name: "globalthreatmap-llm-settings",
    }
  )
);
