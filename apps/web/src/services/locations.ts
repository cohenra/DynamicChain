import { api } from './api';

// --- Interfaces ---

export interface LocationTypeDefinition {
  id: number;
  name: string;
  code: string;
}

export interface LocationUsageDefinition {
  id: number;
  name: string;
  code: string;
}

export interface Location {
  id: number;
  warehouse_id: number;
  zone_id: number;
  tenant_id: number;
  name: string; // e.g. A-01-01-01
  aisle: string;
  bay: string;
  level: string;
  slot: string;
  type_id: number;  // שונה מ-Enum ל-ID (Foreign Key)
  usage_id: number; // שונה מ-Enum ל-ID (Foreign Key)
  pick_sequence: number;
  created_at: string;
  updated_at: string;
  // שדות אופציונליים להרחבה
  type_definition?: LocationTypeDefinition;
  usage_definition?: LocationUsageDefinition;
}

export interface LocationCreate {
  warehouse_id: number;
  zone_id: number;
  name: string;
  aisle: string;
  bay: string;
  level: string;
  slot: string;
  type_id: number;
  usage_id: number;
  pick_sequence?: number;
}

export interface LocationUpdate {
  name?: string;
  aisle?: string;
  bay?: string;
  level?: string;
  slot?: string;
  type_id?: number;
  usage_id?: number;
  pick_sequence?: number;
}

export interface LocationBulkCreateConfig {
  warehouse_id: number;
  zone_id: number;
  aisle: string;
  bay_start: number;
  bay_end: number;
  level_start: number;
  level_end: number;
  slot_start: number;
  slot_end: number;
  type_id: number;
  usage_id: number;
  pick_sequence_start?: number;
}

export interface LocationBulkCreateResponse {
  created_count: number;
  locations: Location[];
}

export interface LocationListParams {
  warehouse_id?: number;
  zone_id?: number;
  usage_id?: number;
  skip?: number;
  limit?: number;
}

export const locationService = {
  // קבלת רשימת מיקומים
  async getLocations(params?: LocationListParams): Promise<Location[]> {
    const response = await api.get<Location[]>('/api/locations/', { params });
    return response.data;
  },

  // יצירת מיקום בודד
  async createLocation(data: LocationCreate): Promise<Location> {
    const response = await api.post<Location>('/api/locations/', data);
    return response.data;
  },

  // יצירת מיקומים המונית
  async bulkCreateLocations(config: LocationBulkCreateConfig): Promise<LocationBulkCreateResponse> {
    const response = await api.post<LocationBulkCreateResponse>('/api/locations/bulk', config);
    return response.data;
  },

  // --- מתודות חדשות להגדרות דינמיות ---
  
  async getLocationTypes(): Promise<LocationTypeDefinition[]> {
    const response = await api.get<LocationTypeDefinition[]>('/api/location-type-definitions/');
    return response.data;
  },

  async getLocationUsages(): Promise<LocationUsageDefinition[]> {
    const response = await api.get<LocationUsageDefinition[]>('/api/location-usage-definitions/');
    return response.data;
  },

  // מחיקה ועדכון
  async updateLocation(id: number, data: LocationUpdate): Promise<Location> {
    const response = await api.patch<Location>(`/api/locations/${id}`, data);
    return response.data;
  },

  async deleteLocation(id: number): Promise<void> {
    await api.delete(`/api/locations/${id}`);
  },
};
