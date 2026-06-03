"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Search, Users, ArrowUpDown, X, Download, Upload, Tag, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn, formatCurrency } from "@/lib/utils";
import { FeatureGate } from "@/components/feature-gate";
import { BoneyardTable } from "@/components/ui/boneyard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

function CustomerAvatar({ name, imageUrl, className }: { name: string; imageUrl?: string | null; className?: string }) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
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
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">...</span>
          ) : (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="min-w-[2rem]" onClick={() => onPageChange(p)}>{p}</Button>
          )
        )}
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
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
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = React.useState(false);
  const [bulkTagOpen, setBulkTagOpen] = React.useState(false);
  const [bulkSendOpen, setBulkSendOpen] = React.useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const queryKey = ["customers", segment, debouncedSearch, sortBy, sortDir, page];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ segment, search: debouncedSearch, sortBy, sortDir, page: String(page), limit: String(LIMIT) });
      return fetch(`/api/tenant/customers?${params.toString()}`).then((r) => r.json());
    },
    staleTime: 30_000,
  });

  const customers = data?.data?.customers ?? [];
  const total = data?.data?.total ?? 0;
  const counts = data?.data?.counts ?? { all: 0, new: 0, repeat: 0, inactive: 0 };

  const handleSegmentChange = (s: Segment) => { setSegment(s); setPage(1); };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); };
  const toggleSortDir = () => { setSortDir((d) => (d === "asc" ? "desc" : "asc")); setPage(1); };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c: any) => c.id)));
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/tenant/customers/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ["customers"] });

  return (
    <FeatureGate feature="CRM">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
            <p className="text-sm text-muted-foreground">Manage your customer relationships and loyalty.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-fit">
          {SEGMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => handleSegmentChange(s.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                segment === s.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{counts[s.value]}</Badge>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or phone..." value={search} onChange={handleSearchChange} className="pl-9" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortField); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <ArrowUpDown className="h-3 w-3 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={toggleSortDir} className="h-10 w-10" title={sortDir === "asc" ? "Ascending" : "Descending"}>
              <ArrowUpDown className={cn("h-4 w-4 transition-transform", sortDir === "desc" && "rotate-180")} />
            </Button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => setBulkTagOpen(true)}>
              <Tag className="h-3.5 w-3.5 mr-1.5" />
              Add Tag
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkSendOpen(true)}>
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Send Message
            </Button>
            <Button size="sm" variant="destructive" onClick={async () => {
              if (!confirm(`Delete ${selectedIds.size} customers?`)) return;
              try {
                const res = await fetch("/api/tenant/customers/bulk/delete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: Array.from(selectedIds) }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error);
                toast.success(`${json.data?.deleted} customers deleted`);
                setSelectedIds(new Set());
                invalidateList();
              } catch (err: any) { toast.error(err.message); }
            }}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        )}

        {isLoading ? (
          <BoneyardTable rows={8} cols={8} />
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">{EMPTY_MESSAGES[segment].title}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">{EMPTY_MESSAGES[segment].description}</p>
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
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={customers.length > 0 && selectedIds.size === customers.length}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </TableHead>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <CustomerAvatar name={c.name} imageUrl={c.imageUrl} />
                        <span className="font-medium text-sm">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-sm">{c.visitCount ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(c.totalSpent ?? 0)}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="secondary" className="font-mono">{c.loyaltyPoints ?? 0} pts</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).slice(0, 2).map((t: string) => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5">{t}</Badge>
                        ))}
                        {(c.tags?.length ?? 0) > 2 && (
                          <span className="text-[10px] text-muted-foreground self-center">+{c.tags.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/customers/${c.id}`); }}>
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

        <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => { invalidateList(); toast.success("Customer created successfully"); }} />

        <ImportCSVDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={() => { invalidateList(); }} />

        <BulkTagDialog
          open={bulkTagOpen}
          onOpenChange={setBulkTagOpen}
          selectedIds={Array.from(selectedIds)}
          onSuccess={() => { invalidateList(); setSelectedIds(new Set()); }}
        />

        <BulkSendDialog
          open={bulkSendOpen}
          onOpenChange={setBulkSendOpen}
          customerIds={Array.from(selectedIds)}
          onSuccess={() => { setBulkSendOpen(false); }}
        />
      </div>
    </FeatureGate>
  );
}

function CreateCustomerDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
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
      setName(""); setPhone(""); setEmail(""); setGender(""); setDob("");
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>Enter the customer&apos;s details to create a new profile.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Name <span className="text-destructive">*</span></Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-phone">Phone</Label>
            <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="c-gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="c-gender"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-dob">Date of Birth</Label>
              <Input id="c-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !name.trim()}>{submitting ? "Creating..." : "Create Customer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportCSVDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<{ imported: number; skipped: number; errors?: string[] } | null>(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/tenant/customers/import", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json.data);
      if (json.data?.imported > 0) onSuccess();
    } catch (err: any) { toast.error(err.message); }
    finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setFile(null); setResult(null); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file with Name, Phone, Email, Gender, DOB, Address, Notes, Tags columns.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3 py-4">
            <p className="text-sm font-medium">Import complete</p>
            <p className="text-sm text-muted-foreground">Imported: {result.imported}</p>
            <p className="text-sm text-muted-foreground">Skipped (duplicates/errors): {result.skipped}</p>
            {result.errors && (
              <div className="text-xs text-red-500 space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-muted-foreground">CSV must include <strong>Name</strong> and <strong>Phone</strong> columns.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={!file || importing}>{importing ? "Importing..." : "Import"}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BulkTagDialog({ open, onOpenChange, selectedIds, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; selectedIds: string[]; onSuccess: () => void }) {
  const [tag, setTag] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim() || !selectedIds.length) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tenant/customers/bulk/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, tag: tag.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Tag "${tag}" added to ${json.data?.updated} customers`);
      setTag("");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader><DialogTitle>Add Tag to {selectedIds.length} Customers</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. VIP, Allergy" required />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !tag.trim()}>{submitting ? "Adding..." : "Add Tag"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkSendDialog({ open, onOpenChange, customerIds, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; customerIds: string[]; onSuccess: () => void }) {
  const [type, setType] = React.useState<"email" | "sms">("email");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !customerIds.length) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tenant/customers/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds, type, subject, message: message.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Message sent to ${json.data?.sent} customers`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Send Message to {customerIds.length} Customers</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={type === "email" ? "default" : "outline"} onClick={() => setType("email")}>Email</Button>
            <Button type="button" size="sm" variant={type === "sms" ? "default" : "outline"} onClick={() => setType("sms")}>SMS</Button>
          </div>
          {type === "email" && (
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" />
          )}
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." rows={4} required />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !message.trim()}>{submitting ? "Sending..." : "Send"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
