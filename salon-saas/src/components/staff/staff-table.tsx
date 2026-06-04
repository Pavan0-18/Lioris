"use client";
import React from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";

interface StaffTableProps {
  staffList: any[];
  onAddClick?: () => void;
}

// PERFORMANCE OPTIMIZATION: Memoized row component to prevent unnecessary re-renders
interface StaffRowProps {
  staff: any;
  onRowClick: (id: string) => void;
}

const StaffRow = React.memo(({ staff, onRowClick }: StaffRowProps) => (
  <TableRow key={staff.id} className="cursor-pointer" onClick={() => onRowClick(staff.id)}>
    <TableCell className="font-semibold text-sm">
      {staff.user?.name || staff.name}
    </TableCell>
    <TableCell>
      <Badge variant="secondary">{staff.user?.role || staff.role}</Badge>
    </TableCell>
    <TableCell className="text-xs text-muted-foreground">
      {staff.designation || "Hair Stylist"}
    </TableCell>
    <TableCell>
      <Badge variant={staff.isActive ? "default" : "destructive"}>
        {staff.isActive ? "ACTIVE" : "INACTIVE"}
      </Badge>
    </TableCell>
    <TableCell className="text-xs font-semibold">
      ${staff.baseSalary} / {staff.salaryType}
    </TableCell>
    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size="sm" onClick={() => onRowClick(staff.id)}>
        Profile
      </Button>
    </TableCell>
  </TableRow>
));

StaffRow.displayName = "StaffRow";

export function StaffTable({ staffList, onAddClick }: StaffTableProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");

  // PERFORMANCE OPTIMIZATION: Use useMemo to prevent recalculating filter on every render
  // Only recalculates when staffList or search changes
  const filtered = React.useMemo(() => {
    return staffList.filter((s: any) => {
      const name = s.user?.name || s.name || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [staffList, search]);

  const handleRowClick = React.useCallback(
    (id: string) => {
      router.push(`/dashboard/staff/${id}`);
    },
    [router]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        {onAddClick && (
          <Button onClick={onAddClick}>
            <Plus className="h-4 w-4 mr-2" /> Add Staff Stylist
          </Button>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Avatar + Name</TableHead>
              <TableHead>Role Badge</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Base Salary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                  No staff members found matching search parameters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <StaffRow key={s.id} staff={s} onRowClick={handleRowClick} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
