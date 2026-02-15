"use client";

import { useMapStore, MAP_STYLES, type MapStyleId } from "@/stores/map-store";
import { Satellite, Sun, Moon, Map } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  satellite: Satellite,
  sun: Sun,
  moon: Moon,
  map: Map,
};

export function MapStyleSelector() {
  const { mapStyle, setMapStyle } = useMapStore();

  const styles = Object.entries(MAP_STYLES) as [MapStyleId, typeof MAP_STYLES[MapStyleId]][];

  return (
    <div className="absolute bottom-20 right-6 z-10">
      <div className="flex flex-col gap-2 rounded-lg bg-card/95 p-2 shadow-lg backdrop-blur-sm border border-border">
        {styles.map(([styleId, style]) => {
          const Icon = iconMap[style.icon as keyof typeof iconMap];
          const isActive = mapStyle === styleId;

          return (
            <button
              key={styleId}
              onClick={() => setMapStyle(styleId)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md transition-all duration-200",
                isActive
                  ? "bg-[var(--color-eagle-primary)] text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={`${style.name}: ${style.description}`}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
