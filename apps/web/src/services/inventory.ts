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

export interface InventoryTransaction {
  id: number;
  tenant_id: number;
  transaction_type: string;
  product_id: number;
  from_location_id: number | null;
  to_location_id: number | null;
  inventory_id: number;
  quantity: number;
  reference_doc: string | null;
  performed_by: number;
  timestamp: string;
  billing_metadata: Record<string, any>;

  // Populated fields
  product_sku?: string;
  product_name?: string;
  inventory_lpn?: string;
  from_location_name?: string;
  to_location_name?: string;
  performed_by_name?: string;
}

export interface InventoryTransactionListResponse {
  items: InventoryTransaction[];
  total: number;
  skip: number;
  limit: number;
}

export interface InventoryReceiveRequest {
  depositor_id: number;
  product_id: number;
  location_id: number;
  quantity: number;
  lpn?: string;
  batch_number?: string;
  expiry_date?: string;
  reference_doc?: string;
}

export interface InventoryTransactionCorrectionRequest {
  new_quantity: number;
  reason?: string;
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
  },

  /**
   * קבלת רשימת טרנזקציות מלאי
   */
  async getTransactions(params?: {
    skip?: number;
    limit?: number;
    inventory_id?: number;
    product_id?: number;
    reference_doc?: string;
  }): Promise<InventoryTransactionListResponse> {
    const response = await api.get<InventoryTransactionListResponse>('/api/inventory/transactions/', { params });
    return response.data;
  },

  /**
   * תיקון טרנזקציה קיימת באמצעות טרנזקצית פיצוי
   */
  async correctTransaction(
    transactionId: number,
    data: InventoryTransactionCorrectionRequest
  ): Promise<InventoryTransaction> {
    const response = await api.post<InventoryTransaction>(
      `/api/inventory/transactions/${transactionId}/correct`,
      data
    );
    return response.data;
  },

  /**
   * קליטת מלאי חדש למחסן
   */
  async receiveStock(data: InventoryReceiveRequest): Promise<Inventory> {
    const response = await api.post<Inventory>('/api/inventory/receive', data);
    return response.data;
  }
};
