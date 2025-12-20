import React from "react";
import { flexRender, Table as ReactTable, Row } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableToolbar, FilterOption } from "./DataTableToolbar";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SmartTableProps<TData> {
  table: ReactTable<TData>;
  columnsLength: number;
  isLoading?: boolean;
  searchKey?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterOption[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  noDataMessage?: string;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
  containerClassName?: string;
}

export function SmartTable<TData>({
  table,
  columnsLength,
  isLoading,
  searchKey,
  searchValue,
  onSearchChange,
  filters,
  actions,
  children,
  noDataMessage,
  renderSubComponent,
  containerClassName,
}: SmartTableProps<TData>) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  return (
    <div className="flex flex-col space-y-4">
      <DataTableToolbar
        table={table}
        searchKey={searchKey}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        filters={filters}
        actions={actions}
      >
        {children}
      </DataTableToolbar>

      <div className={cn("rounded-md border bg-white shadow-sm overflow-hidden", containerClassName)}>
        <div className="w-full overflow-x-auto">
            <Table 
              className="table-fixed w-full" 
              // הוסר dir="rtl" קשיח
              style={{ minWidth: table.getTotalSize() }}
            >
            <TableHeader className="bg-slate-50">
                {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="h-9 hover:bg-transparent border-b border-slate-200">
                    {headerGroup.headers.map((header) => (
                    <TableHead 
                        key={header.id} 
                        className={cn(
                          "h-9 font-bold text-slate-700 whitespace-nowrap px-2 text-xs",
                          // תמיכה ב-LTR/RTL בגבולות
                          "border-l border-slate-100 last:border-l-0 rtl:border-l-0 rtl:border-r rtl:last:border-r-0",
                          isRtl ? "text-right" : "text-left"
                        )}
                        style={{ width: header.getSize() }}
                    >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                    ))}
                </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {isLoading ? (
                <TableRow>
                    <TableCell colSpan={columnsLength} className="h-24 text-center">
                    <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span>{t("common.loading", "Loading data...")}</span>
                    </div>
                    </TableCell>
                </TableRow>
                ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                    <React.Fragment key={row.id}>
                    <TableRow
                        data-state={row.getIsSelected() && "selected"}
                        className={`h-9 hover:bg-blue-50/50 transition-colors border-b border-slate-100 ${row.getCanExpand() ? "cursor-pointer" : ""}`}
                        onClick={(e) => {
                           if (!e.defaultPrevented && row.getCanExpand()) {
                               row.toggleExpanded();
                           }
                        }}
                    >
                        {row.getVisibleCells().map((cell) => (
                        <TableCell 
                          key={cell.id} 
                          className={cn(
                            "py-1 px-2 whitespace-nowrap text-xs",
                            "border-l border-slate-50 last:border-l-0 rtl:border-l-0 rtl:border-r rtl:last:border-r-0",
                            isRtl ? "text-right" : "text-left"
                          )}
                          style={{ width: cell.column.getSize() }}
                        >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                        ))}
                    </TableRow>
                    
                    {row.getIsExpanded() && renderSubComponent && (
                        <TableRow className="hover:bg-transparent bg-slate-50/50">
                        <TableCell colSpan={columnsLength} className="p-0 border-b w-full">
                            <div className="w-full">
                                {renderSubComponent({ row })}
                            </div>
                        </TableCell>
                        </TableRow>
                    )}
                    </React.Fragment>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={columnsLength} className="h-24 text-center text-muted-foreground">
                    {noDataMessage || t("common.noData", "No data available")}
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </div>

      <div className="mt-auto">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}