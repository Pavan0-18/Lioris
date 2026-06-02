"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { BoneyardTable } from "@/components/ui/boneyard";

const ITEMS_PER_PAGE = 10;

export default function SuperadminFeaturesPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: featuresData, isLoading } = useQuery({
    queryKey: ["superadmin-features"],
    queryFn: () => fetch("/api/superadmin/features").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const list = featuresData?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Core Features Mapping</h2>
          <p className="text-sm text-muted-foreground">Manage modular features categorized as core, add-on, or premium.</p>
        </div>
        <BoneyardTable rows={5} cols={4} />
      </div>
    );
  }

  // Filter by search
  const filteredList = list.filter((f: any) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Platform Core Features Mapping</h2>
        <p className="text-sm text-muted-foreground">Manage modular features categorized as core, add-on, or premium.</p>
      </div>

      {/* Search */}
      <div>
        <Label className="text-xs mb-2 block">Search features</Label>
        <Input 
          placeholder="Search by name or key..." 
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature Name</TableHead>
              <TableHead>Key ID</TableHead>
              <TableHead className="text-right">Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                  {list.length === 0 ? "No features found." : "No features match your search."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedList.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-semibold text-sm">{f.name}</TableCell>
                  <TableCell className="text-xs font-mono">{f.key}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{f.category.toUpperCase()}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
