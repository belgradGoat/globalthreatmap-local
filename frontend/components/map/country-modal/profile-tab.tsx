"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building,
  Users,
  MapPin,
  Globe,
  Languages,
  Coins,
  Clock,
  Flag,
} from "lucide-react";

interface CountryProfile {
  name: string;
  officialName: string;
  capital: string;
  population: number;
  populationFormatted: string;
  area: number;
  areaFormatted: string;
  region: string;
  subregion: string;
  languages: string[];
  currencies: { code: string; name: string; symbol: string }[];
  flag: string;
  coatOfArms: string;
  borders: string[];
  timezones: string[];
  summary: string;
}

interface ProfileTabProps {
  country: string;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-24 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | string[];
}) {
  const displayValue = Array.isArray(value) ? value.join(", ") : value;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-1 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground">{displayValue || "N/A"}</p>
    </div>
  );
}

export function ProfileTab({ country }: ProfileTabProps) {
  const [profile, setProfile] = useState<CountryProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!country) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/countries/${encodeURIComponent(country)}/profile`
        );

        if (!response.ok) throw new Error("Failed to fetch profile");

        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError("Failed to load country profile");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [country]);

  if (isLoading) {
    return (
      <ScrollArea className="h-full min-h-0 pr-2">
        <ProfileSkeleton />
      </ScrollArea>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">{error || "Profile not found"}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 pr-2">
      <div className="space-y-6">
        {/* Header with Flag */}
        <div className="flex items-center gap-4">
          {profile.flag && (
            <img
              src={profile.flag}
              alt={`${profile.name} flag`}
              className="h-16 w-auto rounded border border-border shadow-sm"
            />
          )}
          <div>
            <h3 className="text-xl font-bold text-foreground">{profile.name}</h3>
            {profile.officialName !== profile.name && (
              <p className="text-sm text-muted-foreground">{profile.officialName}</p>
            )}
          </div>
        </div>

        {/* Quick Facts Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard icon={Building} label="Capital" value={profile.capital} />
          <InfoCard icon={Users} label="Population" value={profile.populationFormatted} />
          <InfoCard icon={MapPin} label="Area" value={profile.areaFormatted} />
          <InfoCard icon={Globe} label="Region" value={`${profile.subregion || profile.region}`} />
          <InfoCard icon={Languages} label="Languages" value={profile.languages.slice(0, 3)} />
          <InfoCard
            icon={Coins}
            label="Currency"
            value={profile.currencies.map((c) => `${c.name} (${c.symbol})`)}
          />
          <InfoCard
            icon={Clock}
            label="Timezone"
            value={profile.timezones.length > 2
              ? `${profile.timezones[0]} (+${profile.timezones.length - 1} more)`
              : profile.timezones
            }
          />
          {profile.borders.length > 0 && (
            <InfoCard
              icon={Flag}
              label="Borders"
              value={`${profile.borders.length} countries`}
            />
          )}
        </div>

        {/* Wikipedia Summary */}
        {profile.summary && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="mb-2 text-sm font-medium text-foreground">About</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {profile.summary}
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
