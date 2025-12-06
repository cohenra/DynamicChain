import { Routes, Route } from 'react-router-dom';
import InboundOrdersList from '@/pages/Inbound/InboundOrdersList';
import InboundOrderDetail from '@/pages/Inbound/InboundOrderDetail';

/**
 * Inbound Module Routes
 * 
 * Routes:
 * - /inbound/orders - List all inbound orders
 * - /inbound/orders/:orderId - View specific order details and receive items
 */
export function InboundRoutes() {
  return (
    <Routes>
      <Route path="orders" element={<InboundOrdersList />} />
      <Route path="orders/:orderId" element={<InboundOrderDetail />} />
    </Routes>
  );
}

/**
 * Add these routes to your main App.tsx router:
 * 
 * <Route path="/inbound/*" element={<InboundRoutes />} />
 */
