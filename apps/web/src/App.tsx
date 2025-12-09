import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Depositors from './pages/Depositors';
import Warehouses from './pages/Warehouses';
import InventoryPage from './pages/Inventory';
import InboundOrders from './pages/Inbound/InboundOrders';
import OutboundOrders from './pages/OutboundOrders';
// --- הוספת הדפים החדשים ---
import OutboundWaves from './pages/Outbound/OutboundWaves';
import AllocationStrategies from './pages/Outbound/AllocationStrategies';
// -------------------------
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            
            {/* ניהול מלאי ומוצרים */}
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="products" element={<Products />} />
            <Route path="depositors" element={<Depositors />} />
            <Route path="warehouses" element={<Warehouses />} />
            
            {/* כניסה */}
            <Route path="inbound" element={<InboundOrders />} />
            
            {/* יציאה - הוספת המסכים החדשים */}
            <Route path="outbound" element={<OutboundOrders />} />
            <Route path="outbound/waves" element={<OutboundWaves />} />
            <Route path="outbound/strategies" element={<AllocationStrategies />} />
            
            <Route path="invoices" element={<div className="text-center p-8">חשבוניות - בפיתוח</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;