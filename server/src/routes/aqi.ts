import { Router, Request, Response } from 'express';
import { getAqiCategory, getAqiColor } from '../lib/aqiCalculator';

export const aqiRouter = Router();

const WAQI_BASE_URL = 'https://api.waqi.info';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache as required

// ─── CONFIGURATION CONSTANTS ───
const GRID_LAT_MIN = 6;
const GRID_LAT_MAX = 37;
const GRID_LNG_MIN = 68;
const GRID_LNG_MAX = 97;
const GRID_STEP = 0.5;
const SEARCH_RADIUS_KM = 200;
const IDW_POWER = 2;
const MIN_DISTANCE_KM = 10;

// ─── WAQI TypeScript Interfaces ───
export interface WaqiSearchResponse {
  status: string;
  data: {
    uid: number;
    aqi: string | number;
    time: {
      tz: string;
      stime: string;
      vtime: number;
    };
    station: {
      name: string;
      geo: number[];
      url: string;
      country: string;
    };
  }[];
}

export interface WaqiResponse {
  status: string;
  data: {
    aqi: number | string;
    idx: number;
    city: {
      geo: number[];
      name: string;
    };
    dominentpol?: string;
    iaqi?: {
      co?: { v: number };
      no2?: { v: number };
      o3?: { v: number };
      pm10?: { v: number };
      pm25?: { v: number };
      so2?: { v: number };
    };
    time?: {
      iso: string;
    };
  };
}

export interface CityAqiResponseItem {
  id: number;
  name: string;
  lat: number;
  lng: number;
  aqi: number | null;
  category: string;
  color: string;
  dominantPollutant: string | null;
  time: string | null;
  source: 'real' | 'estimated';
  pollutants: {
    pm25: number | null;
    pm10: number | null;
    no2: number | null;
    so2: number | null;
    co: number | null;
    o3: number | null;
  };
}

export interface InterpolationResponse {
  realStations: CityAqiResponseItem[];
  estimatedStations: CityAqiResponseItem[];
}

// ─── Cache State ───
let cachedData: InterpolationResponse | null = null;
let lastCacheTimestamp = 0;

const INDIAN_CITIES = [
  "Delhi", "Mumbai", "Ahmedabad", "Rajkot", "Pune",
  "Nagpur", "Nashik", "Bengaluru", "Mysuru", "Chennai", "Coimbatore",
  "Hyderabad", "Visakhapatnam", "Vijayawada", "Kolkata", "Durgapur",
  "Siliguri", "Jaipur", "Jodhpur", "Udaipur", "Lucknow", "Kanpur",
  "Varanasi", "Prayagraj", "Agra", "Noida", "Ghaziabad", "Gurugram",
  "Chandigarh", "Amritsar", "Ludhiana", "Patiala", "Bhopal", "Indore",
  "Gwalior", "Raipur", "Bhubaneswar", "Cuttack", "Ranchi", "Jamshedpur",
  "Patna", "Guwahati", "Shillong", "Kochi", "Thiruvananthapuram",
  "Kozhikode", "Goa", "Jammu", "Srinagar", "Dehradun", "Shimla",
];

// ─── HELPER FUNCTIONS ───

/**
 * Calculates the great-circle distance between two points on the Earth's surface using the Haversine formula.
 */
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const INDIA_POLYGON = [
  [68.1, 23.6], [74.0, 15.0], [77.0, 8.0], [80.0, 13.0],
  [85.0, 20.0], [88.0, 21.5], [93.0, 22.0], [97.0, 28.0],
  [93.0, 29.5], [88.0, 27.5], [85.0, 27.0], [80.0, 31.0],
  [77.0, 35.0], [74.0, 34.0], [74.0, 30.0], [70.0, 24.0]
];

function pointInPolygon(point: number[], vs: number[][]) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Fetches real AQI stations and computes interpolated points for a comprehensive grid.
 */
