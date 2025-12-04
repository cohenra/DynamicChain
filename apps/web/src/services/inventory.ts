import { api } from './api';

export interface Inventory {
  id: number;
  tenant_id: number;
  depositor_id: number;
  product_id: number;
  location_id: number;
  lpn: string;
  quantity: number;
  status: 'AVAILABLE' | 'RESERVED' | 'QUARANTINE' | 'DAMAGED' | 'MISSING';
  batch_number: string | null;
  expiry_date: string | null;
  fifo_date: string;
  created_at: string;
  updated_at: string;
  
  // שדות מורחבים שמגיעים מה-API
  product_sku?: string;
  product_name?: string;
  location_name?: string;
  depositor_name?: string;
}

export interface InventoryListResponse {
  items: Inventory[];
  total: number;
  skip: number;
  limit: number;
}

export const inventoryService = {
  /**
   * קבלת רשימת המלאי עם פילטרים
   */
  async getInventory(params?: {
    skip?: number;
    limit?: number;
    product_id?: number;
    location_id?: number;
    lpn?: string;
  }): Promise<Inventory[]> {
    // ה-API מחזיר אובייקט עם items ו-total, אנחנו כרגע נחזיר את ה-items לטבלה
    const response = await api.get<InventoryListResponse>('/api/inventory/', { params });
    return response.data.items; 
  },

  /**
   * קבלת פריט מלאי בודד לפי LPN
   */
  async getByLpn(lpn: string): Promise<Inventory> {
    const response = await api.get<Inventory>(`/api/inventory/lpn/${lpn}`);
    return response.data;
  }
};
