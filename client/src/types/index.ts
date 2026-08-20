export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  coins: number;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: Category;
  city: string | null;
  area: string | null;
  lat?: number;
  lng?: number;
  reportDate: string;
  authorName: string | null;
  createdAt: string;
  user: { id: string; name: string | null; avatar: string | null };
  likeCount: number;
  confirmCount: number;
  isLiked?: boolean;
  isConfirmed?: boolean;
}

export type Category =
  | 'VEHICULAR'
  | 'INDUSTRIAL'
  | 'CONSTRUCTION_DUST'
  | 'FOREST_FIRE_CROP_BURNING'
  | 'GARBAGE_BURNING'
  | 'WATER_POLLUTION'
  | 'PLASTIC_WASTE'
  | 'OTHER';

export const CATEGORY_LABELS: Record<Category, string> = {
  VEHICULAR: 'Vehicular Pollution',
  INDUSTRIAL: 'Industrial Pollution',
  CONSTRUCTION_DUST: 'Construction Dust',
  FOREST_FIRE_CROP_BURNING: 'Forest Fire / Crop Burning',
  GARBAGE_BURNING: 'Garbage Burning',
  WATER_POLLUTION: 'Water Pollution',
  PLASTIC_WASTE: 'Plastic Waste',
  OTHER: 'Other',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  VEHICULAR: '#EF4444',
  INDUSTRIAL: '#F97316',
  CONSTRUCTION_DUST: '#EAB308',
  FOREST_FIRE_CROP_BURNING: '#DC2626',
  GARBAGE_BURNING: '#A855F7',
  WATER_POLLUTION: '#3B82F6',
  PLASTIC_WASTE: '#EC4899',
  OTHER: '#6B7280',
};

export interface AqiCity {
  id?: number | string;
  name: string;
  lat: number;
  lng: number;
  aqi: number | null;
  category: string;
  color: string;
  dominantPollutant: string | null;
  time: string | null;
  source?: 'real' | 'estimated';
  pollutants?: {
    pm25?: number | null;
    pm10?: number | null;
    no2?: number | null;
    so2?: number | null;
    co?: number | null;
    o3?: number | null;
    [key: string]: number | null | undefined;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}
