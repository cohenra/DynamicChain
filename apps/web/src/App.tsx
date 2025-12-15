import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';

// --- Pages ---
import InventoryPage from './pages/Inventory'; 
import InboundOrders from './pages/Inbound/InboundOrders';
import Products from './pages/Products'; 
import Depositors from './pages/Depositors';
import Warehouses from './pages/Warehouses';
// import Locations - הוסר לבקשתך
import Invoices from './pages/Billing/Invoices'; 

// --- Outbound Components ---
import OutboundOrders from './pages/OutboundOrders'; // <--- וודא שזה מיובא
import OutboundWaves from './pages/Outbound/OutboundWaves';
import OutboundWaveDetails from './pages/Outbound/OutboundWaveDetails';
import OutboundStrategies from './pages/Outbound/AllocationStrategies'; 

import { useAuthStore } from './store/authStore';
import './i18n';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.dir = i18n.language === 'he' || i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inbound" element={<InboundOrders />} />
            <Route path="products" element={<Products />} />
            <Route path="depositors" element={<Depositors />} />
            <Route path="warehouses" element={<Warehouses />} />
            
            <Route path="locations" element={<div className="p-8 text-center text-muted-foreground">ניהול מיקומים מתבצע דרך מסך המחסנים</div>} />
            <Route path="invoices" element={<div className="p-8 text-center text-muted-foreground">מודול חשבוניות - בפיתוח</div>} />
            
            {/* Outbound Routes */}
            {/* FIX: Removed Redirect, restored OutboundOrders page */}
            <Route path="outbound" element={<OutboundOrders />} />
            <Route path="outbound/waves" element={<OutboundWaves />} />
            <Route path="outbound/waves/:id" element={<OutboundWaveDetails />} />
            <Route path="outbound/strategies" element={<OutboundStrategies />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}