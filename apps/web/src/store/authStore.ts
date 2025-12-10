import { create } from 'zustand';
import { authService, LoginRequest } from '@/services/auth';

interface AuthState {
  isAuthenticated: boolean;
  userId: number | null;
  tenantId: number | null;
  role: string | null;
  warehouseId: number | null; // <-- הוסף
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('access_token'),
  userId: null,
  tenantId: null,
  role: null,
  warehouseId: null, // <-- הוסף

  login: async (credentials: LoginRequest) => {
    const response = await authService.login(credentials);
    localStorage.setItem('access_token', response.access_token);
    
    // שמירת מחסן ב-LocalStorage אם קיים
    if (response.warehouse_id) {
        localStorage.setItem('warehouse_id', response.warehouse_id.toString());
    }

    set({
      isAuthenticated: true,
      userId: response.user_id,
      tenantId: response.tenant_id,
      role: response.role,
      warehouseId: response.warehouse_id, // <-- הוסף
    });
  },

  logout: () => {
    authService.logout();
    localStorage.removeItem('warehouse_id'); // ניקוי
    set({
      isAuthenticated: false,
      userId: null,
      tenantId: null,
      role: null,
      warehouseId: null,
    });
  },

  checkAuth: () => {
    const token = localStorage.getItem('access_token');
    const warehouseId = localStorage.getItem('warehouse_id');
    set({ 
        isAuthenticated: !!token,
        warehouseId: warehouseId ? parseInt(warehouseId) : null 
    });
  },
}));