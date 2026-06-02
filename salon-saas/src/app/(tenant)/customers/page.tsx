"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Search, Users, ArrowUpDown, X } from "lucide-react";
import { toast } from "sonner";

import { cn, formatCurrency } from "@/lib/utils";
import { FeatureGate } from "@/components/feature-gate";
import { BoneyardTable } from "@/components/ui/boneyard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDebounce } from "@/hooks/useDebounce";

type Segment = "all" | "new" | "repeat" | "inactive";
type SortField = "name" | "visitCount" | "totalSpent" | "lastVisit";

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "repeat", label: "Repeat Visitors" },
  { value: "inactive", label: "Inactive" },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "visitCount", label: "Visit Count" },
  { value: "totalSpent", label: "Total Spent" },
  { value: "lastVisit", label: "Last Visit" },
];

const LIMIT = 20;

function getInitials(name: string): string {
  return name
    ?.split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "??";
}

function getAvatarColor(name: string): string {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colors = [
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  ];
  return colors[hash % colors.length];
}

function CustomerAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      <AvatarFallback className={cn("text-xs font-medium", getAvatarColor(name))}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function SegmentBadge({ visitCount, lastVisit }: { visitCount: number; lastVisit: string | null }) {
  if (!visitCount || visitCount === 0) {
    return <Badge variant="secondary">New</Badge>;
  }
  if (lastVisit) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 90) {
      return <Badge variant="outline">Inactive</Badge>;
    }
  }
  if (visitCount >= 3) {
    return <Badge variant="success">Repeat</Badge>;
  }
  return <Badge variant="default">Active</Badge>;
}

function Pagination({
  page, total, limit, onPageChange,
}: {
  page: number; total: number; limit: number; onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-[2rem]"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

const EMPTY_MESSAGES: Record<Segment, { title: string; description: string }> = {
  all: { title: "No customers yet", description: "Add your first customer to get started." },
  new: { title: "No new customers", description: "New customers will appear here once they make their first visit." },
  repeat: { title: "No repeat visitors", description: "Customers who visit multiple times will show up here." },
  inactive: { title: "No inactive customers", description: "All your customers have visited recently!" },
};

export default function CustomersCRMPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [segment, setSegment] = React.useState<Segment>("all");
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortField>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const queryKey = ["customers", segment, debouncedSearch, sortBy, sortDir, page];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({
        segment,
        search: debouncedSearch,
        sortBy,
        sortDir,
        page: String(page),
        limit: String(LIMIT),
      });
      return fetch(`/api/tenant/customers?${params.toString()}`).then((r) => r.json());
    },
    staleTime: 30_000,
  });

  const customers = data?.data?.customers ?? [];
  const total = data?.data?.total ?? 0;
  const counts = data?.data?.counts ?? { all: 0, new: 0, repeat: 0, inactive: 0 };

  const handleSegmentChange = (s: Segment) => {
    setSegment(s);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const toggleSortDir = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  return (
    <FeatureGate feature="CRM">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
            <p className="text-sm text-muted-foreground">
              Manage your customer relationships and loyalty.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-fit">
          {SEGMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => handleSegmentChange(s.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                segment === s.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {counts[s.value]}
              </Badge>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(v) => { setSortBy(v as SortField); setPage(1); }}
            >
              <SelectTrigger className="w-[140px]">
                <ArrowUpDown className="h-3 w-3 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortDir}
              className="h-10 w-10"
              title={sortDir === "asc" ? "Ascending" : "Descending"}
            >
              <ArrowUpDown className={cn(
                "h-4 w-4 transition-transform",
                sortDir === "desc" && "rotate-180"
              )} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <BoneyardTable rows={8} cols={8} />
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">{EMPTY_MESSAGES[segment].title}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {EMPTY_MESSAGES[segment].description}
            </p>
            {segment === "all" && (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Loyalty Points</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c: any) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/customers/${c.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <CustomerAvatar name={c.name} />
                        <span className="font-medium text-sm">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.phone || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{c.visitCount ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.lastVisit
                        ? new Date(c.lastVisit).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatCurrency(c.totalSpent ?? 0)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="secondary" className="font-mono">
                        {c.loyaltyPoints ?? 0} pts
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).slice(0, 2).map((t: string) => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5">
                            {t}
                          </Badge>
                        ))}
                        {(c.tags?.length ?? 0) > 2 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{c.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/customers/${c.id}`);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}

        <CreateCustomerDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            toast.success("Customer created successfully");
          }}
        />
      </div>
    </FeatureGate>
  );
}

function CreateCustomerDialog({
  open, onOpenChange, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tenant/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone, email, gender, dob }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create customer");
      onSuccess();
      onOpenChange(false);
      setName("");
      setPhone("");
      setEmail("");
      setGender("");
      setDob("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>
            Enter the customer&apos;s details to create a new profile.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-phone">Phone</Label>
            <Input
              id="c-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="c-gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="c-gender">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-dob">Date of Birth</Label>
              <Input
                id="c-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
