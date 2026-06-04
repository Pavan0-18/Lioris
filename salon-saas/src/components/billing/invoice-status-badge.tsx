"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";

interface InvoiceStatusBadgeProps {
  status: "draft" | "partial" | "paid" | "void";
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; className: string }> = {
  draft: { variant: "default", className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800" },
  partial: { variant: "warning", className: "" },
  paid: { variant: "success", className: "" },
  void: { variant: "destructive", className: "" },
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={config.className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
