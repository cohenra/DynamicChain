import { api } from './api';

export type InboundOrderType = 'SUPPLIER_DELIVERY' | 'CUSTOMER_RETURN' | 'TRANSFER_IN';
export type InboundOrderStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
export type InboundShipmentStatus = 'SCHEDULED' | 'ARRIVED' | 'RECEIVING' | 'CLOSED';

export interface InboundShipment {
  id: number;
  inbound_order_id: number;
  shipment_number: string;
  status: InboundShipmentStatus;
  container_number: string | null;
  driver_details: string | null;
  arrival_date: string | null;
  closed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboundLine {
  id: number;
  inbound_order_id: number;
  product_id: number;
  uom_id: number;
  expected_quantity: number;
  received_quantity: number;
  expected_batch: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: number;
    sku: string;
    name: string;
  };
  uom?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface InboundOrder {
  id: number;
  tenant_id: number;
  customer_id: number; // Required now
  order_number: string;
  order_type: InboundOrderType;
  status: InboundOrderStatus;
  supplier_name: string | null;
  linked_outbound_order_id: number | null;
  expected_delivery_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  lines: InboundLine[];
  shipments: InboundShipment[];
  customer?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface InboundLineCreate {
  product_id: number;
  uom_id: number;
  expected_quantity: number;
  expected_batch?: string;
  notes?: string;
}

export interface InboundLineUpdate {
  expected_quantity?: number;
  expected_batch?: string;
  notes?: string;
}

export interface InboundOrderCreateRequest {
  order_number: string;
  order_type: InboundOrderType;
  customer_id: number; // Required
  supplier_name?: string;
  expected_delivery_date?: string;
  notes?: string;
  lines: InboundLineCreate[];
}

export interface CreateShipmentRequest {
  shipment_number: string;
  container_number?: string | null;
  driver_details?: string | null;
  arrival_date?: string | null;
  notes?: string | null;
}

export interface UpdateShipmentStatusRequest {
  status: InboundShipmentStatus;
}

export interface BulkCloseRequest {
  order_ids: number[];
}

export interface BulkCloseResult {
  success_count: number;
  failed_count: number;
  errors: string[];
  closed_order_ids: number[];
}

export const inboundService = {
  async getOrders(params?: {
    skip?: number;
    limit?: number;
    status?: InboundOrderStatus;
  }): Promise<InboundOrder[]> {
    const response = await api.get<InboundOrder[]>('/api/inbound/orders', { params });
    return response.data;
  },

  async getOrder(orderId: number): Promise<InboundOrder> {
    const response = await api.get<InboundOrder>(`/api/inbound/orders/${orderId}`);
    return response.data;
  },

  async createOrder(data: InboundOrderCreateRequest): Promise<InboundOrder> {
    const response = await api.post<InboundOrder>('/api/inbound/orders', data);
    return response.data;
  },

  async closeOrder(orderId: number, force?: boolean): Promise<InboundOrder> {
    const url = force
      ? `/api/inbound/orders/${orderId}/close?force=true`
      : `/api/inbound/orders/${orderId}/close`;
    const response = await api.patch<InboundOrder>(url);
    return response.data;
  },

  async addLine(orderId: number, data: InboundLineCreate): Promise<InboundOrder> {
    const response = await api.post<InboundOrder>(`/api/inbound/orders/${orderId}/lines`, data);
    return response.data;
  },

  async updateLine(lineId: number, data: InboundLineUpdate): Promise<InboundLine> {
    const response = await api.patch<InboundLine>(`/api/inbound/lines/${lineId}`, data);
    return response.data;
  },

  async createShipment(orderId: number, data: CreateShipmentRequest): Promise<InboundShipment> {
    const response = await api.post<InboundShipment>(
      `/api/inbound/orders/${orderId}/shipments`,
      data
    );
    return response.data;
  },

  async updateShipmentStatus(
    shipmentId: number,
    data: UpdateShipmentStatusRequest
  ): Promise<InboundShipment> {
    const response = await api.patch<InboundShipment>(
      `/api/inbound/shipments/${shipmentId}/status`,
      data
    );
    return response.data;
  },

  async bulkCloseOrders(data: BulkCloseRequest): Promise<BulkCloseResult> {
    const response = await api.post<BulkCloseResult>('/api/inbound/orders/bulk-close', data);
    return response.data;
  },
};