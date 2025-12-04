import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { warehouseService } from '@/services/warehouses';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { ZonesTab } from '@/components/warehouse/ZonesTab';
import { LocationsTab } from '@/components/warehouse/LocationsTab';
import { Loader2, MapPin, Building2 } from 'lucide-react';

export default function WarehouseDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const warehouseId = parseInt(id || '0', 10);

  const { data: warehouse, isLoading, isError } = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: async () => {
      const warehouses = await warehouseService.getWarehouses();
      return warehouses.find((w) => w.id === warehouseId);
    },
    enabled: !!warehouseId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !warehouse) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">{t('warehouses.notFound')}</h1>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4"> {/* צמצמנו מ-p-6 ל-p-4 */}
      
      {/* Header קומפקטי */}
      <div className="flex items-start justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">{warehouse.name}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-medium text-gray-700">קוד:</span> {warehouse.code}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {warehouse.address}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="bg-white border w-full justify-start h-11 p-1">
          <TabsTrigger value="locations" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            {t('locations.title')}
          </TabsTrigger>
          <TabsTrigger value="zones" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            {t('zones.title')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="mt-4">
          <ZonesTab warehouseId={warehouseId} />
        </TabsContent>

        <TabsContent value="locations" className="mt-4">
          <LocationsTab warehouseId={warehouseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
