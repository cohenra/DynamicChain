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

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

/**
 * Data Table Pagination Component
 *
 * Displays pagination controls with:
 * - Page size selector (rows per page)
 * - Current page info (Page X of Y)
 * - Navigation buttons (First, Previous, Next, Last)
 *
 * Features:
 * - RTL support for Hebrew interface
 * - Customizable page size options
 * - Accessible button states (disabled when appropriate)
 *
 * @param table - TanStack Table instance
 * @param pageSizeOptions - Array of page size options (default: [10, 20, 30, 50, 100])
 */
export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 50, 100],
}: DataTablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {/* Page Size Selector */}
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">שורות לעמוד</p>
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

      {/* Page Info and Navigation */}
      <div className="flex items-center gap-2">
        {/* Page Info */}
        <div className="flex items-center justify-center text-sm font-medium min-w-[100px]">
          עמוד {currentPage} מתוך {totalPages}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          {/* First Page - In RTL, this should be on the right */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            title="עמוד ראשון"
          >
            <span className="sr-only">עמוד ראשון</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>

          {/* Previous Page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            title="עמוד קודם"
          >
            <span className="sr-only">עמוד קודם</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Next Page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            title="עמוד הבא"
          >
            <span className="sr-only">עמוד הבא</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Last Page - In RTL, this should be on the left */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            title="עמוד אחרון"
          >
            <span className="sr-only">עמוד אחרון</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
