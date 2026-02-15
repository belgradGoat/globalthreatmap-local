"use client";

import { create } from "zustand";
import {
  TimezoneBand,
  getCurrentNoonBand,
  getMsUntilNextHour,
  getCountdownString,
} from "@/lib/follow-the-sun";

interface SunState {
  currentBand: TimezoneBand;
  lastRefresh: Date | null;
  nextRefresh: Date | null;
  countdownMs: number;
  countdownString: string;

  // Actions
  updateCurrentBand: () => void;
  setLastRefresh: (date: Date) => void;
  updateCountdown: () => void;
}

export const useSunStore = create<SunState>((set, get) => ({
  currentBand: getCurrentNoonBand(),
  lastRefresh: null,
  nextRefresh: null,
  countdownMs: getMsUntilNextHour(),
  countdownString: getCountdownString(getMsUntilNextHour()),

  updateCurrentBand: () => {
    const newBand = getCurrentNoonBand();
    const msUntilNext = getMsUntilNextHour();
    const nextRefresh = new Date(Date.now() + msUntilNext);

    set({
      currentBand: newBand,
      nextRefresh,
      countdownMs: msUntilNext,
      countdownString: getCountdownString(msUntilNext),
    });
  },

  setLastRefresh: (date: Date) => {
    set({ lastRefresh: date });
  },

  updateCountdown: () => {
    const msUntilNext = getMsUntilNextHour();
    set({
      countdownMs: msUntilNext,
      countdownString: getCountdownString(msUntilNext),
    });
  },
}));
