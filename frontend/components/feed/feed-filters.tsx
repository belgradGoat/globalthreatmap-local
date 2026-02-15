"use client";

import { useState } from "react";
import { useEventsStore } from "@/stores/events-store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  Building2,
  TrendingUp,
  Cpu,
  Leaf,
  Heart,
  Shield,
  Target,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventCategory } from "@/types";
import { eventToNewsCategory, newsCategoryConfig, type NewsCategory } from "@/types";

// News categories with their mapped event categories
const NEWS_CATEGORIES: { id: NewsCategory; eventCategories: EventCategory[] }[] = [
  { id: "politics", eventCategories: ["diplomatic", "protest", "politics"] },
  { id: "economy", eventCategories: ["economic", "commodities"] },
  { id: "technology", eventCategories: ["cyber"] },
  { id: "environment", eventCategories: ["environmental", "disaster"] },
  { id: "health", eventCategories: ["health"] },
  { id: "world", eventCategories: ["infrastructure"] },
];

// Security categories (shown only when security toggle is on)
const SECURITY_CATEGORIES: { id: NewsCategory; eventCategories: EventCategory[] }[] = [
  { id: "security", eventCategories: ["conflict", "terrorism", "crime", "piracy"] },
  { id: "military", eventCategories: ["military"] },
];

const categoryIconMap: Record<NewsCategory, typeof Building2> = {
  politics: Building2,
  economy: TrendingUp,
  technology: Cpu,
  culture: Building2,
  sports: Building2,
  environment: Leaf,
  health: Heart,
  science: Building2,
  security: Shield,
  military: Target,
  world: Globe,
};

const categoryColorMap: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30",
  green: "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30",
  emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30",
  slate: "bg-slate-500/20 text-slate-400 border-slate-500/30 hover:bg-slate-500/30",
  gray: "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30",
  cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30",
};

export function FeedFilters() {
  const {
    searchQuery,
    categoryFilters,
    setSearchQuery,
    setCategoryFilters,
    clearFilters,
  } = useEventsStore();

  const [showSecurityCategories, setShowSecurityCategories] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasFilters = searchQuery || categoryFilters.length > 0;

  const toggleNewsCategory = (eventCategories: EventCategory[]) => {
    // Check if any of these event categories are already selected
    const isActive = eventCategories.some((ec) => categoryFilters.includes(ec));

    if (isActive) {
      // Remove all event categories for this news category
      const eventCatStrings = eventCategories as string[];
      setCategoryFilters(categoryFilters.filter((c) => !eventCatStrings.includes(c)));
    } else {
      // Add all event categories for this news category
      setCategoryFilters([...categoryFilters, ...eventCategories]);
    }
  };

  const allCategories = showSecurityCategories
    ? [...NEWS_CATEGORIES, ...SECURITY_CATEGORIES]
    : NEWS_CATEGORIES;

  return (
    <div className="border-b border-border p-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search news..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Categories</p>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                Less <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                More <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(isExpanded ? allCategories : allCategories.slice(0, 4)).map(({ id, eventCategories }) => {
            const config = newsCategoryConfig[id];
            const Icon = categoryIconMap[id];
            const isActive = eventCategories.some((ec) => categoryFilters.includes(ec));

            return (
              <button
                key={id}
                onClick={() => toggleNewsCategory(eventCategories)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                  isActive
                    ? categoryColorMap[config.color]
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                )}
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Security Toggle */}
      {isExpanded && (
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showSecurityCategories}
              onChange={(e) => setShowSecurityCategories(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border accent-[var(--color-eagle-secondary)]"
            />
            <Shield className="h-3 w-3" />
            Include security & military news
          </label>
        </div>
      )}

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full text-muted-foreground"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
