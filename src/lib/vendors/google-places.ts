/**
 * Google Places API integration for vendor discovery.
 *
 * Flow:
 *   1. Geocode zip code → lat/lng
 *   2. Nearby Search for funeral-related business types
 *   3. Place Details for phone, website, etc.
 */

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";

// Search categories mapped to Google Places text queries
const SEARCH_QUERIES = [
  { query: "funeral home", category: "funeral_home" },
  { query: "cremation service", category: "cremation" },
  { query: "cemetery", category: "cemetery" },
  { query: "funeral florist", category: "florist" },
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DiscoveredVendor {
  googlePlaceId: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  description: string | null;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  city: string;
  state: string;
}

// ─── Geocoding ──────────────────────────────────────────────────────────────

export async function geocodeZipCode(zipCode: string): Promise<GeocodeResult> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipCode)}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.results?.[0]) {
    throw new Error(`Geocoding failed for zip code "${zipCode}": ${data.status}`);
  }

  const result = data.results[0];
  const location = result.geometry.location;

  // Extract city and state from address components
  let city = "";
  let state = "";
  for (const component of result.address_components) {
    if (component.types.includes("locality")) {
      city = component.long_name;
    }
    if (component.types.includes("administrative_area_level_1")) {
      state = component.short_name;
    }
  }

  return { lat: location.lat, lng: location.lng, city, state };
}

// ─── Nearby Search (Text Search) ────────────────────────────────────────────

interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  geometry: { location: { lat: number; lng: number } };
}

async function searchNearby(
  lat: number,
  lng: number,
  query: string,
  radiusMeters: number = 40000 // ~25 miles
): Promise<PlaceSearchResult[]> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=${radiusMeters}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(`[GooglePlaces] Text search failed: ${data.status}`, data.error_message);
    return [];
  }

  return data.results ?? [];
}

// ─── Place Details ──────────────────────────────────────────────────────────

interface PlaceDetails {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string; // Google Maps URL
  editorial_summary?: { overview: string };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const fields = "formatted_phone_number,international_phone_number,website,url,editorial_summary,address_components";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    console.error(`[GooglePlaces] Details failed for ${placeId}: ${data.status}`);
    return null;
  }

  return data.result ?? null;
}

// ─── Extract city/state from address components ─────────────────────────────

function extractCityState(
  addressComponents?: PlaceDetails["address_components"],
  formattedAddress?: string
): { city: string; state: string } {
  let city = "";
  let state = "";

  if (addressComponents) {
    for (const c of addressComponents) {
      if (c.types.includes("locality")) city = c.long_name;
      if (c.types.includes("administrative_area_level_1")) state = c.short_name;
    }
  }

  // Fallback: parse from formatted address (e.g., "123 Main St, Phoenix, AZ 85001")
  if ((!city || !state) && formattedAddress) {
    const parts = formattedAddress.split(",").map((p) => p.trim());
    if (parts.length >= 3) {
      city = city || parts[parts.length - 3];
      const stateZip = parts[parts.length - 2];
      state = state || stateZip.split(" ")[0];
    }
  }

  return { city: city || "Unknown", state: state || "Unknown" };
}

// ─── Main Discovery Function ────────────────────────────────────────────────

export async function discoverVendorsByZipCode(
  zipCode: string
): Promise<{ vendors: DiscoveredVendor[]; geocode: GeocodeResult }> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }

  // Step 1: Geocode the zip code
  const geocode = await geocodeZipCode(zipCode);

  // Step 2: Search for each category
  const seenPlaceIds = new Set<string>();
  const allVendors: DiscoveredVendor[] = [];

  for (const { query, category } of SEARCH_QUERIES) {
    const results = await searchNearby(geocode.lat, geocode.lng, query);

    // Take top 5 per category to keep API calls reasonable
    const top = results.slice(0, 5);

    for (const place of top) {
      if (seenPlaceIds.has(place.place_id)) continue;
      seenPlaceIds.add(place.place_id);

      // Step 3: Get details for phone/website
      const details = await getPlaceDetails(place.place_id);
      const { city, state } = extractCityState(
        details?.address_components,
        place.formatted_address
      );

      allVendors.push({
        googlePlaceId: place.place_id,
        name: place.name,
        category,
        address: place.formatted_address,
        city,
        state,
        phone: details?.formatted_phone_number ?? null,
        email: null, // Google Places doesn't provide email
        website: details?.website ?? null,
        rating: place.rating ?? null,
        description: details?.editorial_summary?.overview ?? null,
      });
    }
  }

  return { vendors: allVendors, geocode };
}
