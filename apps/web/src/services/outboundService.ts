import { api } from './api';

export type OutboundOrderStatus =
  | 'DRAFT'
  | 'VERIFIED'
  | 'PLANNED'
  | 'RELEASED'
  | 'PICKING'
  | 'PICKED'
  | 'PACKED'
  | 'SHIPPED'
  | 'CANCELLED';

export type OutboundWaveStatus =
  | 'PLANNING'
  | 'ALLOCATED'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type PickTaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SHORT';

export type PickingType = 'DISCRETE' | 'WAVE' | 'CLUSTER';

export interface AllocationStrategy {
  id: number;
  tenant_id: number;
  name: string;
  picking_type: PickingType;
  rules_config: {
    inventory_source?: {
      status_list?: string[];
      zone_priority?: string[];
    };
    picking_policy?: string;
    partial_policy?: string;
    pallet_logic?: string;
    warehouse_logic?: {
      mode?: string;
      priority_warehouses?: number[];
      max_splits?: number;
    };
    batch_matching?: boolean;
    expiry_days_threshold?: number;
  };
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutboundLine {
  id: number;
  order_id: number;
  product_id: number;
  uom_id: number;
  qty_ordered: number;
  qty_allocated: number;
  qty_picked: number;
  qty_packed: number;
  qty_shipped: number;
  constraints: Record<string, any>;
  line_status: string | null;
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

export interface PickTask {
  id: number;
  wave_id: number | null;
  order_id: number;
  line_id: number;
  inventory_id: number;
  from_location_id: number;
  to_location_id: number | null;
  qty_to_pick: number;
  qty_picked: number;
  status: PickTaskStatus;
  assigned_to_user_id: number | null;
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
  completed_at: string | null;
  from_location?: {
    id: number;
    name: string;
    warehouse_id: number;
  };
  to_location?: {
    id: number;
    name: string;
    warehouse_id: number;
  };
}

export interface OutboundOrder {
  id: number;
  tenant_id: number;
  order_number: string;
  customer_id: number;
  wave_id: number | null;
  status: OutboundOrderStatus;
  order_type: string;
  priority: number;
  requested_delivery_date: string | null;
  status_changed_at: string | null;
  shipping_details: Record<string, any>;
  metrics: Record<string, any>;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    name: string;
    code: string;
  };
  lines: OutboundLine[];
  pick_tasks: PickTask[];
}

export interface OutboundLineCreate {
  product_id: number;
  uom_id: number;
  qty_ordered: number;
  constraints?: Record<string, any>;
  notes?: string;
}

export interface OutboundOrderCreateRequest {
  order_number: string;
  customer_id: number;
  order_type: string;
  priority?: number;
  requested_delivery_date?: string;
  shipping_details?: Record<string, any>;
  notes?: string;
  lines: OutboundLineCreate[];
}

export interface AllocateOrderRequest {
  strategy_id?: number;
}

export interface OutboundWave {
  id: number;
  tenant_id: number;
  wave_number: string;
  status: OutboundWaveStatus;
  strategy_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  orders: OutboundOrder[];
  pick_tasks: PickTask[];
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all allocation strategies
 */
export const getStrategies = async (): Promise<AllocationStrategy[]> => {
  const response = await api.get('/outbound/strategies');
  return response.data;
};

/**
 * Get a specific allocation strategy
 */
export const getStrategy = async (id: number): Promise<AllocationStrategy> => {
  const response = await api.get(`/outbound/strategies/${id}`);
  return response.data;
};

/**
 * List outbound orders with optional filtering
 */
export const getOrders = async (params?: {
  skip?: number;
  limit?: number;
  status?: OutboundOrderStatus;
  customer_id?: number;
  order_type?: string;
}): Promise<OutboundOrder[]> => {
  const response = await api.get('/outbound/orders', { params });
  return response.data;
};

/**
 * Get a specific outbound order with details
 */
export const getOrder = async (id: number): Promise<OutboundOrder> => {
  const response = await api.get(`/outbound/orders/${id}`);
  return response.data;
};

/**
 * Create a new outbound order
 */
export const createOrder = async (data: OutboundOrderCreateRequest): Promise<OutboundOrder> => {
  const response = await api.post('/outbound/orders', data);
  return response.data;
};

/**
 * Allocate inventory for an order
 */
export const allocateOrder = async (
  orderId: number,
  request?: AllocateOrderRequest
): Promise<OutboundOrder> => {
  const response = await api.post(`/outbound/orders/${orderId}/allocate`, request || {});
  return response.data;
};

/**
 * Release an order for picking
 */
export const releaseOrder = async (orderId: number): Promise<OutboundOrder> => {
  const response = await api.post(`/outbound/orders/${orderId}/release`);
  return response.data;
};

/**
 * Cancel an outbound order
 */
export const cancelOrder = async (orderId: number): Promise<OutboundOrder> => {
  const response = await api.post(`/outbound/orders/${orderId}/cancel`);
  return response.data;
};

/**
 * Accept shortages for an order and release it
 */
export const acceptShortages = async (orderId: number): Promise<OutboundOrder> => {
  const response = await api.post(`/outbound/orders/${orderId}/accept-shortages`);
  return response.data;
};

/**
 * Complete a pick task
 */
export const completePickTask = async (
  taskId: number,
  qtyPicked: number
): Promise<{
  task_id: number;
  qty_picked: number;
  inventory_remaining: number;
  inventory_allocated: number;
  inventory_available: number;
}> => {
  const response = await api.post(`/outbound/tasks/${taskId}/complete?qty_picked=${qtyPicked}`);
  return response.data;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Automatically find the correct strategy for an order
 * Logic: Match by customer_id and order_type, fallback to first active strategy
 */
export const getStrategyForOrder = (
  order: OutboundOrder | { customer_id: number; order_type: string },
  strategies: AllocationStrategy[]
): AllocationStrategy | null => {
  if (!strategies || strategies.length === 0) {
    return null;
  }

  // Try to find exact match (future enhancement: add customer_id/order_type to strategy)
  // For now, just return the first active strategy for the customer's typical use case
  const activeStrategies = strategies.filter(s => s.is_active);

  if (activeStrategies.length === 0) {
    return null;
  }

  // Return first active strategy (can be enhanced with more complex logic)
  return activeStrategies[0];
};

/**
 * Calculate progress percentage for an order
 */
export const calculateOrderProgress = (order: OutboundOrder): number => {
  const totalOrdered = order.lines.reduce((sum, line) => sum + Number(line.qty_ordered), 0);
  const totalAllocated = order.lines.reduce((sum, line) => sum + Number(line.qty_allocated), 0);

  if (totalOrdered === 0) return 0;
  return Math.round((totalAllocated / totalOrdered) * 100);
};

/**
 * Check if an order has shortages
 */
export const hasShortages = (order: OutboundOrder): boolean => {
  return order.lines.some(line =>
    line.line_status === 'PARTIAL' || line.line_status === 'SHORT'
  );
};

/**
 * Get status badge color
 */
export const getStatusColor = (status: OutboundOrderStatus): string => {
  const colors: Record<OutboundOrderStatus, string> = {
    DRAFT: 'gray',
    VERIFIED: 'blue',
    PLANNED: 'cyan',
    RELEASED: 'purple',
    PICKING: 'orange',
    PICKED: 'lime',
    PACKED: 'emerald',
    SHIPPED: 'green',
    CANCELLED: 'red',
  };
  return colors[status] || 'gray';
};

/**
 * Get priority label and color
 */
export const getPriorityInfo = (priority: number): { label: string; color: string } => {
  if (priority <= 2) return { label: 'Critical', color: 'red' };
  if (priority <= 4) return { label: 'High', color: 'orange' };
  if (priority <= 6) return { label: 'Medium', color: 'yellow' };
  return { label: 'Low', color: 'gray' };
};
