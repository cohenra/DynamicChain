import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next'; // <--- הוספנו

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 50, 100],
}: DataTablePaginationProps<TData>) {
  const { t, i18n } = useTranslation(); // <--- הוספנו
  const isRTL = i18n.dir() === 'rtl'; // זיהוי כיוון שפה לחיצים

  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {/* Page Size & Total */}
      <div className="flex items-center gap-6">
        <div className="text-sm text-muted-foreground">
          {t('common.totalRecords', { count: totalRows })}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{t('common.rows')}:</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <div className="flex w-[120px] items-center justify-center text-sm font-medium">
          {t('common.pageOf', { current: currentPage, total: totalPages })}
        </div>
        <div className="flex items-center gap-1">
          {/* בגלל שהשתמשנו ב-flex-row רגיל, האייקונים צריכים להתהפך ב-RTL או שהלוגיקה תהיה הפוכה */}
          
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            title={t('common.firstPage')}
          >
            {isRTL ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            title={t('common.prevPage')}
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            title={t('common.nextPage')}
          >
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            title={t('common.lastPage')}
          >
            {isRTL ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
