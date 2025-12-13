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
  noDataMessage,
  renderSubComponent,
  containerClassName,
}: SmartTableProps<TData>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col space-y-2">
      <DataTableToolbar
        table={table}
        searchKey={searchKey}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        filters={filters}
        actions={actions}
      />

      <div className={cn("rounded-md border bg-white shadow-sm overflow-hidden", containerClassName)}>
        <div className="w-full overflow-x-auto">
            {/* Using minWidth ensures columns don't squash each other */}
            <Table 
              className="table-fixed" 
              dir="rtl"
              style={{ minWidth: table.getTotalSize() }}
            >
            <TableHeader className="bg-slate-50">
                {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="h-9 hover:bg-transparent border-b border-slate-200">
                    {headerGroup.headers.map((header) => (
                    <TableHead 
                        key={header.id} 
                        className="h-9 font-bold text-slate-700 whitespace-nowrap px-2 text-right text-xs border-l last:border-l-0 border-slate-100"
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
                    <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="mr-2">{t("common.loading", "טוען נתונים...")}</span>
                    </div>
                    </TableCell>
                </TableRow>
                ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                    <React.Fragment key={row.id}>
                    <TableRow
                        data-state={row.getIsSelected() && "selected"}
                        className={`h-9 hover:bg-blue-50/50 transition-colors border-b border-slate-100 ${row.getCanExpand() ? "cursor-pointer" : ""}`}
                        onClick={() => row.getCanExpand() && row.toggleExpanded()}
                    >
                        {row.getVisibleCells().map((cell) => (
                        <TableCell 
                          key={cell.id} 
                          className="py-1 px-2 whitespace-nowrap text-xs text-right border-l last:border-l-0 border-slate-50"
                          style={{ width: cell.column.getSize() }}
                        >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                        ))}
                    </TableRow>
                    
                    {/* Expanded Row Detail */}
                    {row.getIsExpanded() && renderSubComponent && (
                        <TableRow className="hover:bg-transparent bg-slate-50/50">
                        <TableCell colSpan={columnsLength} className="p-0 border-b">
                            {/* FIX: Removed 'sticky' wrapper causing layout breakage */}
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
                    {noDataMessage || t("common.noData", "אין נתונים להצגה")}
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