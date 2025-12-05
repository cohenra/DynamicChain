import { api } from './api';

export type InboundOrderType = 'PO' | 'ASN';
export type InboundOrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ShipmentStatus = 'PENDING' | 'IN_TRANSIT' | 'ARRIVED' | 'RECEIVING' | 'COMPLETED';

export interface InboundOrderLine {
  id: number;
  inbound_order_id: number;
  product_id: number;
  uom_id: number;
  expected_quantity: number;
  received_quantity: number;
  created_at: string;
  updated_at: string;

  // Extended fields from API
  product_sku?: string;
  product_name?: string;
  uom_name?: string;
  uom_code?: string;
}

export interface InboundShipment {
  id: number;
  inbound_order_id: number;
  shipment_number: string;
  container_number?: string;
  driver_name?: string;
  driver_phone?: string;
  status: ShipmentStatus;
  arrival_date?: string;
  created_at: string;
  updated_at: string;
}

export interface InboundOrder {
  id: number;
  tenant_id: number;
  order_type: InboundOrderType;
  order_number: string;
  supplier_name: string;
  status: InboundOrderStatus;
  expected_date?: string;
  created_at: string;
  updated_at: string;

  // Extended fields
  lines?: InboundOrderLine[];
  shipments?: InboundShipment[];
}

export interface InboundOrderCreate {
  order_type: InboundOrderType;
  order_number: string;
  supplier_name: string;
  expected_date?: string;
  lines: {
    product_id: number;
    uom_id: number;
    expected_quantity: number;
  }[];
}

export interface ShipmentCreate {
  shipment_number: string;
  container_number?: string;
  driver_name?: string;
  driver_phone?: string;
  arrival_date?: string;
}

export interface ReceiveItemRequest {
  product_id: number;
  uom_id: number;
  quantity: number;
  location_id: number;
  lpn?: string;
  batch_number?: string;
  expiry_date?: string;
}

export interface ReceiveShipmentRequest {
  shipment_id: number;
  items: ReceiveItemRequest[];
}

export const inboundService = {
  /**
   * Get all inbound orders
   */
  async getOrders(): Promise<InboundOrder[]> {
    const response = await api.get<InboundOrder[]>('/api/inbound/orders');
    return response.data;
  },

  /**
   * Get a single inbound order with details (lines and shipments)
   */
  async getOrder(id: number): Promise<InboundOrder> {
    const response = await api.get<InboundOrder>(`/api/inbound/orders/${id}`);
    return response.data;
  },

  /**
   * Create a new inbound order
   */
  async createOrder(data: InboundOrderCreate): Promise<InboundOrder> {
    const response = await api.post<InboundOrder>('/api/inbound/orders', data);
    return response.data;
  },

  /**
   * Create a new shipment for an order
   */
  async createShipment(orderId: number, data: ShipmentCreate): Promise<InboundShipment> {
    const response = await api.post<InboundShipment>(
      `/api/inbound/orders/${orderId}/shipments`,
      data
    );
    return response.data;
  },

  /**
   * Execute receiving for shipment items
   */
  async receiveShipmentItems(data: ReceiveShipmentRequest): Promise<void> {
    await api.post('/api/inbound/receive', data);
  },
};
