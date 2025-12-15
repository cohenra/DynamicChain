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
import { Plus, Search, Filter, RefreshCw, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { CreateWaveWizard } from '@/components/outbound/CreateWaveWizard';
import { WaveRowDetail } from '@/components/outbound/WaveRowDetail';
import { getWaves, OutboundWave } from '@/services/outboundService';

export default function OutboundWaves() {
  const { t, i18n } = useTranslation();
  const [globalFilter, setGlobalFilter] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const { data: waves, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['outbound-waves'],
    queryFn: getWaves,
  });

  const columns = useMemo<ColumnDef<OutboundWave>[]>(
    () => [
      {
        id: 'expander',
        size: 40,
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 hover:bg-slate-200 rounded-full"
            onClick={row.getToggleExpandedHandler()}
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
          return <Badge variant="outline" className={`${color} font-normal`}>{status}</Badge>;
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
          // If orders exists (thanks to backend schema fix), sum lines
          const lines = row.original.orders?.reduce((acc, o) => acc + (o.lines?.length || 0), 0) || 0;
          return <div className="text-center">{lines}</div>;
        },
      },
      {
        id: 'items_progress',
        header: t('outbound.pickingProgress'),
        cell: ({ row }) => {
          // Calculate stats safely
          const totalItems = row.original.orders?.reduce((acc, o) => acc + o.lines?.reduce((lAcc, l) => lAcc + Number(l.qty_ordered), 0), 0) || 0;
          // Note: picked qty might need to come from tasks if lines aren't updated yet, but assuming lines have qty_picked
          const pickedItems = row.original.orders?.reduce((acc, o) => acc + o.lines?.reduce((lAcc, l) => lAcc + Number(l.qty_picked || 0), 0), 0) || 0;
          
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
    data: waves || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="space-y-6 h-full flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">{t('outbound.wavesTitle')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsWizardOpen(true)}>
            <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
            {t('outbound.createWave')}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground rtl:right-2.5 rtl:left-auto" />
          <Input
            placeholder={t('common.search')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 rtl:pr-9 rtl:pl-3"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto min-h-0 border rounded-md bg-white">
        <SmartTable
          table={table}
          columnsLength={columns.length}
          isLoading={isLoading}
          renderSubComponent={({ row }) => <WaveRowDetail wave={row.original} />}
          className="border-0"
          noDataMessage={t('outbound.messages.noWaves')}
        />
      </div>

      <CreateWaveWizard 
        open={isWizardOpen} 
        onOpenChange={setIsWizardOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}