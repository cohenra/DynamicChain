import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { OutboundWave } from '@/services/outboundService';
import { CreateWaveWizard } from '@/components/outbound/CreateWaveWizard';
import { format } from 'date-fns';
import { Plus, Wand2 } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';

export default function OutboundWaves() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: waves, isLoading, refetch } = useQuery({
    queryKey: ['outbound-waves'],
    queryFn: async () => {
        const res = await api.get<OutboundWave[]>('/api/outbound/waves');
        return res.data;
    }
  });

  const handleWizardSuccess = () => {
    refetch();
  };

  const columns = useMemo<ColumnDef<OutboundWave>[]>(() => [
      {
          accessorKey: 'wave_number',
          header: t('outbound.waveNumber', 'מספר גל'),
          cell: ({ row }) => <span className="font-bold">{row.original.wave_number}</span>
      },
      {
          accessorKey: 'status',
          header: t('outbound.status'),
          cell: ({ row }) => <Badge>{t(`outbound.statuses.${row.original.status}`)}</Badge>
      },
      {
          header: t('outbound.ordersCount', 'כמות הזמנות'),
          cell: ({ row }) => row.original.orders?.length || 0
      },
      {
          accessorKey: 'created_at',
          header: t('outbound.createdDate', 'נוצר בתאריך'),
          cell: ({ row }) => format(new Date(row.original.created_at), 'dd/MM/yyyy HH:mm')
      }
  ], [t]);

  const table = useReactTable({
    data: waves || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{t('outbound.waves', 'גלי ליקוט')}</h1>
            <Button onClick={() => setWizardOpen(true)} className="gap-2">
                <Wand2 className="w-4 h-4" />
                {t('outbound.createWave', 'צור גל חדש')}
            </Button>
        </div>
        <SmartTable
            table={table}
            columnsLength={columns.length}
            isLoading={isLoading}
            searchValue={globalFilter}
            onSearchChange={setGlobalFilter}
            noDataMessage={t('common.noData')}
        />

        {/* Create Wave Wizard */}
        <CreateWaveWizard
            open={wizardOpen}
            onOpenChange={setWizardOpen}
            onSuccess={handleWizardSuccess}
        />
    </div>
  );
}