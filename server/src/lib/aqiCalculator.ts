/**
 * AQI Calculator module for computing sub-indices, overall AQI,
 * category, color, and dominant pollutant following official CPCB (India) standards.
 */

export interface PollutantValues {
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  so2?: number | null;
  co?: number | null;
  o3?: number | null;
  [key: string]: number | null | undefined;
}

export interface AqiResult {
  aqi: number | null;
  category: string;
  color: string;
  dominantPollutant: string | null;
  subIndices: Record<string, number>;
}

interface Breakpoint {
  clo: number;
  chi: number;
  ilo: number;
  ihi: number;
}

// CPCB (India) Breakpoints for key pollutants
const BREAKPOINTS: Record<string, Breakpoint[]> = {
  pm25: [
    { clo: 0, chi: 30, ilo: 0, ihi: 50 },
    { clo: 30.1, chi: 60, ilo: 51, ihi: 100 },
    { clo: 60.1, chi: 90, ilo: 101, ihi: 200 },
    { clo: 90.1, chi: 120, ilo: 201, ihi: 300 },
    { clo: 120.1, chi: 250, ilo: 301, ihi: 400 },
    { clo: 250.1, chi: 1000, ilo: 401, ihi: 500 },
  ],
  pm10: [
    { clo: 0, chi: 50, ilo: 0, ihi: 50 },
    { clo: 50.1, chi: 100, ilo: 51, ihi: 100 },
    { clo: 100.1, chi: 250, ilo: 101, ihi: 200 },
    { clo: 250.1, chi: 350, ilo: 201, ihi: 300 },
    { clo: 350.1, chi: 430, ilo: 301, ihi: 400 },
    { clo: 430.1, chi: 2000, ilo: 401, ihi: 500 },
  ],
  no2: [
    { clo: 0, chi: 40, ilo: 0, ihi: 50 },
    { clo: 40.1, chi: 80, ilo: 51, ihi: 100 },
    { clo: 80.1, chi: 180, ilo: 101, ihi: 200 },
    { clo: 180.1, chi: 280, ilo: 201, ihi: 300 },
    { clo: 280.1, chi: 400, ilo: 301, ihi: 400 },
    { clo: 400.1, chi: 2000, ilo: 401, ihi: 500 },
  ],
  so2: [
    { clo: 0, chi: 40, ilo: 0, ihi: 50 },
    { clo: 40.1, chi: 80, ilo: 51, ihi: 100 },
    { clo: 80.1, chi: 380, ilo: 101, ihi: 200 },
    { clo: 380.1, chi: 800, ilo: 201, ihi: 300 },
    { clo: 800.1, chi: 1600, ilo: 301, ihi: 400 },
    { clo: 1600.1, chi: 5000, ilo: 401, ihi: 500 },
  ],
  co: [
    { clo: 0, chi: 1.0, ilo: 0, ihi: 50 },
    { clo: 1.01, chi: 2.0, ilo: 51, ihi: 100 },
    { clo: 2.01, chi: 10.0, ilo: 101, ihi: 200 },
    { clo: 10.01, chi: 17.0, ilo: 201, ihi: 300 },
    { clo: 17.01, chi: 34.0, ilo: 301, ihi: 400 },
    { clo: 34.01, chi: 100.0, ilo: 401, ihi: 500 },
  ],
  o3: [
    { clo: 0, chi: 50, ilo: 0, ihi: 50 },
    { clo: 50.1, chi: 100, ilo: 51, ihi: 100 },
    { clo: 100.1, chi: 168, ilo: 101, ihi: 200 },
    { clo: 168.1, chi: 208, ilo: 201, ihi: 300 },
    { clo: 208.1, chi: 748, ilo: 301, ihi: 400 },
    { clo: 748.1, chi: 2000, ilo: 401, ihi: 500 },
  ],
};

/**
 * Calculates sub-index for a specific pollutant concentration
 */
export function calculateSubIndex(pollutant: string, concentration: number | string | null | undefined): number | null {
  if (concentration === null || concentration === undefined) return null;
  const val = Number(concentration);
  if (val < 0 || isNaN(val)) return null;
  
  const key = pollutant.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bpList = BREAKPOINTS[key];
  if (!bpList) return null;

  for (const bp of bpList) {
    if (val >= bp.clo && val <= bp.chi) {
      const index = ((bp.ihi - bp.ilo) / (bp.chi - bp.clo)) * (val - bp.clo) + bp.ilo;
      return Math.round(index);
    }
  }

  // Handle concentration above maximum breakpoint range
  const lastBp = bpList[bpList.length - 1];
  if (val > lastBp.chi) {
    return Math.min(500, Math.round(((lastBp.ihi - lastBp.ilo) / (lastBp.chi - lastBp.clo)) * (val - lastBp.clo) + lastBp.ilo));
  }

  return null;
}

/**
 * Calculates overall AQI and dominant pollutant from available measurements
 */
export function calculateOverallAqi(pollutants: PollutantValues): AqiResult {
  const subIndices: Record<string, number> = {};
  let maxAqi: number | null = null;
  let dominantPollutant: string | null = null;

  const validPollutantKeys = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];

  for (const key of validPollutantKeys) {
    const val = pollutants[key];
    if (val !== undefined && val !== null) {
      const subIndex = calculateSubIndex(key, val);
      if (subIndex !== null) {
        subIndices[key] = subIndex;
        if (maxAqi === null || subIndex > maxAqi) {
          maxAqi = subIndex;
          dominantPollutant = key;
        }
      }
    }
  }

  const category = getAqiCategory(maxAqi);
  const color = getAqiColor(maxAqi);

  return {
    aqi: maxAqi,
    category,
    color,
    dominantPollutant,
    subIndices,
  };
}

export function getAqiCategory(aqi: number | null): string {
  if (aqi === null || aqi === undefined) return 'Unknown';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function getAqiColor(aqi: number | null): string {
  if (aqi === null || aqi === undefined) return '#9E9E9E'; // Grey for unknown
  if (aqi <= 50) return '#00B050'; // Green
  if (aqi <= 100) return '#92D050'; // Light Green
  if (aqi <= 200) return '#FFFF00'; // Yellow
  if (aqi <= 300) return '#FF9900'; // Orange
  if (aqi <= 400) return '#FF0000'; // Red
  return '#C00000'; // Dark Red
}

