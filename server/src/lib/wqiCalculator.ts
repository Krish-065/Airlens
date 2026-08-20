/**
 * WQI Calculator module for computing Water Quality Index (WQI),
 * parameters (pH, TDS, Turbidity, Dissolved Oxygen, BOD), category, color,
 * and drinking suitability following CPCB (India) and NSF standards.
 */

export interface WaterParameters {
  ph?: number | null;        // pH (Optimal: 6.5 - 8.5)
  tds?: number | null;       // Total Dissolved Solids in mg/L (Ideal: < 500 mg/L)
  turbidity?: number | null; // Turbidity in NTU (Ideal: < 5 NTU)
  do?: number | null;        // Dissolved Oxygen in mg/L (Ideal: > 6.5 mg/L)
  bod?: number | null;       // Biochemical Oxygen Demand in mg/L (Ideal: < 2 mg/L)
  [key: string]: number | null | undefined;
}

export interface WqiResult {
  wqi: number | null;
  category: string;
  color: string;
  suitability: string;
  healthAdvisory: string;
}

export function getWqiCategory(wqi: number | null): string {
  if (wqi === null || wqi === undefined) return 'Unknown';
  if (wqi <= 25) return 'Excellent (Potable)';
  if (wqi <= 50) return 'Good Water Quality';
  if (wqi <= 75) return 'Fair / Moderate Pollution';
  if (wqi <= 100) return 'Poor Water Quality';
  return 'Very Poor / Contaminated';
}

export function getWqiColor(wqi: number | null): string {
  if (wqi === null || wqi === undefined) return '#9E9E9E'; // Grey
  if (wqi <= 25) return '#00B050';  // Emerald Green
  if (wqi <= 50) return '#0284C7';  // Ocean Blue
  if (wqi <= 75) return '#F97316';  // Orange
  if (wqi <= 100) return '#EF4444'; // Red
  return '#7B1FA2';                // Deep Purple
}

export function getWqiSuitability(wqi: number | null): string {
  if (wqi === null || wqi === undefined) return 'Data Pending';
  if (wqi <= 25) return 'Safe for Drinking & Domestic Use';
  if (wqi <= 50) return 'Suitable for Drinking (After Filtration/Boiling)';
  if (wqi <= 75) return 'Suitable for Irrigation & Livestock';
  if (wqi <= 100) return 'Unsuitable for Drinking without Advanced Treatment';
  return 'Hazardous — Industrial / Effluent Contamination';
}

export function getWqiHealthAdvisory(wqi: number | null): string {
  if (wqi === null || wqi === undefined) return 'No advisory available.';
  if (wqi <= 25) return 'Water quality meets safety standards. Safe for consumption.';
  if (wqi <= 50) return 'Water is generally safe. Boiling or RO filtration recommended before drinking.';
  if (wqi <= 75) return 'Avoid direct consumption without filtration. Safe for agriculture and bathing.';
  if (wqi <= 100) return 'Do not drink directly. High mineral or organic content detected.';
  return 'DANGER: Highly polluted water body. Do not ingest or swim.';
}

/**
 * Calculates overall Water Quality Index (WQI) using weighted parameters.
 */
export function calculateOverallWqi(params: WaterParameters): WqiResult {
  let totalWeight = 0;
  let weightedSubIndexSum = 0;

  // Parameters with relative weights (w_i) and ideal values
  const parameterWeights: Record<string, { weight: number; calcSubIndex: (val: number) => number }> = {
    ph: {
      weight: 4,
      calcSubIndex: (val) => {
        // Ideal pH is 7.0. Deviation calculates sub-index.
        const diff = Math.abs(val - 7.0);
        return Math.min(100, (diff / 1.5) * 100);
      },
    },
    tds: {
      weight: 3,
      calcSubIndex: (val) => {
        // Standard limit: 500 mg/L
        return Math.min(100, (val / 500) * 50);
      },
    },
    turbidity: {
      weight: 3,
      calcSubIndex: (val) => {
        // Standard limit: 5 NTU
        return Math.min(100, (val / 5) * 40);
      },
    },
    do: {
      weight: 5,
      calcSubIndex: (val) => {
        // Dissolved Oxygen: Higher is better (> 6.5 mg/L is 100% good)
        if (val >= 7.0) return 10;
        return Math.min(100, ((7.0 - val) / 7.0) * 100);
      },
    },
    bod: {
      weight: 5,
      calcSubIndex: (val) => {
        // BOD limit: 3.0 mg/L
        return Math.min(100, (val / 3.0) * 50);
      },
    },
  };

  for (const [key, config] of Object.entries(parameterWeights)) {
    const val = params[key];
    if (val !== undefined && val !== null && !isNaN(val)) {
      const q_i = config.calcSubIndex(val);
      weightedSubIndexSum += q_i * config.weight;
      totalWeight += config.weight;
    }
  }

  const finalWqi = totalWeight > 0 ? Math.round(weightedSubIndexSum / totalWeight) : null;
  
  return {
    wqi: finalWqi,
    category: getWqiCategory(finalWqi),
    color: getWqiColor(finalWqi),
    suitability: getWqiSuitability(finalWqi),
    healthAdvisory: getWqiHealthAdvisory(finalWqi),
  };
}
