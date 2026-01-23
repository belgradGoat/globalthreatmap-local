"use client";

import { useState } from "react";
import { useValyuSearch } from "@/hooks/use-valyu-search";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Building2,
  User,
  Globe,
  Users,
  FileText,
  MapPin,
  Navigation,
  Lock,
} from "lucide-react";
import { Favicon } from "@/components/ui/favicon";
import { useMapStore } from "@/stores/map-store";
import { useAuthStore } from "@/stores/auth-store";
import { Markdown } from "@/components/ui/markdown";
import { SignInModal } from "@/components/auth/sign-in-modal";
import type { EntityProfile } from "@/types";

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";

const typeIcons = {
  organization: Building2,
  person: User,
  country: Globe,
  group: Users,
};

export function EntitySearch() {
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState<EntityProfile | null>(null);
  const [showDeepResearch, setShowDeepResearch] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { isLoading, error, searchEntity } = useValyuSearch();
  const { flyTo, setEntityLocations, clearEntityLocations } = useMapStore();
  const { isAuthenticated } = useAuthStore();

  // Check if auth is required (valyu mode)
  const requiresAuth = APP_MODE === "valyu";

  const handleSearch = async () => {
    if (!query.trim()) return;

    // In valyu mode, require authentication for entity search
    if (requiresAuth && !isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    clearEntityLocations();
    const result = await searchEntity(query, showDeepResearch);
    if (result) {
      setEntity(result);
      // Set entity locations on the map
      if (result.locations && result.locations.length > 0) {
        setEntityLocations(result.name, result.locations);
      }
    }
  };

  const handleShowOnMap = () => {
    if (entity?.locations && entity.locations.length > 0) {
      setEntityLocations(entity.name, entity.locations);
      // Fly to the first location
      const firstLocation = entity.locations[0];
      flyTo(firstLocation.longitude, firstLocation.latitude, 4);
    }
  };

  const handleFlyToLocation = (longitude: number, latitude: number) => {
    flyTo(longitude, latitude, 8);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const TypeIcon = entity ? typeIcons[entity.type] : Building2;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">Build Dossier</h2>
        <p className="text-sm text-muted-foreground">
          Compile intel on any actor - mapped locations, relationships, and sourced analysis
        </p>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="e.g. Wagner Group, Hezbollah, North Korea..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showDeepResearch}
            onChange={(e) => setShowDeepResearch(e.target.checked)}
            className="rounded border-border"
          />
          Full dossier with deep research
        </label>

        {isLoading && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-center gap-2 text-foreground font-medium mb-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              {showDeepResearch ? "Compiling full dossier..." : "Building profile..."}
            </div>
            <p className="text-muted-foreground text-xs">
              {showDeepResearch
                ? "5-10 minutes. Comprehensive ~50 page report with sourced analysis, network mapping, and recent activity."
                : "~15 seconds. Quick profile with key intel and locations."}
            </p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {entity && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <TypeIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{entity.name}</CardTitle>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {entity.type}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {entity.description && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-foreground">
                    Overview
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    <Markdown content={entity.description} />
                  </div>
                </div>
              )}

              {entity.researchSummary && (
                <div>
                  <h4 className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4" />
                    Deep Research
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    <Markdown content={entity.researchSummary} />
                  </div>
                </div>
              )}

              {entity.locations && entity.locations.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <MapPin className="h-4 w-4" />
                      Locations ({entity.locations.length})
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowOnMap}
                      className="h-7 text-xs"
                    >
                      <Navigation className="mr-1 h-3 w-3" />
                      Show All on Map
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {entity.locations.map((location, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          handleFlyToLocation(location.longitude, location.latitude)
                        }
                        className="flex w-full items-center gap-2 rounded-lg bg-muted/50 p-2 text-left text-sm hover:bg-muted transition-colors"
                      >
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <span className="flex-1 truncate">
                          {location.placeName || location.country || "Unknown"}
                        </span>
                        {location.country && location.placeName !== location.country && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {location.country}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {entity.relatedEntities && entity.relatedEntities.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-foreground">
                    Related Entities
                  </h4>
                  <div className="space-y-2">
                    {entity.relatedEntities.map((related, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm"
                      >
                        <span className="font-medium">{related.name}</span>
                        <Badge variant="secondary">{related.relationship}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entity.economicData &&
                Object.keys(entity.economicData).length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-foreground">
                      Data Sources
                    </h4>
                    <div className="space-y-1">
                      {(
                        entity.economicData.sources as
                          | { title: string; url: string }[]
                          | undefined
                      )?.map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                        >
                          <Favicon url={source.url} size={16} />
                          <span className="truncate">{source.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {!entity && !isLoading && !error && (
          <div className="py-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Enter any actor to compile a dossier
            </p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground/70">
              <p>Wagner Group, Houthis, Hezbollah, North Korea</p>
              <p>Nations, militias, PMCs, cartels, political figures</p>
            </div>
            {requiresAuth && !isAuthenticated && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Lock className="h-4 w-4" />
                <span>Sign in required</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <SignInModal open={showSignInModal} onOpenChange={setShowSignInModal} />
    </div>
  );
}
