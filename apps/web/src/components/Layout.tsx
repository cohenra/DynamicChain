import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { LogOut, Package, Warehouse, FileText, LayoutDashboard } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'דשבורד', path: '/' },
    { icon: Package, label: 'מוצרים', path: '/products' },
    { icon: Warehouse, label: 'מיקומים', path: '/locations' },
    { icon: FileText, label: 'חשבוניות', path: '/invoices' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-xl font-bold text-primary">LogiSnap</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="ml-2 h-4 w-4" />
            התנתק
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - positioned on the right for RTL */}
        <aside className="w-64 bg-white border-l border-gray-200 min-h-[calc(100vh-4rem)] p-4">
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

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
