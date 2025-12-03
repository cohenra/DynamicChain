import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { warehouseService } from '@/services/warehouses';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { ZonesTab } from '@/components/warehouse/ZonesTab';
import { LocationsTab } from '@/components/warehouse/LocationsTab';
import { Loader2 } from 'lucide-react';

export default function WarehouseDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const warehouseId = parseInt(id || '0', 10);

  // Fetch warehouse details
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{warehouse.name}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('warehouses.code')}: {warehouse.code}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          {t('warehouses.address')}: {warehouse.address}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="zones" className="w-full">
        <TabsList>
          <TabsTrigger value="zones">{t('zones.title')}</TabsTrigger>
          <TabsTrigger value="locations">{t('locations.title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="mt-6">
          <ZonesTab warehouseId={warehouseId} />
        </TabsContent>

        <TabsContent value="locations" className="mt-6">
          <LocationsTab warehouseId={warehouseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
