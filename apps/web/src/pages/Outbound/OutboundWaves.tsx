import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  ColumnDef,
} from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { 
  Plus, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Trash2 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { CreateWaveWizard } from '@/components/outbound/CreateWaveWizard';
import { WaveRowDetail } from '@/components/outbound/WaveRowDetail';
import { getWaves, OutboundWave } from '@/services/outboundService';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OutboundWaves() {
  const { t, i18n } = useTranslation();
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [rowSelection, setRowSelection] = useState({});
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [expanded, setExpanded] = useState({}); // הוספת State חסר לניהול הרחבה
  
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const { data: waves, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['outbound-waves'],
    queryFn: getWaves,
  });

  const filteredWaves = useMemo(() => {
    if (!waves) return [];
    if (activeTab === 'all') return waves;
    return waves.filter((wave) => wave.status.toLowerCase() === activeTab.toLowerCase());
  }, [waves, activeTab]);

  const columns = useMemo<ColumnDef<OutboundWave>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={t('common.selectAll')}
            className="mx-1 translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t('common.selectRow')}
            className="mx-1 translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: 'expander',
        size: 40,
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 hover:bg-slate-200 rounded-full"
            onClick={(e) => {
              e.stopPropagation(); // תיקון קריטי: מניעת התנגשות עם לחיצה על השורה
              row.toggleExpanded();
            }}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : isRTL ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ),
      },
      {
        accessorKey: 'wave_number',
        header: t('outbound.waveNumber'),
        cell: ({ row }) => <span className="font-bold text-primary">{row.original.wave_number}</span>,
      },
      {
        accessorKey: 'status',
        header: t('outbound.status'),
        cell: ({ row }) => {
          const status = row.original.status;
          let color = 'bg-slate-100 text-slate-800 border-slate-200';
          if (status === 'PLANNING') color = 'bg-yellow-50 text-yellow-700 border-yellow-200';
          if (status === 'ALLOCATED') color = 'bg-blue-50 text-blue-700 border-blue-200';
          if (status === 'RELEASED') color = 'bg-green-50 text-green-700 border-green-200';
          
          const statusLabel = t(`outbound.waves.status.${status.toLowerCase()}`, status);
          return <Badge variant="outline" className={`${color} font-normal`}>{statusLabel}</Badge>;
        },
      },
      {
        id: 'orders_count',
        header: t('outbound.ordersCount'),
        cell: ({ row }) => <div className="text-center font-medium">{row.original.orders?.length || 0}</div>,
      },
      {
        id: 'lines_count',
        header: t('outbound.linesCount'),
        cell: ({ row }) => {
          // תיקון קריטי: שימוש ב- || [] למניעת שגיאות אם lines חסר
          const lines = row.original.orders?.reduce((acc, o) => acc + (o.lines?.length || 0), 0) || 0;
          return <div className="text-center">{lines}</div>;
        },
      },
      {
        id: 'items_progress',
        header: t('outbound.pickingProgress'),
        cell: ({ row }) => {
          // תיקון קריטי: הגנה מפני NaN כאשר מערך השורות חסר
          const totalItems = row.original.orders?.reduce((acc, o) => acc + (o.lines || []).reduce((lAcc, l) => lAcc + Number(l.qty_ordered || 0), 0), 0) || 0;
          const pickedItems = row.original.orders?.reduce((acc, o) => acc + (o.lines || []).reduce((lAcc, l) => lAcc + Number(l.qty_picked || 0), 0), 0) || 0;
          
          // הגנה מפני חלוקה באפס
          const percent = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0;
          
          return (
            <div className="w-[120px] space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{pickedItems}/{totalItems}</span>
                <span>{percent}%</span>
              </div>
              <Progress value={percent} className="h-1.5" />
            </div>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: t('outbound.createdAt'),
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{format(new Date(row.original.created_at), 'dd/MM/yy HH:mm')}</span>,
      },
    ],
    [t, isRTL]
  );

  const table = useReactTable({
    data: filteredWaves,
    columns,
    state: { 
      globalFilter,
      rowSelection, 
      expanded // חיבור ה-State לטבלה
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded, // עדכון ה-State בעת שינוי
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    getRowId: (row) => row.id.toString(),
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-6 h-full flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('outbound.wavesTitle')}</h1>
        <p className="text-muted-foreground">{t('outbound.waves.description')}</p>
      </div>

      <div className="flex-1 overflow-auto min-h-0 bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          <SmartTable
            table={table}
            columnsLength={columns.length}
            isLoading={isLoading}
            searchKey="wave_number"
            searchValue={globalFilter}
            onSearchChange={setGlobalFilter}
            
            children={
              <TabsList className="h-8 bg-transparent p-0 w-full justify-start mx-2">
                 {['all', 'planning', 'allocated', 'released', 'completed'].map((status) => (
                   <TabsTrigger 
                      key={status}
                      value={status} 
                      className="data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900 px-3 h-7 text-xs rounded-sm mx-1 border border-transparent data-[state=active]:border-slate-300"
                   >
                      {t(status === 'all' ? 'common.all' : `outbound.waves.status.${status}`, status)}
                   </TabsTrigger>
                 ))}
              </TabsList>
            }

            actions={
              selectedCount > 0 ? (
                <div className="flex items-center gap-2">
                   <Button size="sm" variant="default" className="h-8">
                    <Play className="mr-2 h-3 w-3 rtl:ml-2 rtl:mr-0" />
                    {t('outbound.allocateSelected')}
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8">
                    <Trash2 className="mr-2 h-3 w-3 rtl:ml-2 rtl:mr-0" />
                    {t('common.delete')}
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isRefetching}
                    className="h-8"
                  >
                    <RefreshCw className={`mr-2 h-3 w-3 rtl:ml-2 rtl:mr-0 ${isRefetching ? 'animate-spin' : ''}`} />
                    {t('common.refresh')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsWizardOpen(true)}
                    className="h-8"
                  >
                    <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                    {t('outbound.createWave')}
                  </Button>
                </>
              )
            }
            
            renderSubComponent={({ row }) => <WaveRowDetail wave={row.original} />}
            className="border-0"
            noDataMessage={t('outbound.messages.noWaves')}
          />
        </Tabs>
      </div>

      <CreateWaveWizard 
        open={isWizardOpen} 
        onOpenChange={setIsWizardOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}