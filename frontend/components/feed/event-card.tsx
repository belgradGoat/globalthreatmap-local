"use client";

import { memo, useCallback, useState } from "react";
import type { ThreatEvent } from "@/types";
import { eventToNewsCategory, newsCategoryConfig, threatToPriority, priorityConfig } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime, cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import {
  MapPin,
  Clock,
  Building2,
  TrendingUp,
  Cpu,
  Palette,
  Trophy,
  Leaf,
  Heart,
  FlaskConical,
  Shield,
  Target,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import type { NewsCategory } from "@/types";

const newsCategoryIconMap: Record<NewsCategory, typeof Building2> = {
  politics: Building2,
  economy: TrendingUp,
  technology: Cpu,
  culture: Palette,
  sports: Trophy,
  environment: Leaf,
  health: Heart,
  science: FlaskConical,
  security: Shield,
  military: Target,
  world: Globe,
};

const categoryColorMap: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  indigo: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  slate: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  gray: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const priorityColorMap: Record<string, string> = {
  red: "bg-red-500 text-white",
  orange: "bg-orange-500 text-white",
  amber: "bg-amber-500 text-black",
  blue: "bg-blue-500/20 text-blue-400",
  slate: "bg-slate-500/20 text-slate-400",
};

interface EventCardProps {
  event: ThreatEvent;
  style?: React.CSSProperties;
}

export const EventCard = memo(function EventCard({
  event,
  style,
}: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Map to news category (fallback to "world" for unknown categories)
  const newsCategory = eventToNewsCategory[event.category] || "world";
  const categoryConfig = newsCategoryConfig[newsCategory] || newsCategoryConfig.world;
  const CategoryIcon = newsCategoryIconMap[newsCategory] || Globe;

  // Map to priority level (fallback to "background" for unknown levels)
  const priority = threatToPriority[event.threatLevel] || "background";
  const prioConfig = priorityConfig[priority] || priorityConfig.background;

  const handleClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleSourceClick = useCallback((e: React.MouseEvent) => {
    if (event.sourceUrl) {
      e.stopPropagation();
      window.open(event.sourceUrl, "_blank", "noopener,noreferrer");
    }
  }, [event.sourceUrl]);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:bg-accent/50 event-card-enter",
        isExpanded && "ring-2 ring-[var(--color-eagle-secondary)] bg-accent/30"
      )}
      style={style}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
              categoryColorMap[categoryConfig.color]
            )}
          >
            <CategoryIcon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Header with priority badge */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                {event.title}
              </h3>
              {(priority === "breaking" || priority === "important") && (
                <Badge
                  className={cn(
                    "shrink-0 text-[10px] font-semibold uppercase tracking-wide",
                    priorityColorMap[prioConfig.color]
                  )}
                >
                  {prioConfig.label}
                </Badge>
              )}
            </div>

            {/* Summary - only show first line */}
            {event.summary && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {event.summary.replace(/[#*_`]/g, '').substring(0, 150)}
              </p>
            )}

            {/* Meta info */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {/* Category badge */}
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-medium border",
                  categoryColorMap[categoryConfig.color]
                )}
              >
                <CategoryIcon className="mr-1 h-3 w-3" />
                {categoryConfig.label}
              </Badge>

              {/* Location */}
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {event.location.country || event.location.placeName || "Unknown"}
              </span>

              {/* Time */}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(event.timestamp)}
              </span>
            </div>

            {/* Source link */}
            {event.source && (
              <div className="mt-2 flex items-center gap-1">
                <span
                  className={cn(
                    "text-xs text-muted-foreground",
                    event.sourceUrl && "hover:text-foreground cursor-pointer hover:underline"
                  )}
                  onClick={event.sourceUrl ? handleSourceClick : undefined}
                >
                  {event.source}
                </span>
                {event.sourceUrl && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            )}

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="max-h-[300px] overflow-y-auto rounded-md bg-muted/30 p-3">
                  <div className="prose prose-sm prose-invert max-w-none text-xs">
                    <Streamdown>{event.rawContent || event.summary}</Streamdown>
                  </div>
                </div>

                {event.sourceUrl && (
                  <a
                    href={event.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Read full article <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {event.keywords && event.keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {event.keywords.slice(0, 5).map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="text-[10px]">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Expand/collapse indicator */}
            <div className="mt-2 flex justify-center">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
