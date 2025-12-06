import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export enum InboundOrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum InboundOrderType {
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  ASN = 'ASN',
  CUSTOMER_RETURN = 'CUSTOMER_RETURN',
  TRANSFER_IN = 'TRANSFER_IN'
}

export interface InboundLine {
  id: number;
  order_id: number;
  product_id: number;
  product?: {
    id: number;
    sku: string;
    name: string;
  };
  expected_quantity: number;
  received_quantity: number;
  uom_id: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InboundShipment {
  id: number;
  order_id: number;
  shipment_number: string;
  container_number?: string;
  driver_name?: string;
  driver_phone?: string;
  truck_license_plate?: string;
  expected_arrival_date?: string;
  actual_arrival_date?: string;
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'ARRIVED' | 'RECEIVING' | 'COMPLETED';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InboundOrder {
  id: number;
  tenant_id: number;
  order_number: string;
  order_type: InboundOrderType;
  status: InboundOrderStatus;
  customer_id?: number;
  reference_number?: string;
  expected_arrival_date?: string;
  notes?: string;
  custom_attributes?: Record<string, any>;
  created_at: string;
  updated_at: string;
  lines?: InboundLine[];
  shipments?: InboundShipment[];
}

export interface CreateInboundOrderData {
  order_number: string;
  order_type: InboundOrderType;
  customer_id?: number;
  reference_number?: string;
  expected_arrival_date?: string;
  notes?: string;
  lines: {
    product_id: number;
    expected_quantity: number;
    uom_id: number;
    notes?: string;
  }[];
}

export interface CreateShipmentData {
  shipment_number: string;
  container_number?: string;
  driver_name?: string;
  driver_phone?: string;
  truck_license_plate?: string;
  expected_arrival_date?: string;
  notes?: string;
}

export interface ReceiveItemData {
  product_id: number;
  quantity: number;
  location_id: number;
  lpn?: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

export interface ReceiveShipmentData {
  shipment_id: number;
  items: ReceiveItemData[];
}

export interface ReceiveShipmentResponse {
  message: string;
  shipment_id: number;
  order_id: number;
  received_items: {
    product_id: number;
    quantity: number;
    lpn?: string;
  }[];
  order_status: InboundOrderStatus;
  shipment_status: string;
}

// ============================================================
// API SERVICE
// ============================================================

class InboundService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  /**
   * Create a new inbound order
   */
  async createOrder(orderData: CreateInboundOrderData): Promise<InboundOrder> {
    const response = await axios.post(
      `${API_URL}/api/inbound/orders`,
      orderData,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * List all inbound orders
   */
  async listOrders(params?: {
    skip?: number;
    limit?: number;
    status_filter?: InboundOrderStatus;
  }): Promise<InboundOrder[]> {
    const response = await axios.get(
      `${API_URL}/api/inbound/orders`,
      {
        params,
        headers: this.getAuthHeaders()
      }
    );
    return response.data;
  }

  /**
   * Get a specific inbound order by ID
   */
  async getOrder(orderId: number): Promise<InboundOrder> {
    const response = await axios.get(
      `${API_URL}/api/inbound/orders/${orderId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * Create a shipment for an order
   */
  async createShipment(
    orderId: number,
    shipmentData: CreateShipmentData
  ): Promise<InboundShipment> {
    const response = await axios.post(
      `${API_URL}/api/inbound/orders/${orderId}/shipments`,
      shipmentData,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * Receive items from a shipment into inventory
   */
  async receiveShipment(
    receiveData: ReceiveShipmentData
  ): Promise<ReceiveShipmentResponse> {
    const response = await axios.post(
      `${API_URL}/api/inbound/receive`,
      receiveData,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }
}

export const inboundService = new InboundService();
export default inboundService;