"use client";
import React, { useMemo, useCallback } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

/**
 * PERFORMANCE OPTIMIZATION: Lightweight virtual list for large tables
 * Instead of rendering all rows at once, only renders visible rows + buffer
 * This reduces DOM nodes from 1000+ to ~20-30, dramatically improving performance
 * 
 * Without external dependencies - uses native JavaScript scroll events
 * Can handle 10,000+ rows smoothly
 */

interface VirtualTableProps {
  columns: {
    header: string;
    key: string;
    width?: string;
  }[];
  data: any[];
  renderRow: (row: any, index: number) => React.ReactNode;
  rowHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

export function VirtualTable({
  columns,
  data,
  renderRow,
  rowHeight = 50,
  containerHeight = 600,
  overscan = 5,
}: VirtualTableProps) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calculate visible range based on scroll position
  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(data.length, startIndex + visibleCount + overscan * 2);

    return { startIndex, endIndex, visibleCount };
  }, [scrollTop, containerHeight, rowHeight, data.length, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleData = useMemo(() => {
    return data.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [data, visibleRange]);

  const offsetY = visibleRange.startIndex * rowHeight;
  const totalHeight = data.length * rowHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: "auto",
        position: "relative",
      }}
    >
      <Table>
        <TableHeader style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} style={{ width: col.width }}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Spacer for top invisible rows */}
          {visibleRange.startIndex > 0 && (
            <TableRow style={{ height: offsetY, pointerEvents: "none" }}>
              <TableCell colSpan={columns.length} style={{ padding: 0 }} />
            </TableRow>
          )}

          {/* Visible rows */}
          {visibleData.map((row, i) => (
            <React.Fragment key={visibleRange.startIndex + i}>
              {renderRow(row, visibleRange.startIndex + i)}
            </React.Fragment>
          ))}

          {/* Spacer for bottom invisible rows */}
          {visibleRange.endIndex < data.length && (
            <TableRow
              style={{
                height: totalHeight - visibleRange.endIndex * rowHeight,
                pointerEvents: "none",
              }}
            >
              <TableCell colSpan={columns.length} style={{ padding: 0 }} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Hook for managing virtualization state
 * Usage: const { visibleRange, handleScroll } = useVirtualization(data.length, rowHeight, containerHeight);
 */
export function useVirtualization(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(itemCount, startIndex + visibleCount + overscan * 2);

    return { startIndex, endIndex, visibleCount };
  }, [scrollTop, containerHeight, itemHeight, itemCount, overscan]);

  const handleScroll = useCallback((scrollOffset: number) => {
    setScrollTop(scrollOffset);
  }, []);

  return {
    visibleRange,
    handleScroll,
    offsetY: visibleRange.startIndex * itemHeight,
    totalHeight: itemCount * itemHeight,
  };
}
