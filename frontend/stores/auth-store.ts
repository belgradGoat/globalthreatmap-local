/**
 * Simplified auth store for self-hosted mode
 * No authentication required - always returns authenticated state
 */

import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  initialize: () => void;
  getAccessToken: () => null;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  isAuthenticated: true, // Always authenticated in self-hosted mode
  isLoading: false,
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    set({ initialized: true, isLoading: false });
  },

  getAccessToken: () => null, // No token needed in self-hosted mode
}));
