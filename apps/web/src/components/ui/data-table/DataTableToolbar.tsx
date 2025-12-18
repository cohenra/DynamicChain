import { Table } from "@tanstack/react-table";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

export interface FilterOption {
  key: string;
  label: string;
  options: { label: string; value: string | number }[];
  value: string | undefined;
  onChange: (value: string) => void;
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterOption[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  searchValue,
  onSearchChange,
  filters = [],
  actions,
  children,
}: DataTableToolbarProps<TData>) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const isFiltered = table.getState().columnFilters.length > 0 || !!searchValue;
  
  const [localSearch, setLocalSearch] = useState(searchValue || "");

  useEffect(() => {
    const timer = setTimeout(() => {
        if (onSearchChange && localSearch !== searchValue) {
            onSearchChange(localSearch);
        }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange, searchValue]);

  useEffect(() => {
    if (searchValue !== undefined && searchValue !== localSearch) {
        setLocalSearch(searchValue);
    }
  }, [searchValue]);

  return (
    <div 
      className="flex items-center gap-2 w-full p-1 border-b bg-background"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* צד ימין (RTL): חיפוש ופילטרים */}
      <div className="flex items-center gap-2 shrink-0">
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute top-2.5 h-4 w-4 text-muted-foreground ltr:right-2 rtl:left-2" />
            <Input
              placeholder={t('common.search', 'חיפוש...')}
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              className="h-8 w-[150px] lg:w-[200px] ltr:pr-8 rtl:pl-8 text-start"
            />
          </div>
        )}

        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={filter.value?.toString() || "all"}
            onValueChange={(val) => filter.onChange(val === "all" ? "" : val)}
          >
            <SelectTrigger className="h-8 w-[130px] text-sm border-dashed">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all', 'הכל')}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* הטאבים - מוצגים מיד אחרי הפילטרים */}
      <div className="flex-1 flex items-center shrink-0 px-2">
         {children}
      </div>

      {/* כפתור איפוס */}
      {isFiltered && (
        <Button
          variant="ghost"
          onClick={() => {
            table.resetColumnFilters();
            setLocalSearch("");
            if (onSearchChange) onSearchChange("");
            filters.forEach((f) => f.onChange(""));
          }}
          className="h-8 px-2 lg:px-3 shrink-0"
        >
          {t('common.reset', 'אפס')}
          <X className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
        </Button>
      )}

      {/* צד שמאל (RTL): כפתורי פעולה בלבד */}
      <div className="flex items-center gap-2 shrink-0 ltr:ml-auto rtl:mr-auto">
        {actions}
      </div>
    </div>
  );
}