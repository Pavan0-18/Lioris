"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface KanbanColumn<T = any> {
  id: string;
  title: string;
  items: T[];
  color?: string;
}

interface KanbanBoardProps<T = any> {
  columns: KanbanColumn<T>[];
  renderCard: (item: T, columnId: string) => React.ReactNode;
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string) => void;
  onColumnDrop?: (itemId: string, fromColumn: string, toColumn: string) => void;
  className?: string;
  emptyState?: React.ReactNode;
  collapsibleColumnIds?: string[];
  collapsedColumns?: Set<string>;
  onToggleCollapse?: (columnId: string) => void;
}

export function KanbanBoard<T = any>({
  columns,
  renderCard,
  onItemMove,
  onColumnDrop,
  className,
  emptyState,
  collapsibleColumnIds,
  collapsedColumns = new Set(),
  onToggleCollapse,
}: KanbanBoardProps<T>) {
  const [dragOverColumn, setDragOverColumn] = React.useState<string | null>(null);
  const [dragItem, setDragItem] = React.useState<{ id: string; column: string } | null>(null);

  const handleDragStart = (e: React.DragEvent, itemId: string, columnId: string) => {
    setDragItem({ id: itemId, column: columnId });
    e.dataTransfer.setData("text/plain", JSON.stringify({ itemId, columnId }));
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).classList.add("opacity-50");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDragItem(null);
    setDragOverColumn(null);
    (e.currentTarget as HTMLElement).classList.remove("opacity-50");
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, toColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.columnId !== toColumnId) {
        onColumnDrop?.(data.itemId, data.columnId, toColumnId);
        onItemMove?.(data.itemId, data.columnId, toColumnId);
      }
    } catch {}
  };

  const hasItems = columns.some((col) => col.items.length > 0);

  if (!hasItems && emptyState) {
    return <>{emptyState}</>;
  }

  const isCollapsible = (colId: string) => collapsibleColumnIds?.includes(colId) ?? false;

  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
      {columns.map((column) => {
        const isOver = dragOverColumn === column.id && dragItem?.column !== column.id;
        const collapsed = collapsedColumns.has(column.id);
        return (
          <div
            key={column.id}
            className={cn(
              "flex-shrink-0 flex flex-col rounded-xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-200",
              collapsed ? "w-14" : "w-72",
              isOver && "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5 scale-[1.02]",
            )}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={cn(
              "flex items-center justify-between px-4 py-3 border-b border-border",
              column.color && "border-l-[3px]",
            )} style={column.color ? { borderLeftColor: column.color } : {}}>
              <div className="flex items-center gap-2 min-w-0">
                {column.color && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: column.color }} />}
                {!collapsed && (
                  <h3 className="text-sm font-semibold text-foreground truncate">{column.title}</h3>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-bold rounded-full bg-muted text-muted-foreground">
                  {column.items.length}
                </span>
                {isCollapsible(column.id) && (
                  <button
                    onClick={() => onToggleCollapse?.(column.id)}
                    className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
            {collapsed ? (
              <div
                className="flex-1 min-h-[200px] flex items-center justify-center cursor-pointer"
                onClick={() => onToggleCollapse?.(column.id)}
              >
                <span className="text-[10px] text-muted-foreground/40 font-medium -rotate-90 whitespace-nowrap tracking-wider uppercase">
                  {column.title}
                </span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)]">
                {column.items.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/50 italic">
                    Drop items here
                  </div>
                ) : (
                  column.items.map((item: any, idx: number) => (
                    <div
                      key={item.id ?? idx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id, column.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "cursor-grab active:cursor-grabbing rounded-lg transition-all duration-150",
                        dragItem?.id === item.id && "opacity-40 scale-95",
                      )}
                    >
                      {renderCard(item, column.id)}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
