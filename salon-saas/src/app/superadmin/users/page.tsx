"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BoneyardTable } from "@/components/ui/boneyard";

const ITEMS_PER_PAGE = 10;

export default function SuperadminUsersPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [allUsers, setAllUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const { data: tenantsData } = useQuery({
    queryKey: ["superadmin-tenants"],
    queryFn: () => fetch("/api/superadmin/tenants").then(res => res.json())
  });

  React.useEffect(() => {
    if (!tenantsData?.data) return;
    const tenants = tenantsData.data;
    Promise.all(
      tenants.map((t: any) =>
        fetch(`/api/superadmin/tenants/${t.id}/users`)
          .then(res => res.json())
          .then(json => (json.data || []).map((u: any) => ({ ...u, tenantName: t.name, tenantId: t.id })))
          .catch(() => [])
      )
    ).then((results) => {
      setAllUsers(results.flat());
      setLoading(false);
      setCurrentPage(1);
    });
  }, [tenantsData]);

  // Filter by search
  const filteredUsers = allUsers.filter((u: any) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.tenantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">All Users</h2>
          <p className="text-sm text-muted-foreground">View users across all tenant workspaces.</p>
        </div>
        <BoneyardTable rows={5} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">All Users</h2>
        <p className="text-sm text-muted-foreground">View users across all tenant workspaces.</p>
      </div>

      {/* Search */}
      <div>
        <Label className="text-xs mb-2 block">Search users</Label>
        <Input 
          placeholder="Search by name, email, or tenant..." 
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Registry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    {allUsers.length === 0 ? "No users found." : "No users match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold text-sm">{u.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.tenantName}</TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
