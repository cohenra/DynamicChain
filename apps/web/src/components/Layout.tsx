import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  Package, 
  Warehouse, 
  FileText, 
  LayoutDashboard, 
  Users, 
  Building2, 
  Boxes, 
  TruckIcon, 
  Send,
  Layers,
  Settings,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const { t, i18n } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: t('layout.dashboard'), path: '/' },
    { icon: Boxes, label: t('layout.inventory'), path: '/inventory' },
    { icon: TruckIcon, label: t('layout.inbound'), path: '/inbound' },
    { icon: Send, label: t('outbound.title') || 'הזמנות יציאה', path: '/outbound' },
    { icon: Layers, label: 'גלי ליקוט', path: '/outbound/waves' },
    { icon: Settings, label: 'אסטרטגיות', path: '/outbound/strategies' },
    { icon: Package, label: t('layout.products'), path: '/products' },
    { icon: Users, label: t('layout.depositors'), path: '/depositors' },
    { icon: Building2, label: t('layout.warehouses'), path: '/warehouses' },
    { icon: Warehouse, label: t('layout.locations'), path: '/locations' },
    { icon: FileText, label: t('layout.invoices'), path: '/invoices' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header dir="ltr" className="bg-white border-b border-gray-200 h-16 flex items-center px-6 shrink-0 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-primary tracking-tight">LogiSnap</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-red-600">
              <LogOut className="ml-2 h-4 w-4" />
              {t('auth.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Sidebar */}
        <aside 
          className={cn(
            "bg-white border-l border-gray-200 hidden md:flex flex-col transition-all duration-300 ease-in-out relative",
            isCollapsed ? "w-16" : "w-64"
          )}
        >
          {/* Toggle Button */}
          <div className="absolute top-3 -left-3 z-20 rtl:left-auto rtl:-right-3">
             <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 rounded-full shadow-md bg-white border-gray-200 hover:bg-gray-100 p-0"
                onClick={() => setIsCollapsed(!isCollapsed)}
             >
                {isCollapsed ? (
                    isRTL ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                ) : (
                    isRTL ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />
                )}
             </Button>
          </div>

          <nav className="space-y-2 p-2 flex-1 overflow-y-auto">
            <TooltipProvider delayDuration={0}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Tooltip key={item.path} disabled={!isCollapsed}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate(item.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group relative overflow-hidden",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                          isCollapsed && "justify-center px-0"
                        )}
                      >
                        <Icon className={cn(
                            "h-5 w-5 shrink-0 transition-transform duration-200", 
                            isActive && "scale-110"
                        )} />
                        
                        {!isCollapsed && (
                          <span className={cn(
                              "whitespace-nowrap transition-opacity duration-300",
                              isCollapsed ? "opacity-0 w-0" : "opacity-100 flex-1 text-start"
                          )}>
                            {item.label}
                          </span>
                        )}
                        
                        {isActive && !isCollapsed && (
                            <div className="absolute left-0 rtl:left-auto rtl:right-0 top-0 bottom-0 w-1 bg-primary rounded-r-full rtl:rounded-r-none rtl:rounded-l-full" />
                        )}
                      </button>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side={isRTL ? "left" : "right"} className="font-medium bg-slate-800 text-white border-0">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </nav>
          
          {/* Footer of Sidebar (Optional - e.g. User info) */}
          {!isCollapsed && (
             <div className="p-4 border-t text-xs text-center text-muted-foreground">
                v1.0.0
             </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto w-full bg-slate-50/50">
          <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}