async function fetchAndInterpolateData(): Promise<InterpolationResponse> {
  const now = Date.now();

  if (cachedData && now - lastCacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  const token = process.env.WAQI_API_TOKEN || process.env.OPENAQ_API_TOKEN;
  if (!token) {
    throw new Error('WAQI API token is not configured on server');
  }

  // ---------------------------------------------------------
  // STEP 1: FETCH REAL STATIONS
  // ---------------------------------------------------------
  const uniqueUids = new Set<number>();
  const searchChunkSize = 50; // Increased for speed

  for (let i = 0; i < INDIAN_CITIES.length; i += searchChunkSize) {
    const chunk = INDIAN_CITIES.slice(i, i + searchChunkSize);

    await Promise.allSettled(
      chunk.map(async (city) => {
        try {
          const response = await fetch(`${WAQI_BASE_URL}/search/?keyword=${encodeURIComponent(city)}&token=${token}`);
          if (!response.ok) return;

          const json = await response.json() as WaqiSearchResponse;
          if (json.status === 'ok' && Array.isArray(json.data)) {
            for (const item of json.data) {
              if (item.uid) uniqueUids.add(item.uid);
            }
          }
        } catch (err) {
          console.warn(`[WAQI Search] Failed to search for city ${city}:`, err);
        }
      })
    );
  }

  const uids = Array.from(uniqueUids);
  const feedChunkSize = 100; // Increased for speed
  const realStations: CityAqiResponseItem[] = [];

  for (let i = 0; i < uids.length; i += feedChunkSize) {
    const chunk = uids.slice(i, i + feedChunkSize);

    const chunkResults = await Promise.allSettled(
      chunk.map(async (uid) => {
        const response = await fetch(`${WAQI_BASE_URL}/feed/@${uid}/?token=${token}`);
        if (!response.ok) throw new Error(`WAQI API error for UID ${uid}: ${response.statusText}`);

        const json = await response.json() as WaqiResponse;
        if (json.status !== 'ok' || !json.data) {
          throw new Error(`WAQI returned error for UID ${uid}`);
        }

        const data = json.data;
        const aqiValue = Number(data.aqi);

        if (isNaN(aqiValue)) {
          throw new Error(`Invalid AQI value for UID ${uid}`);
        }

        return {
          id: data.idx || uid,
          name: data.city?.name || `Station ${uid}`,
          lat: data.city?.geo?.[0] || 0,
          lng: data.city?.geo?.[1] || 0,
          aqi: aqiValue,
          category: getAqiCategory(aqiValue),
          color: getAqiColor(aqiValue),
          dominantPollutant: data.dominentpol ? data.dominentpol.toUpperCase() : null,
          time: data.time?.iso || new Date().toISOString(),
          source: 'real',
          pollutants: {
            pm25: data.iaqi?.pm25?.v ?? null,
            pm10: data.iaqi?.pm10?.v ?? null,
            no2: data.iaqi?.no2?.v ?? null,
            so2: data.iaqi?.so2?.v ?? null,
            co: data.iaqi?.co?.v ?? null,
            o3: data.iaqi?.o3?.v ?? null,
          },
        } as CityAqiResponseItem;
      })
    );

    for (const res of chunkResults) {
      if (res.status === 'fulfilled' && res.value.lat !== 0 && res.value.lng !== 0) {
        realStations.push(res.value);
      }
    }
  }

  // ---------------------------------------------------------
  // STEP 2: GENERATE ESTIMATED AQI POINTS (SPATIAL INTERPOLATION)
  // ---------------------------------------------------------
  const estimatedStations: CityAqiResponseItem[] = [];
  let estimatedIdCounter = 9000000; // distinct high ID range for estimated markers

  for (let lat = GRID_LAT_MIN; lat <= GRID_LAT_MAX; lat += GRID_STEP) {
    for (let lng = GRID_LNG_MIN; lng <= GRID_LNG_MAX; lng += GRID_STEP) {

      // Restrict to India borders
      if (!pointInPolygon([lng, lat], INDIA_POLYGON)) {
        continue;
      }

      // Calculate distances to all real stations
      const nearbyStations: { station: CityAqiResponseItem; distance: number }[] = [];
      let isTooClose = false;

      for (const real of realStations) {
        if (real.aqi === null) continue;

        const distance = getDistanceKm(lat, lng, real.lat, real.lng);

        // Edge Case: Very close to a real station
        if (distance < MIN_DISTANCE_KM) {
          isTooClose = true;
          break;
        }

        if (distance <= SEARCH_RADIUS_KM) {
          nearbyStations.push({ station: real, distance });
        }
      }

      if (isTooClose || nearbyStations.length === 0) {
        continue; // Skip generating point here
      }

      let estimatedAqi = 0;

      // Edge Case: Exactly 1 nearby station
      if (nearbyStations.length === 1) {
        estimatedAqi = nearbyStations[0].station.aqi!;
      } else {
        // Inverse Distance Weighting (IDW)
        let numerator = 0;
        let denominator = 0;

        for (const { station, distance } of nearbyStations) {
          // Add a small epsilon to distance to prevent division by zero, though already guarded by MIN_DISTANCE_KM
          const weight = 1 / (Math.pow(distance, IDW_POWER) + 1);
          numerator += weight * station.aqi!;
          denominator += weight;
        }

        estimatedAqi = Math.round(numerator / denominator);
      }

      // Clamp between 0 and 500
      estimatedAqi = Math.max(0, Math.min(500, estimatedAqi));

      estimatedStations.push({
        id: estimatedIdCounter++,
        name: `Estimated Area (${lat.toFixed(1)}°, ${lng.toFixed(1)}°)`,
        lat: lat,
        lng: lng,
        aqi: estimatedAqi,
        category: getAqiCategory(estimatedAqi),
        color: getAqiColor(estimatedAqi),
        dominantPollutant: null,
        time: new Date().toISOString(),
        source: 'estimated',
        pollutants: {
          pm25: null,
          pm10: null,
          no2: null,
          so2: null,
          co: null,
          o3: null,
        },
      });
    }
  }

  const result = { realStations, estimatedStations };
  cachedData = result;
  lastCacheTimestamp = now;

  return result;
}

// ─── GET /api/aqi/cities ───
aqiRouter.get('/cities', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await fetchAndInterpolateData();
    res.json(result);
  } catch (err: any) {
    console.error('[AQI Service Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch AQI data' });
  }
});

// ─── GET /api/aqi/city/:name ───
aqiRouter.get('/city/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const searchName = (req.params.name as string).toLowerCase().trim();
    const result = await fetchAndInterpolateData();

    // Search across both real and estimated stations
    const matched = [...result.realStations, ...result.estimatedStations].find(
      (c) => c.name.toLowerCase().includes(searchName)
    );

    if (matched) {
      res.json(matched);
    } else {
      res.status(404).json({ error: `Station or area matching "${req.params.name}" not found` });
    }
  } catch (err: any) {
    console.error('[AQI City Fetch Error]:', err);
    res.status(500).json({ error: 'Failed to fetch city AQI data' });
  }
});
