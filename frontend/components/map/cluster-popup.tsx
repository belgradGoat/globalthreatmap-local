"use client";

import type { ThreatEvent } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { MapPin, X } from "lucide-react";

interface ClusterPopupProps {
  events: ThreatEvent[];
  onEventClick: (event: ThreatEvent) => void;
  onClose: () => void;
}

export function ClusterPopup({ events, onEventClick, onClose }: ClusterPopupProps) {
  return (
    <div className="min-w-[280px] max-w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
        <h3 className="text-sm font-semibold text-foreground">
          {events.length} events in this area
        </h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable event list */}
      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onEventClick(event)}
            className="w-full text-left p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-xs font-medium text-foreground line-clamp-2 flex-1">
                {event.title}
              </h4>
              <Badge
                variant={event.threatLevel}
                className="shrink-0 text-[10px] px-1.5 py-0 capitalize"
              >
                {event.threatLevel}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" />
                <span className="truncate max-w-[120px]">
                  {event.location.placeName || event.location.country || "Unknown"}
                </span>
              </div>
              <span>{formatRelativeTime(event.timestamp)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Click an event to view details
        </p>
      </div>
    </div>
  );
}
