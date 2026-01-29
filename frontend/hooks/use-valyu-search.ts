"use client";

import { useState, useCallback } from "react";
import type { EntityProfile } from "@/types";

export interface Deliverables {
  csv?: { url: string; title: string };
  pptx?: { url: string; title: string };
}

export interface EntitySearchResult {
  entity: EntityProfile;
  deliverables?: Deliverables;
  pdfUrl?: string;
}

interface SearchState {
  isLoading: boolean;
  error: string | null;
}

export function useValyuSearch() {
  const [state, setState] = useState<SearchState>({
    isLoading: false,
    error: null,
  });

  const searchEntity = useCallback(
    async (
      name: string,
      includeDeepResearch = false
    ): Promise<EntitySearchResult | null> => {
      setState({ isLoading: true, error: null });

      try {
        const response = await fetch("/api/entities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, includeDeepResearch }),
        });

        if (!response.ok) {
          throw new Error("Entity search failed");
        }

        const data = await response.json();
        setState({ isLoading: false, error: null });
        return {
          entity: data.entity,
          deliverables: data.deliverables,
          pdfUrl: data.pdfUrl,
        };
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Unknown error occurred";
        setState({ isLoading: false, error });
        return null;
      }
    },
    []
  );

  const generateReport = useCallback(
    async (
      topic: string,
      type?: string
    ): Promise<{ summary: string; sources: { title: string; url: string }[] } | null> => {
      setState({ isLoading: true, error: null });

      try {
        const response = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, type }),
        });

        if (!response.ok) {
          throw new Error("Report generation failed");
        }

        const data = await response.json();
        setState({ isLoading: false, error: null });
        return {
          summary: data.report.summary,
          sources: data.report.sources,
        };
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Unknown error occurred";
        setState({ isLoading: false, error });
        return null;
      }
    },
    []
  );

  return {
    ...state,
    searchEntity,
    generateReport,
  };
}
