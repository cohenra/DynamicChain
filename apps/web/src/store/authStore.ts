import { create } from 'zustand';
import { authService, LoginRequest } from '@/services/auth';

interface AuthState {
  isAuthenticated: boolean;
  userId: number | null;
  tenantId: number | null;
  role: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('access_token'),
  userId: null,
  tenantId: null,
  role: null,

  login: async (credentials: LoginRequest) => {
    const response = await authService.login(credentials);
    localStorage.setItem('access_token', response.access_token);
    set({
      isAuthenticated: true,
      userId: response.user_id,
      tenantId: response.tenant_id,
      role: response.role,
    });
  },

  logout: () => {
    authService.logout();
    set({
      isAuthenticated: false,
      userId: null,
      tenantId: null,
      role: null,
    });
  },

  checkAuth: () => {
    const token = localStorage.getItem('access_token');
    set({ isAuthenticated: !!token });
  },
}));
