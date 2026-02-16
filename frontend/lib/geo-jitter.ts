import type { ThreatEvent, GeoLocation } from "@/types";

/**
 * Generates a location key by rounding coordinates to ~1km precision.
 * Events within ~1km of each other will share the same key.
 */
function getLocationKey(loc: GeoLocation): string {
  // Round to 2 decimal places (~1.1km precision at equator)
  const latKey = Math.round(loc.latitude * 100) / 100;
  const lngKey = Math.round(loc.longitude * 100) / 100;
  return `${latKey},${lngKey}`;
}

/**
 * Calculate jittered display coordinates for all events.
 * Events sharing the same approximate location are spread in a circle
 * around the city center so they don't stack invisibly on top of each other.
 *
 * @param events - Array of threat events to process
 * @returns Map of event ID to display location (jittered if needed)
 */
export function calculateDisplayLocations(
  events: ThreatEvent[]
): Map<string, GeoLocation> {
  const displayLocations = new Map<string, GeoLocation>();

  // Group events by their rounded location
  const groups = new Map<string, ThreatEvent[]>();
  for (const event of events) {
    const key = getLocationKey(event.location);
    const group = groups.get(key) || [];
    group.push(event);
    groups.set(key, group);
  }

  // Apply circular jitter to overlapping events
  for (const [, group] of groups) {
    if (group.length === 1) {
      // Single event at this location - no jitter needed
      displayLocations.set(group[0].id, group[0].location);
    } else {
      // Multiple events - spread them in a circle around the center
      // Radius of ~1.5km offset - visible at city level zoom
      const radius = 0.015;

      for (let i = 0; i < group.length; i++) {
        const event = group[i];
        const angle = (i / group.length) * 2 * Math.PI;

        displayLocations.set(event.id, {
          ...event.location,
          latitude: event.location.latitude + radius * Math.sin(angle),
          longitude: event.location.longitude + radius * Math.cos(angle),
        });
      }
    }
  }

  return displayLocations;
}
