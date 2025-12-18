import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OutboundWave } from '@/services/outboundService';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useReactTable, getCoreRowModel, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

interface WaveRowDetailProps {
  wave: OutboundWave;
}

export function WaveRowDetail({ wave }: WaveRowDetailProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState('orders');

  const orderColumns: ColumnDef<any>[] = [
    { accessorKey: 'order_number', header: t('outbound.orderNumber', 'מספר הזמנה'), cell: ({row}) => <span className="font-medium">{row.original.order_number}</span> },
    { accessorKey: 'customer_name', header: t('outbound.customer', 'לקוח') },
    { accessorKey: 'status', header: t('outbound.status', 'סטטוס'), cell: ({row}) => <Badge variant="secondary" className="text-[10px]">{row.original.status}</Badge> },
    { accessorKey: 'lines_count', header: t('outbound.lines', 'שורות'), cell: ({row}) => <span className="text-center block">{row.original.lines?.length || 0}</span> },
  ];

  const ordersTable = useReactTable({
    data: wave.orders || [],
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const taskColumns: ColumnDef<any>[] = [
    { accessorKey: 'task_id', header: t('outbound.taskId', 'מזהה משימה') },
    { accessorKey: 'type', header: t('outbound.taskType', 'סוג פעולה') },
    { accessorKey: 'from_loc', header: t('outbound.from', 'ממקום') },
    { accessorKey: 'to_loc', header: t('outbound.to', 'למקום') },
    { accessorKey: 'status', header: t('outbound.status', 'סטטוס') },
  ];

  const tasksTable = useReactTable({
    data: [], 
    columns: taskColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full bg-slate-50/50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* הוספת dir גם כאן היא קריטית */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        
        {/* ה-justify-start ידחוף לימין בגלל ה-dir=rtl */}
        <div className="border-b border-slate-200 bg-slate-100/50 px-4 w-full">
          <TabsList className="h-10 bg-transparent p-0 w-full justify-start gap-6">
            <TabsTrigger 
              value="orders" 
              className="rounded-none border-b-2 border-transparent px-2 h-10 font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none"
            >
              {t('outbound.tabs.orders', 'שורות גל / הזמנות')} 
              <Badge variant="secondary" className="mr-2 ml-0 rtl:mr-0 rtl:ml-2 px-1.5 h-5">{wave.orders?.length || 0}</Badge>
            </TabsTrigger>
            
            <TabsTrigger 
              value="tasks" 
              className="rounded-none border-b-2 border-transparent px-2 h-10 font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none"
            >
              {t('outbound.tabs.pickTasks', 'משימות ליקוט')}
              <Badge variant="secondary" className="mr-2 ml-0 rtl:mr-0 rtl:ml-2 px-1.5 h-5">0</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-4">
          <TabsContent value="orders" className="mt-0 focus-visible:outline-none">
             <div className="rounded-md border bg-white shadow-sm">
                <SmartTable 
                  table={ordersTable} 
                  columnsLength={orderColumns.length}
                  containerClassName="border-0 shadow-none"
                  noDataMessage={t('outbound.messages.noOrders', 'אין הזמנות')}
                />
             </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-0 focus-visible:outline-none">
            <div className="rounded-md border bg-white shadow-sm">
                <SmartTable 
                  table={tasksTable} 
                  columnsLength={taskColumns.length}
                  containerClassName="border-0 shadow-none"
                  noDataMessage={t('outbound.messages.noTasks', 'טרם נוצרו משימות ליקוט לגל זה')}
                />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}