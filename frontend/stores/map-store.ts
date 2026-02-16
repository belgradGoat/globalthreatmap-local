import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MapViewport, GeoLocation } from "@/types";

interface EntityLocationMarker extends GeoLocation {
  entityName: string;
}

export interface MilitaryBaseMarker {
  country: string;
  baseName: string;
  latitude: number;
  longitude: number;
  type: "usa" | "nato";
}

export type MapStyleId = "satellite" | "light" | "dark" | "streets";

export const MAP_STYLES: Record<MapStyleId, { id: string; name: string; icon: string; description: string }> = {
  satellite: {
    id: "mapbox://styles/mapbox/satellite-streets-v12",
    name: "Satellite",
    icon: "satellite",
    description: "Real Earth imagery with labels"
  },
  light: {
    id: "mapbox://styles/mapbox/light-v11",
    name: "Light",
    icon: "sun",
    description: "Clean, minimal daytime view"
  },
  dark: {
    id: "mapbox://styles/mapbox/dark-v11",
    name: "Dark",
    icon: "moon",
    description: "Easy on the eyes"
  },
  streets: {
    id: "mapbox://styles/mapbox/streets-v12",
    name: "Streets",
    icon: "map",
    description: "Traditional map view"
  }
};

interface MapState {
  viewport: MapViewport;
  mapStyle: MapStyleId;
  showHeatmap: boolean;
  showClusters: boolean;
  showWatchboxes: boolean;
  showMilitaryBases: boolean;
  isDrawingWatchbox: boolean;
  activeWatchboxId: string | null;
  isAutoPlaying: boolean;
  isFollowingSun: boolean;
  entityLocations: EntityLocationMarker[];
  militaryBases: MilitaryBaseMarker[];
  militaryBasesLoading: boolean;

  setViewport: (viewport: Partial<MapViewport>) => void;
  setMapStyle: (style: MapStyleId) => void;
  flyTo: (longitude: number, latitude: number, zoom?: number) => void;
  toggleHeatmap: () => void;
  toggleClusters: () => void;
  toggleWatchboxes: () => void;
  toggleMilitaryBases: () => void;
  startDrawingWatchbox: () => void;
  stopDrawingWatchbox: () => void;
  setActiveWatchbox: (id: string | null) => void;
  startAutoPlay: () => void;
  stopAutoPlay: () => void;
  startFollowSun: () => void;
  stopFollowSun: () => void;
  setEntityLocations: (entityName: string, locations: GeoLocation[]) => void;
  clearEntityLocations: () => void;
  setMilitaryBases: (bases: MilitaryBaseMarker[]) => void;
  setMilitaryBasesLoading: (loading: boolean) => void;
}

const DEFAULT_VIEWPORT: MapViewport = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  bearing: 0,
  pitch: 0,
};

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      viewport: DEFAULT_VIEWPORT,
      mapStyle: "satellite" as MapStyleId, // Default to satellite for Eagle Eye brand
      showHeatmap: false,
      showClusters: true,
      showWatchboxes: true,
      showMilitaryBases: false, // Default off for general news focus
      isDrawingWatchbox: false,
      activeWatchboxId: null,
      isAutoPlaying: false,
      isFollowingSun: false,
      entityLocations: [],
      militaryBases: [],
      militaryBasesLoading: false,

      setViewport: (viewport) =>
        set((state) => ({
          viewport: { ...state.viewport, ...viewport },
        })),

      setMapStyle: (style) => set({ mapStyle: style }),

      flyTo: (longitude, latitude, zoom = 8) =>
        set((state) => ({
          viewport: {
            ...state.viewport,
            longitude,
            latitude,
            zoom,
          },
        })),

      toggleHeatmap: () =>
        set((state) => ({
          showHeatmap: !state.showHeatmap,
        })),

      toggleClusters: () =>
        set((state) => ({
          showClusters: !state.showClusters,
        })),

      toggleWatchboxes: () =>
        set((state) => ({
          showWatchboxes: !state.showWatchboxes,
        })),

      toggleMilitaryBases: () =>
        set((state) => ({
          showMilitaryBases: !state.showMilitaryBases,
        })),

      startDrawingWatchbox: () => set({ isDrawingWatchbox: true }),

      stopDrawingWatchbox: () => set({ isDrawingWatchbox: false }),

      setActiveWatchbox: (id) => set({ activeWatchboxId: id }),

      startAutoPlay: () => set({ isAutoPlaying: true }),

      stopAutoPlay: () => set({ isAutoPlaying: false }),

      startFollowSun: () => set({ isFollowingSun: true }),

      stopFollowSun: () => set({ isFollowingSun: false }),

      setEntityLocations: (entityName, locations) =>
        set({
          entityLocations: locations.map((loc) => ({
            ...loc,
            entityName,
          })),
        }),

      clearEntityLocations: () => set({ entityLocations: [] }),

      setMilitaryBases: (bases) => set({ militaryBases: bases }),

      setMilitaryBasesLoading: (loading) => set({ militaryBasesLoading: loading }),
    }),
    {
      name: "eagle-eye-map-preferences",
      partialize: (state) => ({
        mapStyle: state.mapStyle,
        showMilitaryBases: state.showMilitaryBases,
        showClusters: state.showClusters,
        showHeatmap: state.showHeatmap,
      }),
    }
  )
);
