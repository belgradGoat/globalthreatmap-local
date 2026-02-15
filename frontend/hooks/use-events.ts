"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEventsStore } from "@/stores/events-store";
import { useSunStore } from "@/stores/sun-store";
import {
  getCurrentNoonBand,
  getMsUntilNextHour,
  getCountriesForFetching,
  getFallbackBands,
} from "@/lib/follow-the-sun";
import type { ThreatEvent } from "@/types";

interface UseEventsOptions {
  autoRefresh?: boolean;
}

// Minimum articles before requesting fallback
const MIN_ARTICLES_THRESHOLD = 5;

export function useEvents(options: UseEventsOptions = {}) {
  const { autoRefresh = true } = options;

  const {
    events,
    filteredEvents,
    isLoading,
    error,
    setEvents,
    setLoading,
    setError,
  } = useEventsStore();

  const {
    currentBand,
    updateCurrentBand,
    setLastRefresh,
    updateCountdown,
  } = useSunStore();

  const hourlyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch events from API using current timezone band
  const fetchEvents = useCallback(async (withFallback: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      // Get countries for the current band
      const band = getCurrentNoonBand();
      const countries = getCountriesForFetching(band, withFallback);

      console.log(`[useEvents] Fetching news for ${band.displayName}:`, countries);

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countries,
          region: band.displayName,
          includeFallback: !withFallback, // Only request fallback info on first try
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch events");
      }

      let newEvents: ThreatEvent[] = data.events || [];

      // If we got too few results and not already using fallback, try with fallback countries
      if (newEvents.length < MIN_ARTICLES_THRESHOLD && !withFallback) {
        console.log(`[useEvents] Only ${newEvents.length} articles, fetching with fallback`);

        // Fetch from fallback bands
        const fallbackBands = getFallbackBands(band);
        const fallbackCountries: string[] = [];

        for (const fb of fallbackBands.slice(0, 2)) {
          for (const country of fb.countries) {
            if (!countries.includes(country) && !fallbackCountries.includes(country)) {
              fallbackCountries.push(country);
            }
          }
        }

        if (fallbackCountries.length > 0) {
          console.log(`[useEvents] Fetching fallback countries:`, fallbackCountries);

          const fallbackResponse = await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              countries: fallbackCountries,
              region: "Nearby Regions",
              includeFallback: false,
            }),
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const fallbackEvents: ThreatEvent[] = fallbackData.events || [];

            // Merge and deduplicate
            const seenIds = new Set(newEvents.map((e) => e.id));
            const seenUrls = new Set(newEvents.map((e) => e.sourceUrl));

            for (const event of fallbackEvents) {
              if (!seenIds.has(event.id) && !seenUrls.has(event.sourceUrl)) {
                newEvents.push(event);
              }
            }

            console.log(`[useEvents] After fallback: ${newEvents.length} total articles`);
          }
        }
      }

      setEvents(newEvents);
      setLastRefresh(new Date());
      updateCurrentBand();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [setEvents, setLoading, setError, setLastRefresh, updateCurrentBand]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Schedule next hourly refresh (aligned to clock)
  const scheduleHourlyRefresh = useCallback(() => {
    if (hourlyTimeoutRef.current) {
      clearTimeout(hourlyTimeoutRef.current);
    }

    const msUntilNext = getMsUntilNextHour();
    console.log(`[useEvents] Next refresh in ${Math.round(msUntilNext / 60000)}m`);

    hourlyTimeoutRef.current = setTimeout(() => {
      console.log("[useEvents] Hourly refresh triggered");
      fetchEvents();
      // Schedule the next one
      scheduleHourlyRefresh();
    }, msUntilNext);
  }, [fetchEvents]);

  // Initial fetch on mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Set up hourly refresh and countdown
  useEffect(() => {
    if (!autoRefresh) {
      if (hourlyTimeoutRef.current) {
        clearTimeout(hourlyTimeoutRef.current);
        hourlyTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    // Schedule next hourly refresh
    scheduleHourlyRefresh();

    // Update countdown every minute
    countdownIntervalRef.current = setInterval(() => {
      updateCountdown();
    }, 60000);

    // Initial countdown update
    updateCountdown();

    return () => {
      if (hourlyTimeoutRef.current) {
        clearTimeout(hourlyTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [autoRefresh, scheduleHourlyRefresh, updateCountdown]);

  return {
    events,
    filteredEvents,
    isLoading,
    error,
    refresh,
    currentBand,
  };
}
