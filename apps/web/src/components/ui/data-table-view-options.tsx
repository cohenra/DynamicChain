import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu"
import { Table } from "@tanstack/react-table"
import { Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger as Trigger,
} from "@/components/ui/dropdown-menu"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  // תרגום שמות העמודות לעברית לתצוגה יפה
  const columnLabels: Record<string, string> = {
    name: "שם מיקום",
    zone_id: "אזור",
    usage_id: "שימוש",
    type_id: "סוג",
    aisle: "מעבר", // הוספנו תמיכה עתידית
    pick_sequence: "רצף איסוף",
    actions: "פעולות"
  };

  return (
    <DropdownMenu>
      <Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          תצוגה
        </Button>
      </Trigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>הצג עמודות</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide()
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize text-right"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                onSelect={(e) => e.preventDefault()} // <--- התיקון: מונע סגירה בלחיצה
              >
                {columnLabels[column.id] || column.id}
              </DropdownMenuCheckboxItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
