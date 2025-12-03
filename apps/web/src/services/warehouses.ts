import { api } from './api';

export interface Warehouse {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  zipcode: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarehouseCreate {
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  zipcode?: string | null;
}

export const warehouseService = {
  /**
   * Get all warehouses
   */
  async getWarehouses(): Promise<Warehouse[]> {
    const response = await api.get<Warehouse[]>('/api/warehouses/');
    return response.data;
  },

  /**
   * Create a new warehouse
   */
  async createWarehouse(data: WarehouseCreate): Promise<Warehouse> {
    const response = await api.post<Warehouse>('/api/warehouses/', data);
    return response.data;
  },

  /**
   * Update a warehouse
   */
  async updateWarehouse(id: number, data: WarehouseCreate): Promise<Warehouse> {
    const response = await api.put<Warehouse>(`/api/warehouses/${id}`, data);
    return response.data;
  },

  /**
   * Delete a warehouse
   */
  async deleteWarehouse(id: number): Promise<void> {
    await api.delete(`/api/warehouses/${id}`);
  },
};
