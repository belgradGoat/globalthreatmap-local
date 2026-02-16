"use client";

import { useEffect, useRef, useState } from "react";
import { useMapStore } from "@/stores/map-store";
import { Sun, SunDim } from "lucide-react";

// Sun moves 360° in 24 hours = 15° per hour = 0.25° per minute
const DEGREES_PER_HOUR = 15;

/**
 * Calculate the precise longitude where it's currently 12:00 (noon)
 * At 12:00 UTC, noon is at longitude 0°
 * At 13:00 UTC, noon is at longitude -15° (sun moved west)
 * At 11:00 UTC, noon is at longitude +15° (noon is east)
 */
function getPreciseNoonLongitude(): number {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();

  // Convert to decimal hours
  const decimalHours = utcHours + utcMinutes / 60 + utcSeconds / 3600;

  // Calculate longitude where it's noon
  // When it's 12:00 UTC, noon longitude is 0°
  // Formula: noonLongitude = (12 - decimalHours) * 15
  let noonLongitude = (12 - decimalHours) * DEGREES_PER_HOUR;

  // Normalize to -180 to 180 range
  if (noonLongitude > 180) noonLongitude -= 360;
  if (noonLongitude < -180) noonLongitude += 360;

  return noonLongitude;
}

/**
 * Get a human-readable description of the current noon region
 */
function getNoonRegionName(longitude: number): string {
  // Approximate regions based on longitude
  if (longitude >= 150 || longitude < -165) return "Pacific Islands";
  if (longitude >= 120 && longitude < 150) return "Australia/East Asia";
  if (longitude >= 100 && longitude < 120) return "Southeast Asia";
  if (longitude >= 70 && longitude < 100) return "South Asia";
  if (longitude >= 40 && longitude < 70) return "Middle East";
  if (longitude >= 15 && longitude < 40) return "Eastern Europe/Africa";
  if (longitude >= -15 && longitude < 15) return "Western Europe/Africa";
  if (longitude >= -45 && longitude < -15) return "Atlantic";
  if (longitude >= -75 && longitude < -45) return "South America";
  if (longitude >= -105 && longitude < -75) return "Americas East";
  if (longitude >= -135 && longitude < -105) return "Americas West";
  return "Pacific";
}

export function TimelineScrubber() {
  const { isFollowingSun, startFollowSun, stopFollowSun, setViewport, viewport } =
    useMapStore();
  const animationRef = useRef<number | null>(null);
  const [noonLongitude, setNoonLongitude] = useState(getPreciseNoonLongitude);

  const handleFollowToggle = () => {
    if (isFollowingSun) {
      stopFollowSun();
    } else {
      // Center on current noon position and start following
      const currentNoonLon = getPreciseNoonLongitude();
      setViewport({
        longitude: currentNoonLon,
        latitude: viewport.latitude,
      });
      startFollowSun();
    }
  };

  // Continuously update map position to follow the sun
  useEffect(() => {
    if (!isFollowingSun) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let lastUpdate = Date.now();

    const animate = () => {
      const now = Date.now();
      // Update every ~100ms for smooth animation without excessive renders
      if (now - lastUpdate >= 100) {
        const currentNoonLon = getPreciseNoonLongitude();
        setNoonLongitude(currentNoonLon);
        setViewport({
          longitude: currentNoonLon,
        });
        lastUpdate = now;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isFollowingSun, setViewport]);

  // Update displayed longitude even when not following (for tooltip)
  useEffect(() => {
    if (isFollowingSun) return; // Already updating via animation loop

    const interval = setInterval(() => {
      setNoonLongitude(getPreciseNoonLongitude());
    }, 1000);

    return () => clearInterval(interval);
  }, [isFollowingSun]);

  const regionName = getNoonRegionName(noonLongitude);

  return (
    <div className="absolute bottom-6 left-6 z-10">
      <button
        onClick={handleFollowToggle}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          isFollowingSun
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-card/95 text-foreground hover:bg-card border border-border"
        } backdrop-blur-sm`}
        title={
          isFollowingSun
            ? `Following the sun over ${regionName}`
            : `Follow the Sun (currently over ${regionName})`
        }
      >
        {isFollowingSun ? (
          <Sun className="h-5 w-5 animate-pulse" />
        ) : (
          <SunDim className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
