"use client";

import { useEventsStore } from "@/stores/events-store";
import { useLLMStore } from "@/stores/llm-store";
import { useSunStore } from "@/stores/sun-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, RefreshCw, Activity, HelpCircle, Settings, Sun, Clock } from "lucide-react";

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  onShowHelp?: () => void;
  onShowSettings?: () => void;
}

export function Header({ onRefresh, isLoading, onShowHelp, onShowSettings }: HeaderProps) {
  const { filteredEvents } = useEventsStore();
  const { settings, isConnected } = useLLMStore();
  const { currentBand, countdownString } = useSunStore();

  // Count by priority (mapped from threat levels)
  const priorityCounts = filteredEvents.reduce(
    (acc, event) => {
      // Map threat levels to priority
      const priorityMap: Record<string, string> = {
        critical: "breaking",
        high: "important",
        medium: "notable",
        low: "standard",
        info: "background",
      };
      const priority = priorityMap[event.threatLevel] || "standard";
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Eye className="h-6 w-6" style={{ color: "var(--color-eagle-secondary)" }} />
          <h1 className="text-lg font-bold text-foreground">
            Eagle <span style={{ color: "var(--color-eagle-secondary)" }}>Eye</span>
          </h1>
        </div>
        <Badge variant="outline" className="hidden md:flex">
          <Activity className="mr-1 h-3 w-3" />
          Live
        </Badge>

        {/* Follow the Sun Region Indicator */}
        <div className="hidden items-center gap-1.5 md:flex">
          <Badge variant="secondary" className="flex items-center gap-1.5" title={`Currently fetching news from ${currentBand.displayName}`}>
            <Sun className="h-3 w-3 text-amber-500" />
            <span>{currentBand.displayName}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1" title="Time until next region">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{countdownString}</span>
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 md:flex">
          {priorityCounts.breaking && (
            <Badge variant="critical">{priorityCounts.breaking} Breaking</Badge>
          )}
          {priorityCounts.important && (
            <Badge variant="high">{priorityCounts.important} Important</Badge>
          )}
          <Badge variant="outline">{filteredEvents.length} Stories</Badge>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onShowSettings}
          title={`LLM Settings (${settings.provider}${isConnected ? " - Connected" : ""})`}
          className="relative"
        >
          <Settings className="h-4 w-4" />
          <span
            className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-yellow-500"
            }`}
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onShowHelp}
          title="Show features"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh events"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
    </header>
  );
}
