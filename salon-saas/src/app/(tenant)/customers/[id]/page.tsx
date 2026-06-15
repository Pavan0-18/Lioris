"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Copy, Check, Phone, Mail,
  Plus, X, Pencil, Clock, DollarSign, Award,
  Calendar, ExternalLink, Camera, Send, History, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { cn, formatCurrency } from "@/lib/utils";
import { FeatureGate } from "@/components/feature-gate";
import { RoleGate } from "@/components/ui/role-gate";
import { BoneyardPage, BoneyardTable } from "@/components/ui/boneyard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string): string {
  return name?.split(" ").map((n) => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) ?? "??";
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

function CustomerAvatar({ name, imageUrl, size = "h-16 w-16", onUpload }: { name: string; imageUrl?: string | null; size?: string; onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="relative group">
      <Avatar className={cn(size, "ring-2 ring-border")}>
        {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
        <AvatarFallback className={cn("text-lg font-semibold", getAvatarColor(name))}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {onUpload && (
        <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
          <Camera className="h-5 w-5 text-white" />
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success("Copied to clipboard"); setTimeout(() => setCopied(false), 1500); }}
      className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function SegmentBadge({ visitCount, lastVisit }: { visitCount: number; lastVisit: string | null }) {
  if (!visitCount || visitCount === 0) return <Badge variant="secondary">New</Badge>;
  if (lastVisit) {
    const daysSince = Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 90) return <Badge variant="outline">Inactive</Badge>;
  }
  if (visitCount >= 3) return <Badge variant="success">Repeat</Badge>;
  return <Badge variant="default">Active</Badge>;
}

const QUICK_TAGS = ["VIP", "Allergy", "Prefers morning"];

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState("visits");
  const [editOpen, setEditOpen] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [notesInitial, setNotesInitial] = React.useState("");
  const [visitPage, setVisitPage] = React.useState(1);
  const [sendOpen, setSendOpen] = React.useState(false);

  const { data: customerData, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => fetch(`/api/tenant/customers/${id}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const customer = customerData?.data;

  React.useEffect(() => {
    if (customer?.notes !== undefined) {
      setNotes(customer.notes ?? "");
      setNotesInitial(customer.notes ?? "");
    }
  }, [customer?.notes]);

  const { data: visitsData, isLoading: visitsLoading } = useQuery({
    queryKey: ["customer-visits", id, visitPage],
    queryFn: () => fetch(`/api/tenant/customers/${id}/visits?page=${visitPage}&limit=10`).then((r) => r.json()),
    staleTime: 30_000,
    enabled: activeTab === "visits",
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["customer-activity", id],
    queryFn: () => fetch(`/api/tenant/customers/${id}/activity`).then((r) => r.json()),
    staleTime: 30_000,
    enabled: activeTab === "activity",
  });

  const visits = visitsData?.data?.visits ?? [];
  const visitsTotal = visitsData?.data?.total ?? 0;
  const visitsPages = Math.ceil(visitsTotal / 10);
  const activityLogs = activityData?.data ?? [];

  const invalidateCustomer = () => queryClient.invalidateQueries({ queryKey: ["customer", id] });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await fetch(`/api/tenant/customers/${id}/avatar`, { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Avatar updated");
      invalidateCustomer();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddTag = async (tag: string) => {
    const tagName = tag.trim();
    if (!tagName) return;
    try {
      const res = await fetch(`/api/tenant/customers/${id}/tags`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tag: tagName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add tag");
      toast.success(`Tag "${tagName}" added`);
      setTagInput("");
      invalidateCustomer();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      const res = await fetch(`/api/tenant/customers/${id}/tags?tag=${encodeURIComponent(tag)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to remove tag");
      toast.success(`Tag "${tag}" removed`);
      invalidateCustomer();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveNotes = async () => {
    if (notes === notesInitial) return;
    try {
      const res = await fetch(`/api/tenant/customers/${id}/notes`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save notes");
      setNotesInitial(notes);
      toast.success("Notes saved");
    } catch (err: any) { toast.error(err.message); }
  };

  const monthlySpending = React.useMemo(() => {
    const map: Record<string, number> = {};
    customer?.recentInvoices?.forEach((inv: any) => {
      const key = format(new Date(inv.createdAt), "MMM yy");
      map[key] = (map[key] ?? 0) + inv.total;
    });
    return Object.entries(map).sort((a, b) => {
      const [ma, ya] = a[0].split(" ");
      const [mb, yb] = b[0].split(" ");
      return Number(ya) - Number(yb) || "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(ma) -
        "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(mb);
    });
  }, [customer?.recentInvoices]);

  const topServices = React.useMemo(() => {
    const map: Record<string, number> = {};
    customer?.recentInvoices?.forEach((inv: any) => {
      inv.items?.forEach((item: any) => {
        const name = item.serviceName ?? item.name ?? "Unknown";
        map[name] = (map[name] ?? 0) + (item.quantity ?? 1);
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [customer?.recentInvoices]);

  const avgSpend = customer?.visitCount > 0 ? (customer.totalSpent ?? 0) / customer.visitCount : 0;

  if (isLoading) {
    return <FeatureGate feature="CRM"><BoneyardPage /></FeatureGate>;
  }

  if (!customer) {
    return (
      <FeatureGate feature="CRM">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold">Customer not found</p>
          <p className="text-sm text-muted-foreground mt-1">The customer you are looking for does not exist or has been deleted.</p>
          <Button asChild className="mt-4"><Link href="/customers">Back to Customers</Link></Button>
        </div>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate feature="CRM">
      <div className="space-y-6">
        <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <CustomerAvatar name={customer.name} imageUrl={customer.imageUrl} onUpload={handleAvatarUpload} />
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{customer.name}</h2>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                {customer.phone && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone}
                    <CopyButton text={customer.phone} />
                  </span>
                )}
                {customer.email && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                    <CopyButton text={customer.email} />
                  </span>
                )}
                <SegmentBadge visitCount={customer.visitCount} lastVisit={customer.lastVisit} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSendOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button asChild>
              <Link href={`/appointments?customerId=${id}`}>
                <Calendar className="h-4 w-4 mr-2" />
                Book Appointment
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{customer.visitCount ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{formatCurrency(customer.totalSpent ?? 0)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
              <Award className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{customer.loyaltyPoints ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Member Since</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customer.createdAt ? format(new Date(customer.createdAt), "MMM yyyy") : "—"}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Tags</h3>
            <div className="flex flex-wrap items-center gap-2">
              {(customer.tags ?? []).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex items-center gap-1">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(tagInput); } }}
                  placeholder="Add tag..." className="h-7 w-28 text-xs" />
                <Button variant="ghost" size="icon-sm" onClick={() => handleAddTag(tagInput)} disabled={!tagInput.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-muted-foreground mr-1">Quick add:</span>
              {QUICK_TAGS.map((t) => (
                <button key={t} type="button" onClick={() => handleAddTag(t)}
                  className="text-xs px-2 py-0.5 rounded-full border border-border hover:bg-accent transition-colors">
                  +{t}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2">Notes</h3>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={handleSaveNotes}
              placeholder="Add notes about this customer..." className="min-h-[80px]" />
            <p className="text-xs text-muted-foreground mt-1">Notes auto-save when you click away.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="visits">Visit History</TabsTrigger>
            <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
            <TabsTrigger value="analytics">Spending Analytics</TabsTrigger>
            <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="visits" className="space-y-4">
            {visitsLoading ? (
              <BoneyardTable rows={5} cols={5} />
            ) : visits.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium">No visit history</p>
                <p className="text-xs text-muted-foreground mt-1">This customer has not visited yet.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-sm whitespace-nowrap">{format(new Date(v.date ?? v.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-sm">{v.services?.length > 0 ? v.services.map((s: any) => s.name ?? s).join(", ") : "—"}</TableCell>
                        <TableCell className="text-sm">{v.staffName ?? "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{formatCurrency(v.amount ?? 0)}</TableCell>
                        <TableCell>
                          <Badge variant={v.invoiceStatus === "paid" || v.invoiceStatus === "completed" ? "success" : v.invoiceStatus === "pending" ? "warning" : "secondary"} className="text-[10px]">
                            {v.invoiceStatus ?? "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {v.invoiceId ? (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/invoices/${v.invoiceId}`}><ExternalLink className="h-3.5 w-3.5 mr-1" />View</Link>
                            </Button>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {visitsPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">Page {visitPage} of {visitsPages}</p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={visitPage <= 1} onClick={() => setVisitPage((p) => p - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={visitPage >= visitsPages} onClick={() => setVisitPage((p) => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-6">
            <FeatureGate feature="LOYALTY">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                    <CardDescription>Loyalty points available</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold tracking-tight">{customer.loyaltyPoints ?? 0}</div>
                    <p className="text-sm text-muted-foreground mt-2">≈ {formatCurrency((customer.loyaltyPoints ?? 0) * 0.5)} equivalent value</p>
                  </CardContent>
                </Card>
                <RoleGate role="OWNER">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Manual Adjustment</CardTitle>
                      <CardDescription>Add or deduct points</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <LoyaltyAdjustment customerId={id} onSuccess={invalidateCustomer} />
                    </CardContent>
                  </Card>
                </RoleGate>
              </div>
            </FeatureGate>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Average Spend per Visit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{formatCurrency(avgSpend)}</div>
                  <p className="text-sm text-muted-foreground mt-1">Across {customer.visitCount ?? 0} visit{customer.visitCount !== 1 ? "s" : ""}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Spent (All Time)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{formatCurrency(customer.totalSpent ?? 0)}</div>
                  <p className="text-sm text-muted-foreground mt-1">Lifetime value</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlySpending.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No invoice data available yet.</p>
                ) : (
                  <div className="space-y-3">
                    {monthlySpending.map(([month, amount]) => (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-20 shrink-0">{month}</span>
                        <div className="flex-1 h-6 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 transition-all"
                            style={{ width: `${(amount / Math.max(...monthlySpending.map(([, a]) => a))) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-24 text-right shrink-0">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top Services</CardTitle>
              </CardHeader>
              <CardContent>
                {topServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No service data available.</p>
                ) : (
                  <div className="space-y-3">
                    {topServices.map(([name, count], i) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}.</span>
                        <span className="flex-1 text-sm">{name}</span>
                        <Badge variant="secondary" className="font-mono">{count} visit{count !== 1 ? "s" : ""}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {activityLoading ? (
              <BoneyardTable rows={5} cols={3} />
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium">No activity yet</p>
                <p className="text-xs text-muted-foreground mt-1">Customer activity and changes will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="w-2 h-2 mt-1.5 rounded-full shrink-0 bg-primary/50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.action} — {log.entityType}</p>
                      <p className="text-xs text-muted-foreground">{log.description || "No details"}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <EditCustomerDialog open={editOpen} onOpenChange={setEditOpen} customer={customer}
          onSuccess={() => { invalidateCustomer(); toast.success("Customer updated"); }} />

        <SendMessageDialog open={sendOpen} onOpenChange={setSendOpen} customer={customer} />
      </div>
    </FeatureGate>
  );
}

function LoyaltyAdjustment({ customerId, onSuccess }: { customerId: string; onSuccess: () => void }) {
  const [points, setPoints] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(points);
    if (!num || !reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenant/customers/${customerId}/loyalty`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adjustment: num, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Adjustment failed");
      toast.success(`Points adjusted by ${num}`);
      setPoints(""); setReason(""); onSuccess();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="adj-points">Points (+/-)</Label>
        <Input id="adj-points" type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="e.g. 50 or -20" required />
      </div>
      <div>
        <Label htmlFor="adj-reason">Reason</Label>
        <Input id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Birthday bonus" required />
      </div>
      <Button type="submit" disabled={submitting || !points || !reason.trim()}>{submitting ? "Applying..." : "Apply Adjustment"}</Button>
    </form>
  );
}

function EditCustomerDialog({ open, onOpenChange, customer, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; customer: any; onSuccess: () => void }) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (customer && open) {
      setName(customer.name ?? "");
      setPhone(customer.phone ?? "");
      setEmail(customer.email ?? "");
      setGender(customer.gender ?? "");
      setDob(customer.dob ? customer.dob.split("T")[0] : "");
    }
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenant/customers/${customer.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), phone, email, gender, dob }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update customer");
      onSuccess(); onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Edit Customer</DialogTitle><DialogDescription>Update customer details.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-name">Name <span className="text-destructive">*</span></Label>
            <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2"><Label htmlFor="e-phone">Phone</Label><Input id="e-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="e-email">Email</Label><Input id="e-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="e-gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="e-gender"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="e-dob">Date of Birth</Label><Input id="e-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !name.trim()}>{submitting ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SendMessageDialog({ open, onOpenChange, customer }: { open: boolean; onOpenChange: (v: boolean) => void; customer: any }) {
  const [type, setType] = React.useState<"email" | "sms">("email");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tenant/customers/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds: [customer.id], type, subject, message: message.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Message sent via ${type}`);
      onOpenChange(false); setMessage(""); setSubject("");
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Send Message to {customer.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={type === "email" ? "default" : "outline"} onClick={() => setType("email")} disabled={!customer.email}>
              <Mail className="h-3.5 w-3.5 mr-1.5" />Email
            </Button>
            <Button type="button" size="sm" variant={type === "sms" ? "default" : "outline"} onClick={() => setType("sms")} disabled={!customer.phone}>
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />SMS
            </Button>
          </div>
          {type === "email" && (
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
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
