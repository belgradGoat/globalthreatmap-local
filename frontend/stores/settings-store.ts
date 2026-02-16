import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserSettings {
  // News preferences
  showSecurityNews: boolean;
  defaultNewsCategories: string[];

  // Research preferences
  includeSecurityAnalysisByDefault: boolean;

  // Display preferences
  compactFeedView: boolean;

  // Translation preferences
  enableTranslation: boolean;
}

interface SettingsState extends UserSettings {
  // Actions
  setShowSecurityNews: (show: boolean) => void;
  setDefaultNewsCategories: (categories: string[]) => void;
  setIncludeSecurityAnalysisByDefault: (include: boolean) => void;
  setCompactFeedView: (compact: boolean) => void;
  setEnableTranslation: (enable: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  showSecurityNews: false,
  defaultNewsCategories: ["politics", "economy", "technology", "environment", "health", "world"],
  includeSecurityAnalysisByDefault: false,
  compactFeedView: false,
  enableTranslation: true, // Enable translation by default
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setShowSecurityNews: (show) => set({ showSecurityNews: show }),

      setDefaultNewsCategories: (categories) =>
        set({ defaultNewsCategories: categories }),

      setIncludeSecurityAnalysisByDefault: (include) =>
        set({ includeSecurityAnalysisByDefault: include }),

      setCompactFeedView: (compact) => set({ compactFeedView: compact }),

      setEnableTranslation: (enable) => set({ enableTranslation: enable }),

      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "eagle-eye-settings",
    }
  )
);
