import { api } from './api';

export enum LocationType {
  SHELF = 'SHELF',
  PALLET_RACK = 'PALLET_RACK',
  FLOOR = 'FLOOR',
  CAGED = 'CAGED',
}

export enum LocationUsage {
  PICKING = 'PICKING',
  STORAGE = 'STORAGE',
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  HANDOFF = 'HANDOFF',
  QUARANTINE = 'QUARANTINE',
}

export interface Location {
  id: number;
  warehouse_id: number;
  zone_id: number;
  tenant_id: number;
  name: string;
  aisle: string;
  bay: string;
  level: string;
  slot: string;
  type: LocationType;
  usage: LocationUsage;
  pick_sequence: number;
  created_at: string;
  updated_at: string;
}

export interface LocationCreate {
  warehouse_id: number;
  zone_id: number;
  name: string;
  aisle: string;
  bay: string;
  level: string;
  slot: string;
  type: LocationType;
  usage: LocationUsage;
  pick_sequence?: number;
}

export interface LocationUpdate {
  name?: string;
  aisle?: string;
  bay?: string;
  level?: string;
  slot?: string;
  type?: LocationType;
  usage?: LocationUsage;
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
  type: LocationType;
  usage: LocationUsage;
  pick_sequence_start?: number;
}

export interface LocationBulkCreateResponse {
  created_count: number;
  locations: Location[];
}

export interface LocationListParams {
  warehouse_id?: number;
  zone_id?: number;
  usage?: LocationUsage;
  skip?: number;
  limit?: number;
}

export const locationService = {
  /**
   * Get all locations with optional filters
   */
  async getLocations(params?: LocationListParams): Promise<Location[]> {
    const response = await api.get<Location[]>('/api/locations/', { params });
    return response.data;
  },

  /**
   * Get a single location by ID
   */
  async getLocation(id: number): Promise<Location> {
    const response = await api.get<Location>(`/api/locations/${id}`);
    return response.data;
  },

  /**
   * Create a new location
   */
  async createLocation(data: LocationCreate): Promise<Location> {
    const response = await api.post<Location>('/api/locations/', data);
    return response.data;
  },

  /**
   * Bulk create locations from a range configuration
   */
  async bulkCreateLocations(config: LocationBulkCreateConfig): Promise<LocationBulkCreateResponse> {
    const response = await api.post<LocationBulkCreateResponse>('/api/locations/bulk', config);
    return response.data;
  },

  /**
   * Update a location
   */
  async updateLocation(id: number, data: LocationUpdate): Promise<Location> {
    const response = await api.patch<Location>(`/api/locations/${id}`, data);
    return response.data;
  },

  /**
   * Delete a location
   */
  async deleteLocation(id: number): Promise<void> {
    await api.delete(`/api/locations/${id}`);
  },
};
