import { Table } from "@tanstack/react-table";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
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
}

export function DataTableToolbar<TData>({
  table,
  searchValue,
  onSearchChange,
  filters = [],
  actions,
}: DataTableToolbarProps<TData>) {
  const { t } = useTranslation();
  const isFiltered = table.getState().columnFilters.length > 0 || !!searchValue;
  
  // Local state for immediate input feedback
  const [localSearch, setLocalSearch] = useState(searchValue || "");

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
        if (onSearchChange && localSearch !== searchValue) {
            onSearchChange(localSearch);
        }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange, searchValue]);

  // Sync local state if external prop changes (e.g. clear filters)
  useEffect(() => {
    if (searchValue !== undefined && searchValue !== localSearch) {
        setLocalSearch(searchValue);
    }
  }, [searchValue]);

  return (
    <div className="flex flex-col sm:flex-row justify-between gap-3 items-center bg-background border rounded-lg p-2 shadow-sm mb-4">
      {/* Search & Filters */}
      <div className="flex flex-1 items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.searchPlaceholder', 'חיפוש...')}
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              className="pr-8 h-9 w-[200px] text-sm"
            />
          </div>
        )}

        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={filter.value?.toString() || "all"}
            onValueChange={(val) => filter.onChange(val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-[130px] h-9 text-sm">
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

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              setLocalSearch(""); // Clear local immediately
              if (onSearchChange) onSearchChange("");
              filters.forEach((f) => f.onChange(""));
            }}
            className="h-8 px-2 lg:px-3"
          >
            {t('common.resetFilters', 'אפס')}
            <X className="mr-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Actions & View Options */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <DataTableViewOptions table={table} />
        {actions}
      </div>
    </div>
  );
}