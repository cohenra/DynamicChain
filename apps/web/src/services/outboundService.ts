import { api } from './api';

// ============================================================================
// Types & Interfaces
// ============================================================================

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

export type WaveType =
  | 'ECOMMERCE_DAILY'
  | 'ECOMMERCE_EXPRESS'
  | 'B2B_STANDARD'
  | 'B2B_URGENT'
  | 'WHOLESALE'
  | 'RETAIL_REPLENISHMENT'
  | 'PERISHABLE'
  | 'CUSTOM';

export interface AllocationStrategy {
  id: number;
  tenant_id: number;
  depositor_id: number | null;
  name: string;
  picking_type: PickingType;
  wave_type: WaveType | null;
  rules_config: any;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaveTypeOption {
  wave_type: WaveType;
  strategy_id: number;
  strategy_name: string;
  description: string | null;
  picking_policy: string | null;
}

export interface WaveSimulationCriteria {
  delivery_date_from?: string | null;
  delivery_date_to?: string | null;
  customer_id?: number | null;
  order_type?: string | null;
  priority?: number | null;
}

export interface WaveSimulationRequest {
  wave_type: WaveType;
  criteria: WaveSimulationCriteria;
}

export interface OrderSimulationSummary {
  id: number;
  order_number: string;
  customer_name: string;
  order_type: string;
  priority: number;
  requested_delivery_date: string | null;
  lines_count: number;
  total_qty: number;
}

export interface WaveSimulationResponse {
  matched_orders_count: number;
  total_lines: number;
  total_qty: number;
  orders: OrderSimulationSummary[];
  resolved_strategy_id: number;
  resolved_strategy_name: string;
  wave_type: WaveType;
}

export interface CreateWaveWithCriteriaRequest {
  wave_name?: string | null;
  wave_type: WaveType;
  criteria: WaveSimulationCriteria;
  order_ids: number[];
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
  metrics: Record<string, any>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    name: string;
    code: string;
  };
  wave?: {  // <-- Added
      id: number;
      wave_number: string;
      status: string;
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

export interface CreateWaveRequest {
    order_ids: number[];
}

export interface OutboundWave {
  id: number;
  tenant_id: number;
  wave_number: string;
  status: OutboundWaveStatus;
  strategy_id: number | null;
  created_at: string;
  updated_at: string;
  orders: OutboundOrder[];
  pick_tasks: PickTask[];
}

// ============================================================================
// API Functions
// ============================================================================

export const getStrategies = async (): Promise<AllocationStrategy[]> => {
  const response = await api.get('/api/outbound/strategies');
  return response.data;
};

export const getStrategy = async (id: number): Promise<AllocationStrategy> => {
  const response = await api.get(`/api/outbound/strategies/${id}`);
  return response.data;
};

export const getOrders = async (params?: {
  skip?: number;
  limit?: number;
  status?: OutboundOrderStatus;
  customer_id?: number;
  order_type?: string;
}): Promise<OutboundOrder[]> => {
  const response = await api.get('/api/outbound/orders', { params });
  return response.data;
};

export const getOrder = async (id: number): Promise<OutboundOrder> => {
  const response = await api.get(`/api/outbound/orders/${id}`);
  return response.data;
};

export const createOrder = async (data: OutboundOrderCreateRequest): Promise<OutboundOrder> => {
  const response = await api.post('/api/outbound/orders', data);
  return response.data;
};

export const allocateOrder = async (
  orderId: number,
  request?: AllocateOrderRequest
): Promise<OutboundOrder> => {
  const response = await api.post(`/api/outbound/orders/${orderId}/allocate`, request || {});
  return response.data;
};

export const releaseOrder = async (orderId: number): Promise<OutboundOrder> => {
  const response = await api.post(`/api/outbound/orders/${orderId}/release`);
  return response.data;
};

export const cancelOrder = async (orderId: number): Promise<OutboundOrder> => {
  const response = await api.post(`/api/outbound/orders/${orderId}/cancel`);
  return response.data;
};

export const acceptShortages = async (orderId: number): Promise<OutboundOrder> => {
  const response = await api.post(`/api/outbound/orders/${orderId}/accept-shortages`);
  return response.data;
};

// --- Wave Management Functions ---

export const createWave = async (data: CreateWaveRequest): Promise<OutboundWave> => {
    const response = await api.post('/api/outbound/waves', data);
    return response.data;
};

export const getWaves = async (): Promise<OutboundWave[]> => {
    const response = await api.get('/api/outbound/waves');
    return response.data;
};

// --- Wave Wizard Functions ---

export const getWaveTypes = async (): Promise<WaveTypeOption[]> => {
    const response = await api.get('/api/outbound/wave-types');
    return response.data;
};

export const simulateWave = async (
    request: WaveSimulationRequest
): Promise<WaveSimulationResponse> => {
    const response = await api.post('/api/outbound/waves/simulate', request);
    return response.data;
};

export const createWaveWithWizard = async (
    request: CreateWaveWithCriteriaRequest
): Promise<OutboundWave> => {
    const response = await api.post('/api/outbound/waves/wizard', request);
    return response.data;
};

// --- Task Management Functions ---

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
  const response = await api.post(`/api/outbound/tasks/${taskId}/complete?qty_picked=${qtyPicked}`);
  return response.data;
};

// ============================================================================
// Helper Functions
// ============================================================================

export const getStrategyForOrder = (
  order: OutboundOrder | { customer_id: number; order_type: string },
  strategies: AllocationStrategy[]
): AllocationStrategy | null => {
  if (!strategies || strategies.length === 0) return null;
  
  // 1. Try to match by depositor
  const depositorStrategy = strategies.find((s) => s.depositor_id === order.customer_id);
  if (depositorStrategy) return depositorStrategy;

  // 2. Fallback: Return first active
  const activeStrategies = strategies.filter(s => s.is_active);
  return activeStrategies.length > 0 ? activeStrategies[0] : null;
};

export const calculateOrderProgress = (order: OutboundOrder): number => {
  if (order.metrics?.progress_percent !== undefined) {
      return order.metrics.progress_percent;
  }
  
  if (!order.lines || order.lines.length === 0) return 0;

  const totalOrdered = order.lines.reduce((sum, line) => sum + Number(line.qty_ordered), 0);
  const totalAllocated = order.lines.reduce((sum, line) => sum + Number(line.qty_allocated), 0);

  if (totalOrdered === 0) return 0;
  return Math.round((totalAllocated / totalOrdered) * 100);
};

export const hasShortages = (order: OutboundOrder): boolean => {
  if (!order.lines) return false;
  return order.lines.some(line =>
    line.line_status === 'PARTIAL' || line.line_status === 'SHORT' || 
    (line.qty_allocated < line.qty_ordered)
  );
};

export const getStatusColor = (status: OutboundOrderStatus): string => {
  const colors: Record<OutboundOrderStatus, string> = {
    DRAFT: 'slate',
    VERIFIED: 'blue',
    PLANNED: 'cyan',
    RELEASED: 'purple',
    PICKING: 'yellow',
    PICKED: 'orange',
    PACKED: 'pink',
    SHIPPED: 'green',
    CANCELLED: 'red',
  };
  return colors[status] || 'slate';
};

export const getPriorityInfo = (priority: number): { label: string; color: string } => {
  if (priority <= 1) return { label: 'CRITICAL', color: 'red' };
  if (priority <= 2) return { label: 'HIGH', color: 'orange' };
  if (priority <= 3) return { label: 'MEDIUM', color: 'blue' };
  return { label: 'LOW', color: 'slate' };
};