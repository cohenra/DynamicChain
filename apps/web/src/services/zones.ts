import { api } from './api';

export interface Zone {
  id: number;
  warehouse_id: number;
  tenant_id: number;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface ZoneCreate {
  warehouse_id: number;
  name: string;
  code: string;
}

export interface ZoneUpdate {
  name?: string;
  code?: string;
}

export const zoneService = {
  /**
   * Get all zones, optionally filtered by warehouse
   */
  async getZones(warehouseId?: number): Promise<Zone[]> {
    const params = warehouseId ? { warehouse_id: warehouseId } : {};
    const response = await api.get<Zone[]>('/api/zones/', { params });
    return response.data;
  },

  /**
   * Get a single zone by ID
   */
  async getZone(id: number): Promise<Zone> {
    const response = await api.get<Zone>(`/api/zones/${id}`);
    return response.data;
  },

  /**
   * Create a new zone
   */
  async createZone(data: ZoneCreate): Promise<Zone> {
    const response = await api.post<Zone>('/api/zones/', data);
    return response.data;
  },

  /**
   * Update a zone
   */
  async updateZone(id: number, data: ZoneUpdate): Promise<Zone> {
    const response = await api.patch<Zone>(`/api/zones/${id}`, data);
    return response.data;
  },

  /**
   * Delete a zone
   */
  async deleteZone(id: number): Promise<void> {
    await api.delete(`/api/zones/${id}`);
  },
};
