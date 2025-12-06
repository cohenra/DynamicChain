import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inboundService, InboundOrder } from '@/services/inbound';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronLeft, Truck, Calendar, User } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  ColumnDef,
  SortingState,
  ExpandedState,
} from '@tanstack/react-table';
import { SmartTable } from '@/components/ui/data-table/SmartTable';
import { useTableSettings } from '@/hooks/use-table-settings';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CreateOrderForm } from '@/components/inbound/CreateOrderForm';
import { InboundOrderRowDetail } from '@/components/inbound/InboundOrderRowDetail';
import { toast } from 'sonner';

export default function InboundOrdersPage() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const { pagination, onPaginationChange, columnVisibility, onColumnVisibilityChange } = 
    useTableSettings({ tableName: 'inbound_orders_table' });

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['inbound-orders'],
    queryFn: inboundService.getOrders,
  });

  const columns = useMemo<ColumnDef<InboundOrder>[]>(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
          className="h-8 w-8 p-0 hover:bg-primary/10"
        >
          {row.getIsExpanded() ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronLeft className="h-5 w-5 text-slate-400" />}
        </Button>
      ),
      size: 40,
    },
    {
      accessorKey: 'order_number',
      header: 'מספר הזמנה',
      cell: ({ row }) => <span className="font-bold text-lg text-primary">{row.original.order_number}</span>
    },
    {
      accessorKey: 'order_type',
      header: 'סוג',
      cell: ({ row }) => {
        const typeMap: Record<string, string> = {
            'PURCHASE_ORDER': 'הזמנת רכש',
            'ASN': 'ASN',
            'CUSTOMER_RETURN': 'החזרת לקוח',
            'TRANSFER_IN': 'העברה'
        };
        return <Badge variant="outline" className="font-normal bg-white">{typeMap[row.original.order_type] || row.original.order_type}</Badge>;
      }
    },
    {
      accessorKey: 'supplier_name',
      header: 'ספק / לקוח',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{row.original.supplier_name || '-'}</span>
        </div>
      )
    },
    {
      accessorKey: 'expected_delivery_date',
      header: 'תאריך צפוי',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>
                {row.original.expected_delivery_date 
                    ? format(new Date(row.original.expected_delivery_date), 'dd/MM/yyyy') 
                    : '-'}
            </span>
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'סטטוס',
      cell: ({ row }) => {
        const s = row.original.status;
        let color: "default" | "secondary" | "destructive" | "outline" = "outline";
        let label = s;

        if (s === 'DRAFT') { color = 'secondary'; label = 'טיוטה'; }
        if (s === 'CONFIRMED') { color = 'default'; label = 'מאושר'; }
        if (s === 'PARTIALLY_RECEIVED') { color = 'default'; label = 'בקבלה'; }
        if (s === 'COMPLETED') { color = 'outline'; label = 'הושלם'; }
        
        return <Badge variant={color}>{label}</Badge>;
      }
    },
  ], []);

  const table = useReactTable({
    data: orders || [],
    columns,
    state: { sorting, globalFilter, pagination, columnVisibility, expanded },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">הזמנות וקליטה (Inbound)</h1>
        <p className="text-muted-foreground mt-2">ניהול הזמנות רכש, משלוחי קליטה וניהול מלאי נכנס</p>
      </div>

      <SmartTable
        table={table}
        columnsLength={columns.length}
        isLoading={isLoading}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        noDataMessage="אין הזמנות רכש פתוחות"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="ml-2 h-4 w-4" />
            הזמנה חדשה
          </Button>
        }
        // --- כאן התיקון: אנחנו מחזירים div שתופס את כל ה-Cell ---
        renderSubComponent={({ row }) => (
            <div className="w-full bg-gray-50/50 dark:bg-gray-900/50">
                <InboundOrderRowDetail order={row.original} />
            </div>
        )}
      />

      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="left" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
                <SheetTitle>יצירת הזמנה חדשה</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
                <CreateOrderForm 
                    onSubmit={async (data) => {
                        await inboundService.createOrder(data);
                        setIsCreateOpen(false);
                        refetch();
                        toast.success("ההזמנה נוצרה בהצלחה");
                    }} 
                />
            </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}