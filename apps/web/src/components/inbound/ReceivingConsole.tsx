import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { InboundOrder, InboundShipment, ReceiveShipmentRequest } from '@/services/inbound';
import { locationService } from '@/services/locations';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, Package, AlertTriangle, CheckCircle2, Calendar, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner'; // הוספתי Toast לטיפול בשגיאות מקומי

interface ReceivingItem {
  product_id: number;
  product_sku: string;
  product_name: string;
  uom_id: number;
  uom_name: string;
  remaining_quantity: number;
  quantity_to_receive: string;
  location_id: string;
  lpn: string;
  batch_number: string;
  expiry_date: string;
}

interface ReceivingConsoleProps {
  order: InboundOrder;
  shipment: InboundShipment;
  onReceive: (data: ReceiveShipmentRequest) => void;
  isLoading: boolean;
}

export function ReceivingConsole({ order, shipment, onReceive, isLoading }: ReceivingConsoleProps) {
  const { t } = useTranslation();

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getLocations({ limit: 1000 }),
  });

  const [items, setItems] = useState<ReceivingItem[]>(() => {
    return (order.lines || [])
      .filter(line => (line.expected_quantity - line.received_quantity) > 0)
      .map(line => ({
        product_id: line.product_id,
        // שימוש ב-optional chaining כדי למנוע קריסה אם הנתונים חסרים
        product_sku: line.product?.sku || line.product_sku || '',
        product_name: line.product?.name || line.product_name || 'טוען...',
        uom_id: line.uom_id,
        uom_name: line.uom?.name || line.uom_name || '',
        remaining_quantity: line.expected_quantity - line.received_quantity,
        quantity_to_receive: '',
        location_id: '',
        lpn: '',
        batch_number: '',
        expiry_date: '',
      }));
  });

  const updateItem = (index: number, field: keyof ReceivingItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    try {
        console.log("Starting Submit Process...");

        const itemsToReceive = items.filter(item => {
        const qty = parseFloat(item.quantity_to_receive);
        return !isNaN(qty) && qty > 0;
        });

        if (itemsToReceive.length === 0) {
        toast.error("לא הוזנו כמויות לקליטה");
        return;
        }

        const invalidItem = itemsToReceive.find(item => !item.location_id);
        if (invalidItem) {
        toast.error(`חובה לבחור מיקום עבור ${invalidItem.product_name}`);
        return;
        }

        const payload: ReceiveShipmentRequest = {
        shipment_id: shipment.id,
        items: itemsToReceive.map(item => ({
            product_id: item.product_id,
            uom_id: item.uom_id,
            quantity: parseFloat(item.quantity_to_receive),
            location_id: parseInt(item.location_id),
            lpn: item.lpn || undefined,
            batch_number: item.batch_number || undefined,
            expiry_date: item.expiry_date ? new Date(item.expiry_date) : undefined,
        }))
        };
        
        console.log("Payload ready, calling onReceive:", payload);
        // קריאה לפונקציה שהועברה מהאבא
        onReceive(payload);
        
    } catch (error) {
        console.error("Error in handleSubmit:", error);
        toast.error("אירעה שגיאה בעיבוד הנתונים");
    }
  };

  if (items.length === 0) {
    return (
        <div className="text-center py-12 bg-green-50 rounded-lg border border-green-100 h-full flex flex-col justify-center items-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-green-700">הכל הושלם!</h3>
            <p className="text-green-600">כל הפריטים בהזמנה זו נקלטו במלואם.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pr-2">
          {items.map((item, index) => {
            const qtyVal = parseFloat(item.quantity_to_receive) || 0;
            const isFilled = qtyVal > 0;
            const isOver = qtyVal > item.remaining_quantity;

            return (
                <Card key={item.product_id} className={`border-2 transition-all mb-4 ${isFilled ? 'border-blue-500 shadow-md' : 'border-slate-200'}`}>
                    <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4 border-b pb-3">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{item.product_name}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="outline" className="text-sm font-mono bg-slate-100">{item.product_sku}</Badge>
                                    <Badge variant="secondary" className="text-sm">{item.uom_name}</Badge>
                                </div>
                            </div>
                            <div className="text-center bg-slate-50 p-2 rounded-lg border min-w-[80px]">
                                <div className="text-xs text-muted-foreground">נותר</div>
                                <div className="text-2xl font-bold text-slate-700">{item.remaining_quantity}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-3">
                                <label className="text-sm font-medium mb-1.5 block">כמות לקליטה</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        className={`h-14 text-2xl font-bold text-center ${isOver ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-300'}`}
                                        placeholder="0"
                                        value={item.quantity_to_receive}
                                        onChange={(e) => updateItem(index, 'quantity_to_receive', e.target.value)}
                                        min={0}
                                    />
                                    {isOver && (
                                        <div className="absolute -bottom-6 right-0 text-xs text-red-600 flex items-center gap-1 font-bold">
                                            <AlertTriangle className="h-3 w-3"/> חריגה!
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-4">
                                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                                    <MapPin className="h-4 w-4"/> מיקום יעד
                                </label>
                                <Select
                                    value={item.location_id}
                                    onValueChange={(val) => updateItem(index, 'location_id', val)}
                                >
                                    <SelectTrigger className="h-14 text-lg">
                                        <SelectValue placeholder="בחר מיקום..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {locations?.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id.toString()}>
                                                {loc.name} <span className="text-muted-foreground text-xs">({loc.zone_name || 'No Zone'})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-5">
                                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1 text-muted-foreground">
                                    <Package className="h-4 w-4"/> LPN (אופציונלי)
                                </label>
                                <Input
                                    placeholder="סרוק או השאר ריק"
                                    className="h-14 font-mono text-lg"
                                    value={item.lpn}
                                    onChange={(e) => updateItem(index, 'lpn', e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
          })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-2xl z-50 flex justify-end items-center gap-6 px-8">
          <div className="text-sm text-muted-foreground">
              שורות לקליטה: <strong>{items.filter(i => parseFloat(i.quantity_to_receive) > 0).length}</strong>
          </div>
          <Button
            type="button" // חשוב: מונע שליחת טופס לא רצוי
            onClick={handleSubmit}
            disabled={isLoading}
            size="lg"
            className="w-64 h-12 text-lg shadow-xl bg-blue-600 hover:bg-blue-700"
          >
            {isLoading && <Loader2 className="ml-2 h-5 w-5 animate-spin" />}
            שמור ובצע קליטה
          </Button>
      </div>
    </div>
  );
}