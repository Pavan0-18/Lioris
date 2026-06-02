"use client";
import React from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Phone, Mail } from "lucide-react";
import Link from "next/link";

import { BoneyardTable } from "@/components/ui/boneyard";

interface Vendor {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  isActive: string;
}

interface VendorTableProps {
  vendors: Vendor[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export function VendorTable({ vendors, isLoading, onDelete }: VendorTableProps) {
  if (isLoading) {
    return <BoneyardTable rows={5} cols={5} />;
  }

  if (vendors.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No vendors found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Contact Person</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vendors.map((v) => (
          <TableRow key={v.id}>
            <TableCell>
              <Link href={`/procurement/vendors/${v.id}`} className="font-medium text-sm hover:underline">
                {v.name}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{v.contactPerson || "-"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {v.phone ? (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {v.phone}
                </span>
              ) : "-"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {v.email ? (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {v.email}
                </span>
              ) : "-"}
            </TableCell>
            <TableCell>
              <Badge variant={v.isActive === "true" ? "default" : "secondary"} className="text-xs">
                {v.isActive === "true" ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/procurement/vendors/${v.id}`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(v.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
