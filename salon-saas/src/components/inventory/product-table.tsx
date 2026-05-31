"use client";
import React from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  brandId: string | null;
  unitId: string | null;
  sellingPrice: number;
  costPrice: number;
  reorderLevel: number;
  expiryDate: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ProductTableProps {
  products: Product[];
  stockMap: Record<string, number>;
  isLoading?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

export function ProductTable({ products, stockMap, isLoading, onEdit, onDelete }: ProductTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        No products found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const stock = stockMap[product.id] ?? 0;
          const isLowStock = stock <= product.reorderLevel;

          return (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {isLowStock && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    {product.expiryDate && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {format(new Date(product.expiryDate), "PP")}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-xs font-mono">{product.sku}</TableCell>
              <TableCell className="text-sm">${product.sellingPrice.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={isLowStock ? "destructive" : "secondary"} className="text-xs">
                  {stock} {stock === 1 ? "unit" : "units"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={product.isActive ? "default" : "outline"} className="text-xs">
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit?.(product)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {onDelete && (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
