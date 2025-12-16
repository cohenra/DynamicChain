/**
 * Service for dynamic order types API.
 */
import { api } from './api';

export interface OrderTypeSelectOption {
  id: number;
  code: string;
  name: string;
  default_priority: number;
  behavior_key: string;
}

export interface OrderTypeDefinition {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  description: string | null;
  default_priority: number;
  behavior_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderTypeCreate {
  code: string;
  name: string;
  description?: string;
  default_priority?: number;
  behavior_key?: 'B2B' | 'ECOM' | 'TRANSFER' | 'RETAIL' | 'RETURN';
  is_active?: boolean;
}

export interface OrderTypeUpdate {
  code?: string;
  name?: string;
  description?: string;
  default_priority?: number;
  behavior_key?: 'B2B' | 'ECOM' | 'TRANSFER' | 'RETAIL' | 'RETURN';
  is_active?: boolean;
}

/**
 * Get order types for dropdown/select components.
 * Returns only active types with minimal fields.
 */
export const getOrderTypeOptions = async (): Promise<OrderTypeSelectOption[]> => {
  const response = await api.get('/api/order-types/select-options');
  return response.data;
};

/**
 * List all order types (including inactive).
 */
export const getOrderTypes = async (activeOnly: boolean = true): Promise<OrderTypeDefinition[]> => {
  const response = await api.get('/api/order-types', {
    params: { active_only: activeOnly }
  });
  return response.data;
};

/**
 * Get a specific order type by ID.
 */
export const getOrderType = async (id: number): Promise<OrderTypeDefinition> => {
  const response = await api.get(`/api/order-types/${id}`);
  return response.data;
};

/**
 * Get a specific order type by code.
 */
export const getOrderTypeByCode = async (code: string): Promise<OrderTypeDefinition> => {
  const response = await api.get(`/api/order-types/code/${code}`);
  return response.data;
};

/**
 * Create a new order type.
 */
export const createOrderType = async (data: OrderTypeCreate): Promise<OrderTypeDefinition> => {
  const response = await api.post('/api/order-types', data);
  return response.data;
};

/**
 * Update an order type.
 */
export const updateOrderType = async (id: number, data: OrderTypeUpdate): Promise<OrderTypeDefinition> => {
  const response = await api.put(`/api/order-types/${id}`, data);
  return response.data;
};

/**
 * Delete (deactivate) an order type.
 */
export const deleteOrderType = async (id: number): Promise<void> => {
  await api.delete(`/api/order-types/${id}`);
};

/**
 * Seed default order types for the tenant.
 */
export const seedDefaultOrderTypes = async (): Promise<OrderTypeDefinition[]> => {
  const response = await api.post('/api/order-types/seed');
  return response.data;
};
