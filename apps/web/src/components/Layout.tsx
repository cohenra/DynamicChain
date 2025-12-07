import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { LogOut, Package, Warehouse, FileText, LayoutDashboard, Users, Building2, Boxes, TruckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Layout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: t('layout.dashboard'), path: '/' },
    { icon: Boxes, label: t('layout.inventory'), path: '/inventory' },
    { icon: TruckIcon, label: t('layout.inbound'), path: '/inbound' },
    { icon: Package, label: t('layout.products'), path: '/products' },
    { icon: Users, label: t('layout.depositors'), path: '/depositors' },
    { icon: Building2, label: t('layout.warehouses'), path: '/warehouses' },
    { icon: Warehouse, label: t('layout.locations'), path: '/locations' },
    { icon: FileText, label: t('layout.invoices'), path: '/invoices' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header dir="ltr" className="bg-white border-b border-gray-200 h-16 flex items-center px-6 shrink-0 sticky top-0 z-50">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-xl font-bold text-primary">{t('layout.appName')}</h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="ml-2 h-4 w-4" />
              {t('auth.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-l border-gray-200 p-4 hidden md:block overflow-y-auto">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg hover:bg-gray-100 transition-colors text-right"
                >
                  <Icon className="h-5 w-5 ml-auto" />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content - Fix: Limit width to prevent page horizontal scroll */}
        <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto w-full max-w-[100vw] md:max-w-[calc(100vw-16rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}