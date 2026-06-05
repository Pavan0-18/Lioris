"use client";
import React from "react";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BoneyardTable } from "@/components/ui/boneyard";
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Download, FileSpreadsheet, FileText, FileDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  sortKey?: string;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onExport?: () => void;
  exportFilename?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns, data, keyExtractor, isLoading,
  sortField, sortOrder, onSort,
  page, pageSize, total, onPageChange, onPageSizeChange,
  onExport, exportFilename = "export", emptyMessage = "No data found.",
}: DataTableProps<T>) {
  if (isLoading) {
    return <BoneyardTable rows={8} cols={columns.length} />;
  }

  const totalPages = page && pageSize && total ? Math.ceil(total / pageSize) : 0;

  const renderCell = (item: T, col: Column<T>) => {
    if (typeof col.accessor === "function") {
      return col.accessor(item);
    }
    const value = item[col.accessor];
    return value != null ? String(value) : "-";
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 ml-1 shrink-0 opacity-40" />;
    return sortOrder === "asc"
      ? <ChevronUp className="h-3 w-3 ml-1 shrink-0" />
      : <ChevronDown className="h-3 w-3 ml-1 shrink-0" />;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.header}
                className={col.headerClassName}
              >
                {col.sortKey ? (
                  <button
                    onClick={() => onSort?.(col.sortKey!)}
                    className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                  >
                    {col.header}
                    <SortIcon field={col.sortKey} />
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={keyExtractor(item)}>
              {columns.map((col) => (
                <TableCell key={String(col.accessor)} className={col.className}>
                  {renderCell(item, col)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {(total !== undefined || onExport) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {total !== undefined && (
              <span>{total} record{total !== 1 ? "s" : ""}</span>
            )}
            {onPageSizeChange && (
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="bg-transparent border border-border rounded-md px-2 py-1 text-xs"
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s}>{s} / page</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => exportToCsv(data, columns, exportFilename)}>
                    <FileDown className="h-3.5 w-3.5 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToExcel(data, columns, exportFilename)}>
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToPdf(data, columns, exportFilename)}>
                    <FileText className="h-3.5 w-3.5 mr-2" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {totalPages > 0 && onPageChange && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm"
                  disabled={page === 1}
                  onClick={() => onPageChange(page! - 1)}
                >
                  Prev
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page! <= 3) {
                    pageNum = i + 1;
                  } else if (page! >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page! - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onPageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline" size="sm"
                  disabled={page === totalPages}
                  onClick={() => onPageChange(page! + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function extractRowValues<T>(item: T, columns: Column<T>[]): string[] {
  return columns.map((col) => {
    if (typeof col.accessor === "function") return "";
    const val = item[col.accessor];
    return val != null ? String(val) : "";
  });
}

export function exportToCsv<T>(data: T[], columns: Column<T>[], filename: string) {
  const headers = columns.map((c) => c.header);
  const rows = data.map((item) =>
    extractRowValues(item, columns).map((v) => `"${v.replace(/"/g, '""')}"`)
  );
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToExcel<T>(data: T[], columns: Column<T>[], filename: string) {
  const headers = columns.map((c) => c.header);
  const rows = data.map((item) => extractRowValues(item, columns));
  const tableRows = [headers, ...rows]
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html><meta charset="utf-8"><table>${tableRows}</table></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPdf<T>(data: T[], columns: Column<T>[], filename: string) {
  const headers = columns.map((c) => c.header);
  const rows = data.map((item) => extractRowValues(item, columns));
  const tableHtml = `
    <html>
    <head><style>
      body { font-family: system-ui, sans-serif; font-size: 12px; padding: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; }
    </style></head>
    <body>
      <h2>${filename}</h2>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      <script>window.print()</script>
    </body></html>`;
  const blob = new Blob([tableHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
