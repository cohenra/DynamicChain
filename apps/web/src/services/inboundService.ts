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

  // Nested objects from eager loading
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
  customer_id: number | null;
  order_number: string;
  order_type: InboundOrderType;
  status: InboundOrderStatus;
  supplier_name: string | null;
  linked_outbound_order_id: number | null;
  expected_delivery_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Nested collections from eager loading
  lines: InboundLine[];
  shipments: InboundShipment[];
  customer?: {
    id: number;
    name: string;
  } | null;
}

export interface CreateShipmentRequest {
  shipment_number: string;
  container_number?: string | null;
  driver_details?: string | null;
  notes?: string | null;
}

export interface UpdateShipmentStatusRequest {
  status: InboundShipmentStatus;
}

export const inboundService = {
  /**
   * Get list of inbound orders
   */
  async getOrders(params?: {
    skip?: number;
    limit?: number;
    status?: InboundOrderStatus;
  }): Promise<InboundOrder[]> {
    const response = await api.get<InboundOrder[]>('/api/inbound/orders', { params });
    return response.data;
  },

  /**
   * Get a single inbound order by ID
   */
  async getOrder(orderId: number): Promise<InboundOrder> {
    const response = await api.get<InboundOrder>(`/api/inbound/orders/${orderId}`);
    return response.data;
  },

  /**
   * Create a new shipment for an order
   */
  async createShipment(orderId: number, data: CreateShipmentRequest): Promise<InboundShipment> {
    const response = await api.post<InboundShipment>(
      `/api/inbound/orders/${orderId}/shipments`,
      data
    );
    return response.data;
  },

  /**
   * Update shipment status
   */
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
};
