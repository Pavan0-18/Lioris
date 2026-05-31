"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search, X } from "lucide-react";

interface SearchFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  categoryId?: string;
  onCategoryChange?: (val: string) => void;
  brandId?: string;
  onBrandChange?: (val: string) => void;
  status?: string;
  onStatusChange?: (val: string) => void;
  categories?: { id: string; name: string }[];
  brands?: { id: string; name: string }[];
  showStatus?: boolean;
}

export function SearchFilters({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  brandId,
  onBrandChange,
  status,
  onStatusChange,
  categories = [],
  brands = [],
  showStatus = true,
}: SearchFiltersProps) {
  const hasFilters = search || categoryId || brandId || status;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      {onCategoryChange && categories.length > 0 && (
        <Select value={categoryId || "all"} onValueChange={(val) => onCategoryChange(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onBrandChange && brands.length > 0 && (
        <Select value={brandId || "all"} onValueChange={(val) => onBrandChange(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {showStatus && onStatusChange && (
        <Select value={status || "all"} onValueChange={(val) => onStatusChange(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      )}
      {hasFilters && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            onSearchChange("");
            onCategoryChange?.("");
            onBrandChange?.("");
            onStatusChange?.("");
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
