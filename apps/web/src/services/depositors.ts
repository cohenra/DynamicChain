import { api } from './api';

export interface Depositor {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepositorCreate {
  name: string;
  code: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}

export const depositorService = {
  /**
   * Get all depositors
   */
  async getDepositors(): Promise<Depositor[]> {
    const response = await api.get<Depositor[]>('/api/depositors/');
    return response.data;
  },

  /**
   * Create a new depositor
   */
  async createDepositor(data: DepositorCreate): Promise<Depositor> {
    const response = await api.post<Depositor>('/api/depositors/', data);
    return response.data;
  },

  /**
   * Update a depositor
   */
  async updateDepositor(id: number, data: DepositorCreate): Promise<Depositor> {
    const response = await api.put<Depositor>(`/api/depositors/${id}`, data);
    return response.data;
  },

  /**
   * Delete a depositor
   */
  async deleteDepositor(id: number): Promise<void> {
    await api.delete(`/api/depositors/${id}`);
  },
};
