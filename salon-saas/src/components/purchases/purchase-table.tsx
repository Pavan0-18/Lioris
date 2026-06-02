"use client";
import React from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { BoneyardTable } from "@/components/ui/boneyard";

interface PurchaseOrder {
  id: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  purchaseDate: string;
  totalAmount: number;
  createdAt: string;
}

interface PurchaseTableProps {
  orders: PurchaseOrder[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export function PurchaseTable({ orders, isLoading, onDelete }: PurchaseTableProps) {
  if (isLoading) {
    return <BoneyardTable rows={5} cols={5} />;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No purchase orders found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vendor</TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((po) => (
          <TableRow key={po.id}>
            <TableCell>
              <Link href={`/procurement/purchases/${po.id}`} className="font-medium text-sm hover:underline">
                {po.vendorName || "Unknown Vendor"}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground font-mono">
              {po.invoiceNumber || "-"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {format(new Date(po.purchaseDate), "PP")}
            </TableCell>
            <TableCell className="text-right font-medium">
              ${po.totalAmount.toFixed(2)}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => onDelete(po.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
