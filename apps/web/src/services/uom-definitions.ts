import { api } from './api';

export interface UomDefinition {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface UomDefinitionCreate {
  name: string;
  code: string;
}

export interface UomDefinitionUpdate {
  name?: string;
  code?: string;
}

export const uomDefinitionService = {
  /**
   * Get all UOM definitions
   */
  async getUomDefinitions(): Promise<UomDefinition[]> {
    const response = await api.get<UomDefinition[]>('/api/uom-definitions/');
    return response.data;
  },

  /**
   * Get a single UOM definition
   */
  async getUomDefinition(id: number): Promise<UomDefinition> {
    const response = await api.get<UomDefinition>(`/api/uom-definitions/${id}`);
    return response.data;
  },

  /**
   * Create a new UOM definition
   */
  async createUomDefinition(data: UomDefinitionCreate): Promise<UomDefinition> {
    const response = await api.post<UomDefinition>('/api/uom-definitions/', data);
    return response.data;
  },

  /**
   * Update an existing UOM definition
   */
  async updateUomDefinition(id: number, data: UomDefinitionUpdate): Promise<UomDefinition> {
    const response = await api.put<UomDefinition>(`/api/uom-definitions/${id}`, data);
    return response.data;
  },

  /**
   * Delete a UOM definition
   */
  async deleteUomDefinition(id: number): Promise<void> {
    await api.delete(`/api/uom-definitions/${id}`);
  },
};
