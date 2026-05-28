"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function SuperadminUsersPage() {
  const { data: tenantsData } = useQuery({
    queryKey: ["superadmin-tenants"],
    queryFn: () => fetch("/api/superadmin/tenants").then(res => res.json())
  });

  const [allUsers, setAllUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

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
    });
  }, [tenantsData]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">All Users</h2>
        <p className="text-sm text-muted-foreground">View users across all tenant workspaces.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Registry</CardTitle>
        </CardHeader>
        <CardContent>
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
              ) : allUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                allUsers.map((u: any) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
