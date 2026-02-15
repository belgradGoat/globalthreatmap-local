/**
 * Country Profile API
 * Fetches country information from Wikipedia and REST Countries API
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
  government: string;
  leader: string;
  gdp: string;
  gdpPerCapita: string;
  summary: string;
}

async function fetchRestCountries(country: string): Promise<Partial<CountryProfile> | null> {
  try {
    const response = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fullText=true`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      // Try partial match
      const partialResponse = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!partialResponse.ok) return null;
      const partialData = await partialResponse.json();
      if (!partialData.length) return null;
      return parseRestCountryData(partialData[0]);
    }

    const data = await response.json();
    if (!data.length) return null;

    return parseRestCountryData(data[0]);
  } catch {
    return null;
  }
}

function parseRestCountryData(data: any): Partial<CountryProfile> {
  const population = data.population || 0;
  const area = data.area || 0;

  return {
    name: data.name?.common || "",
    officialName: data.name?.official || "",
    capital: data.capital?.[0] || "N/A",
    population,
    populationFormatted: formatNumber(population),
    area,
    areaFormatted: `${formatNumber(area)} km²`,
    region: data.region || "",
    subregion: data.subregion || "",
    languages: data.languages ? Object.values(data.languages) : [],
    currencies: data.currencies
      ? Object.entries(data.currencies).map(([code, curr]: [string, any]) => ({
          code,
          name: curr.name,
          symbol: curr.symbol,
        }))
      : [],
    flag: data.flags?.svg || data.flags?.png || "",
    coatOfArms: data.coatOfArms?.svg || data.coatOfArms?.png || "",
    borders: data.borders || [],
    timezones: data.timezones || [],
  };
}

async function fetchWikipediaSummary(country: string): Promise<string> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(country)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return "";

    const data = await response.json();
    return data.extract || "";
  } catch {
    return "";
  }
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)} billion`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)} million`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}k`;
  }
  return num.toString();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ country: string }> }
) {
  try {
    const { country } = await params;
    const decodedCountry = decodeURIComponent(country);

    // Fetch data from both sources in parallel
    const [restData, summary] = await Promise.all([
      fetchRestCountries(decodedCountry),
      fetchWikipediaSummary(decodedCountry),
    ]);

    if (!restData) {
      return NextResponse.json(
        { error: "Country not found" },
        { status: 404 }
      );
    }

    const profile: CountryProfile = {
      name: restData.name || decodedCountry,
      officialName: restData.officialName || decodedCountry,
      capital: restData.capital || "N/A",
      population: restData.population || 0,
      populationFormatted: restData.populationFormatted || "N/A",
      area: restData.area || 0,
      areaFormatted: restData.areaFormatted || "N/A",
      region: restData.region || "",
      subregion: restData.subregion || "",
      languages: restData.languages || [],
      currencies: restData.currencies || [],
      flag: restData.flag || "",
      coatOfArms: restData.coatOfArms || "",
      borders: restData.borders || [],
      timezones: restData.timezones || [],
      government: "", // Would need additional data source
      leader: "", // Would need additional data source
      gdp: "", // Would need additional data source
      gdpPerCapita: "", // Would need additional data source
      summary,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching country profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch country profile" },
      { status: 500 }
    );
  }
}
