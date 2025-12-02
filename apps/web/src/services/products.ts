import { api } from './api';

export interface Product {
  id: number;
  tenant_id: number;
  depositor_id: number;
  sku: string;
  name: string;
  barcode: string | null;
  custom_attributes: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  depositor_id: number;
  sku: string;
  name: string;
  barcode?: string | null;
  custom_attributes?: Record<string, any>;
}

export const productService = {
  /**
   * Get all products
   */
  async getProducts(): Promise<Product[]> {
    const response = await api.get<Product[]>('/api/products/'); 
  return response.data;
  },

  /**
   * Create a new product
   */
  async createProduct(data: ProductCreate): Promise<Product> {
    const response = await api.post<Product>('/api/products/', data);
    return response.data;
  },
};
