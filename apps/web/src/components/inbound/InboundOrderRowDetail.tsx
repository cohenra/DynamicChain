import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InboundOrder, inboundService, InboundShipment, ReceiveShipmentRequest } from '@/services/inbound';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CreateShipmentForm } from './CreateShipmentForm';
import { ReceivingConsole } from './ReceivingConsole';
import { Truck, Package as PackageIcon, Plus, ArrowDownToLine, CheckCircle2, AlertCircle, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface InboundOrderRowDetailProps {
  order: InboundOrder;
  colSpan: number;
}

export function InboundOrderRowDetail({ order: initialOrder }: InboundOrderRowDetailProps) {
  const queryClient = useQueryClient();
  
  const [isShipmentSheetOpen, setIsShipmentSheetOpen] = useState(false);
  const [activeShipmentForReceiving, setActiveShipmentForReceiving] = useState<InboundShipment | null>(null);

  // שליפת נתונים עדכניים (כולל ה-Joins של מוצרים ויחידות מידה)
  const { data: order } = useQuery({
    queryKey: ['inbound-order', initialOrder.id],
    queryFn: () => inboundService.getOrder(initialOrder.id),
    initialData: initialOrder,
  });

  // יצירת משלוח
  const createShipmentMutation = useMutation({
    mutationFn: (data: any) => inboundService.createShipment(order.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inbound-order', order.id] });
      setIsShipmentSheetOpen(false);
      toast.success("משלוח קליטה נוצר בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת משלוח")
  });

  // ביצוע קליטה
  const receiveMutation = useMutation({
    mutationFn: (data: ReceiveShipmentRequest) => inboundService.receiveShipment(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inbound-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inbound-order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); 
      setActiveShipmentForReceiving(null);
      toast.success(`נקלטו ${data.received_items} שורות בהצלחה`);
    },
    onError: () => toast.error("שגיאה בקליטה"),
  });

  // חישובים
  const totalExpected = order.lines?.reduce((acc, line) => acc + Number(line.expected_quantity), 0) || 0;
  const totalReceived = order.lines?.reduce((acc, line) => acc + Number(line.received_quantity), 0) || 0;
  const progress = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

  return (
    // חשוב: עוטף ב-DIV כדי לתפוס את כל ה-Cell של הטבלה הראשית
    <div className="w-full bg-slate-50/80 dark:bg-slate-900/50 border-t shadow-inner p-6 space-y-8">
      
      {/* --- חלק 1: לוח בקרה עליון (סיכום ופעולות) --- */}
      <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* סטטיסטיקות */}
        <div className="flex items-center gap-8 w-full md:w-auto">
           <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">התקדמות כללית</span>
              <div className="flex items-center gap-3">
                 <span className="text-2xl font-bold">{progress}%</span>
                 <Progress value={progress} className="w-32 h-2.5" />
              </div>
           </div>

           <div className="h-10 w-px bg-slate-100 hidden md:block"/>

           <div className="flex gap-8">
               <div>
                   <div className="text-xs text-muted-foreground mb-1">צפי פריטים</div>
                   <div className="text-xl font-bold text-slate-700">{totalExpected.toLocaleString()}</div>
               </div>
               <div>
                   <div className="text-xs text-muted-foreground mb-1">התקבל בפועל</div>
                   <div className="text-xl font-bold text-green-600">{totalReceived.toLocaleString()}</div>
               </div>
               <div>
                   <div className="text-xs text-muted-foreground mb-1">יתרה לקליטה</div>
                   <div className="text-xl font-bold text-orange-500">{(totalExpected - totalReceived).toLocaleString()}</div>
               </div>
           </div>
        </div>

        {/* כפתור פעולה ראשי */}
        <Button onClick={() => setIsShipmentSheetOpen(true)} size="lg" className="shadow-sm w-full md:w-auto">
            <Plus className="ml-2 h-5 w-5"/> רישום הגעה (מכולה/משאית)
        </Button>
      </div>

      {/* --- חלק 2: משלוחים פעילים (Shipments) --- */}
      {order.shipments && order.shipments.length > 0 && (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                <Truck className="h-4 w-4"/> משלוחים והגעות ({order.shipments.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="bg-white border rounded-lg p-4 hover:border-primary/40 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${shipment.status === 'CLOSED' ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800">{shipment.shipment_number}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {shipment.driver_details?.container ? `מכולה: ${shipment.driver_details.container}` : 'רכב ללא מכולה'}
                                    </div>
                                </div>
                            </div>
                            <Badge variant={shipment.status === 'CLOSED' ? 'secondary' : 'default'} className="text-[10px]">
                                {shipment.status}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded">
                             <div className="flex items-center gap-1"><User className="h-3 w-3"/> {shipment.driver_details?.name || '-'}</div>
                             <div className="flex items-center gap-1"><Calendar className="h-3 w-3"/> {shipment.arrival_date ? format(new Date(shipment.arrival_date), 'dd/MM') : '-'}</div>
                        </div>

                        {shipment.status !== 'CLOSED' ? (
                            <Button className="w-full" size="sm" onClick={() => setActiveShipmentForReceiving(shipment)}>
                                <ArrowDownToLine className="ml-2 h-4 w-4"/> קלוט סחורה
                            </Button>
                        ) : (
                            <Button variant="ghost" className="w-full bg-slate-50 cursor-default" size="sm">הסתיים</Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* --- חלק 3: טבלת הפריטים (Lines) - רחבה ומפורטת --- */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 flex items-center gap-2">
            <PackageIcon className="h-4 w-4"/> פירוט שורות הזמנה
        </h3>
        
        <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                        <TableHead className="h-10 font-bold text-slate-700">מק"ט</TableHead>
                        <TableHead className="h-10 font-bold text-slate-700">שם המוצר</TableHead>
                        <TableHead className="h-10 font-bold text-slate-700 text-center">יחידה</TableHead>
                        <TableHead className="h-10 font-bold text-slate-700 text-center">כמות בהזמנה</TableHead>
                        <TableHead className="h-10 font-bold text-slate-700 text-center">התקבל</TableHead>
                        <TableHead className="h-10 font-bold text-slate-700 text-center">נותר לקלוט</TableHead>
                        <TableHead className="h-10 font-bold text-slate-700 text-center">סטטוס</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.lines?.map((line: any) => {
                        const remaining = Number(line.expected_quantity) - Number(line.received_quantity);
                        const isComplete = remaining <= 0;

                        // חילוץ נתונים מהאובייקטים המקוננים (תיקון לתצוגה)
                        const sku = line.product?.sku || line.product_sku || '---';
                        const name = line.product?.name || line.product_name || 'טוען...';
                        const uom = line.uom?.name || line.uom_name || '-';
                        
                        return (
                            <TableRow key={line.id} className="hover:bg-blue-50/30 h-12 border-b border-slate-100">
                                <TableCell className="font-mono font-medium text-slate-700">{sku}</TableCell>
                                <TableCell className="text-slate-800">{name}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="bg-slate-50 font-normal text-slate-600">
                                        {uom}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center text-base font-semibold">{Number(line.expected_quantity)}</TableCell>
                                <TableCell className="text-center text-base font-semibold text-green-600">{Number(line.received_quantity)}</TableCell>
                                <TableCell className="text-center">
                                    {remaining > 0 ? (
                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                            {remaining}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {isComplete ? (
                                        <div className="flex justify-center items-center gap-1 text-green-600 font-medium text-sm">
                                            <CheckCircle2 className="h-4 w-4" /> הושלם
                                        </div>
                                    ) : (
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">ממתין</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {(!order.lines || order.lines.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                <PackageIcon className="h-12 w-12 mx-auto text-slate-200 mb-2"/>
                                לא נמצאו שורות בהזמנה זו
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

      {/* דיאלוג יצירת משלוח */}
      <Sheet open={isShipmentSheetOpen} onOpenChange={setIsShipmentSheetOpen}>
          <SheetContent>
              <SheetHeader>
                  <SheetTitle>יצירת משלוח קליטה חדש</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                  <CreateShipmentForm 
                      onSubmit={(data) => createShipmentMutation.mutate(data)} 
                      isLoading={createShipmentMutation.isPending}
                  />
              </div>
          </SheetContent>
      </Sheet>

      {/* מסך הקליטה המלא */}
      <Sheet open={!!activeShipmentForReceiving} onOpenChange={(open) => !open && setActiveShipmentForReceiving(null)}>
          <SheetContent side="left" className="w-full sm:max-w-2xl overflow-y-auto p-0">
              {activeShipmentForReceiving && (
                  <div className="p-6 flex flex-col h-full">
                       <SheetHeader className="mb-6 pb-4 border-b flex-none">
                          <SheetTitle className="flex items-center gap-3 text-2xl">
                              <div className="bg-primary/10 p-3 rounded-xl">
                                  <ArrowDownToLine className="h-6 w-6 text-primary"/>
                              </div>
                              <div>
                                  קליטת סחורה למלאי
                                  <div className="text-sm font-normal text-muted-foreground mt-1">
                                      משלוח: <span className="font-mono font-bold text-foreground">{activeShipmentForReceiving.shipment_number}</span>
                                  </div>
                              </div>
                          </SheetTitle>
                      </SheetHeader>
                      
                      <div className="flex-1">
                        <ReceivingConsole 
                            order={order}
                            shipment={activeShipmentForReceiving}
                            onReceive={(data) => receiveMutation.mutate(data)}
                            isLoading={receiveMutation.isPending}
                        />
                      </div>
                  </div>
              )}
          </SheetContent>
      </Sheet>
    </div>
  );
}