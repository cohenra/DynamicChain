import { api } from './api';

export interface ProductUOM {
  id: number;
  product_id: number;
  tenant_id: number;
  uom_id: number;
  conversion_factor: number;
  barcode: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  volume: number | null;
  weight: number | null;
  created_at: string;
  updated_at: string;
  uom_name?: string | null;
  uom_code?: string | null;
}

export interface ProductUOMCreate {
  product_id: number;
  uom_id: number;
  conversion_factor: number;
  barcode?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  volume?: number | null;
  weight?: number | null;
}

export interface ProductUOMUpdate {
  uom_id?: number;
  conversion_factor?: number;
  barcode?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  volume?: number | null;
  weight?: number | null;
}

export const productUOMService = {
  /**
   * Get all UOMs for a specific product
   */
  async getProductUOMs(productId: number): Promise<ProductUOM[]> {
    const response = await api.get<ProductUOM[]>(`/api/product-uoms/product/${productId}`);
    return response.data;
  },

  /**
   * Get all UOMs for the tenant
   */
  async getAllUOMs(): Promise<ProductUOM[]> {
    const response = await api.get<ProductUOM[]>('/api/product-uoms/');
    return response.data;
  },

  /**
   * Get a specific UOM by ID
   */
  async getUOM(uomId: number): Promise<ProductUOM> {
    const response = await api.get<ProductUOM>(`/api/product-uoms/${uomId}`);
    return response.data;
  },

  /**
   * Create a new UOM
   */
  async createUOM(data: ProductUOMCreate): Promise<ProductUOM> {
    const response = await api.post<ProductUOM>('/api/product-uoms/', data);
    return response.data;
  },

  /**
   * Update an existing UOM
   */
  async updateUOM(uomId: number, data: ProductUOMUpdate): Promise<ProductUOM> {
    const response = await api.put<ProductUOM>(`/api/product-uoms/${uomId}`, data);
    return response.data;
  },

  /**
   * Delete a UOM
   */
  async deleteUOM(uomId: number): Promise<void> {
    await api.delete(`/api/product-uoms/${uomId}`);
  },
};
