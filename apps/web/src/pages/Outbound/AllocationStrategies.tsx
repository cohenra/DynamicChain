import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Trash2, ArrowLeft, ArrowRight, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function AllocationStrategies() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  
  const [strategies, setStrategies] = useState([
    { id: 1, name: 'Standard FIFO', type: 'FIFO', rules: ['Expiration Date', 'Location Sequence'] },
    { id: 2, name: 'LIFO Pick', type: 'LIFO', rules: ['Reception Date'] },
  ]);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('strategies.title', 'אסטרטגיות הקצאה')}</h1>
          <p className="text-muted-foreground">
            {t('strategies.description', 'הגדר ונהל את החוקים להקצאת מלאי עבור הזמנות יציאה')}
          </p>
        </div>
        <Button>
          <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
          {t('strategies.create', 'צור אסטרטגיה')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {strategies.map((strategy) => (
          <Card key={strategy.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                     <GitBranch className="h-5 w-5" />
                   </div>
                   <CardTitle className="text-lg">{strategy.name}</CardTitle>
                </div>
                <Badge variant="outline">{strategy.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-slate-700">{t('strategies.rules', 'חוקים')}:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {strategy.rules.map((rule, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-slate-100 font-normal">
                      {rule}
                    </Badge>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-end gap-2 pt-2">
                   <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                   </Button>
                   <Button variant="outline" size="sm" className="h-8">
                      {t('common.edit', 'ערוך')}
                   </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}