import { Router, Request, Response } from 'express';
import { calculateOverallWqi, WaterParameters } from '../lib/wqiCalculator';

export const wqiRouter = Router();

export interface WaterStationItem {
  id: string | number;
  name: string;
  waterBody: string;
  city: string;
  lat: number;
  lng: number;
  wqi: number | null;
  category: string;
  color: string;
  suitability: string;
  healthAdvisory: string;
  parameters: WaterParameters;
  updatedAt: string;
}

// Representative monitoring stations across major Indian rivers, lakes, and coasts
const INDIAN_WATER_STATIONS: Array<{
  id: string;
  name: string;
  waterBody: string;
  city: string;
  lat: number;
  lng: number;
  params: WaterParameters;
}> = [
  { id: 'w1', name: 'Nigambodh Ghat Station', waterBody: 'Yamuna River', city: 'Delhi', lat: 28.665, lng: 77.234, params: { ph: 8.2, tds: 850, turbidity: 24, do: 1.8, bod: 18.5 } },
  { id: 'w2', name: 'Dashashwamedh Ghat Station', waterBody: 'Ganges River', city: 'Varanasi', lat: 25.306, lng: 83.010, params: { ph: 7.6, tds: 340, turbidity: 8, do: 6.2, bod: 3.4 } },
  { id: 'w3', name: 'Sabarmati Riverfront North', waterBody: 'Sabarmati River', city: 'Ahmedabad', lat: 23.033, lng: 72.571, params: { ph: 7.4, tds: 420, turbidity: 6, do: 5.8, bod: 4.1 } },
  { id: 'w4', name: 'Sangam Station', waterBody: 'Triveni Sangam', city: 'Prayagraj', lat: 25.435, lng: 81.884, params: { ph: 7.5, tds: 290, turbidity: 7, do: 6.8, bod: 2.8 } },
  { id: 'w5', name: 'Marine Drive Coast', waterBody: 'Arabian Sea', city: 'Mumbai', lat: 18.943, lng: 72.823, params: { ph: 7.9, tds: 920, turbidity: 14, do: 4.5, bod: 6.2 } },
  { id: 'w6', name: 'Powai Lake Inlet', waterBody: 'Powai Lake', city: 'Mumbai', lat: 19.123, lng: 72.905, params: { ph: 7.8, tds: 580, turbidity: 11, do: 4.2, bod: 8.4 } },
  { id: 'w7', name: 'Bellandur Lake Outlet', waterBody: 'Bellandur Lake', city: 'Bengaluru', lat: 12.936, lng: 77.668, params: { ph: 8.9, tds: 1250, turbidity: 45, do: 0.5, bod: 34.0 } },
  { id: 'w8', name: 'Ulsoor Lake', waterBody: 'Ulsoor Lake', city: 'Bengaluru', lat: 12.982, lng: 77.620, params: { ph: 7.3, tds: 380, turbidity: 6, do: 5.9, bod: 3.8 } },
  { id: 'w9', name: 'Cooum River Mouth', waterBody: 'Cooum River', city: 'Chennai', lat: 13.070, lng: 80.285, params: { ph: 8.4, tds: 1100, turbidity: 32, do: 1.2, bod: 28.0 } },
  { id: 'w10', name: 'Hussain Sagar North', waterBody: 'Hussain Sagar', city: 'Hyderabad', lat: 17.423, lng: 78.473, params: { ph: 8.1, tds: 790, turbidity: 18, do: 3.1, bod: 12.6 } },
  { id: 'w11', name: 'Princep Ghat Station', waterBody: 'Hooghly River', city: 'Kolkata', lat: 22.556, lng: 88.336, params: { ph: 7.6, tds: 460, turbidity: 12, do: 5.4, bod: 4.8 } },
  { id: 'w12', name: 'Dal Lake Center', waterBody: 'Dal Lake', city: 'Srinagar', lat: 34.110, lng: 74.870, params: { ph: 7.1, tds: 140, turbidity: 2, do: 8.1, bod: 1.1 } },
  { id: 'w13', name: 'Mandovi Promenade', waterBody: 'Mandovi River', city: 'Goa', lat: 15.500, lng: 73.830, params: { ph: 7.2, tds: 190, turbidity: 3, do: 7.6, bod: 1.4 } },
  { id: 'w14', name: 'Marine Drive Promenade', waterBody: 'Vembanad Lake', city: 'Kochi', lat: 9.970, lng: 76.280, params: { ph: 7.3, tds: 310, turbidity: 5, do: 6.4, bod: 2.3 } },
  { id: 'w15', name: 'Sukhna Lake Promenade', waterBody: 'Sukhna Lake', city: 'Chandigarh', lat: 30.742, lng: 76.818, params: { ph: 7.2, tds: 210, turbidity: 3, do: 7.4, bod: 1.5 } },
  { id: 'w16', name: 'Bhojtal VIP Road', waterBody: 'Upper Lake', city: 'Bhopal', lat: 23.250, lng: 77.380, params: { ph: 7.5, tds: 330, turbidity: 6, do: 6.1, bod: 2.9 } },
];

/**
 * GET /api/wqi/stations
 * Returns all Water Quality Index stations with computed WQI metrics and health advisories.
 */
wqiRouter.get('/stations', (_req: Request, res: Response): void => {
  try {
    const stations: WaterStationItem[] = INDIAN_WATER_STATIONS.map((s) => {
      const computed = calculateOverallWqi(s.params);
      return {
        id: s.id,
        name: s.name,
        waterBody: s.waterBody,
        city: s.city,
        lat: s.lat,
        lng: s.lng,
        wqi: computed.wqi,
        category: computed.category,
        color: computed.color,
        suitability: computed.suitability,
        healthAdvisory: computed.healthAdvisory,
        parameters: s.params,
        updatedAt: new Date().toISOString(),
      };
    });

    res.json({ stations });
  } catch (err: any) {
    console.error('[WQI Route Error]:', err);
    res.status(500).json({ error: 'Failed to fetch Water Quality Index data' });
  }
});
