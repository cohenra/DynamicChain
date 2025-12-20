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

// ממשק חדש לתשובה מרובדת
export interface PaginatedZones {
  items: Zone[];
  total: number;
}

export interface ZoneListParams {
  warehouse_id?: number;
  skip?: number;
  limit?: number;
}

export const zoneService = {
  async getZones(params?: ZoneListParams): Promise<PaginatedZones> {
    const response = await api.get<PaginatedZones>('/api/zones/', { params });
    return response.data;
  },

  async getZone(id: number): Promise<Zone> {
    const response = await api.get<Zone>(`/api/zones/${id}`);
    return response.data;
  },

  async createZone(data: ZoneCreate): Promise<Zone> {
    const response = await api.post<Zone>('/api/zones/', data);
    return response.data;
  },

  async updateZone(id: number, data: ZoneUpdate): Promise<Zone> {
    const response = await api.patch<Zone>(`/api/zones/${id}`, data);
    return response.data;
  },

  async deleteZone(id: number): Promise<void> {
    await api.delete(`/api/zones/${id}`);
  },
};