"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { isFieldVisible } from "@/lib/forms/engine";

function FieldInput({ field, value, onChange }: any) {
  const common = {
    value: value ?? "",
    onChange: (e: any) => onChange(e.target.value),
    placeholder: field.placeholder ?? undefined,
  };

  switch (field.type) {
    case "textarea":
      return <Textarea {...common} />;
    case "boolean":
      return (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox checked={value === true} onCheckedChange={(checked) => onChange(checked === true)} />
          <span className="text-sm text-muted-foreground">Yes</span>
        </div>
      );
    case "select":
      return (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {(field.options?.choices ?? []).map((c: any) => {
              const v = typeof c === "object" ? c.value : c;
              return <SelectItem key={v} value={v}>{v}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      );
    case "number":
    case "currency":
    case "percentage":
    case "rating":
      return <Input type="number" step="any" {...common} />;
    case "date":
      return <Input type="date" {...common} />;
    case "datetime":
      return <Input type="datetime-local" {...common} />;
    case "email":
      return <Input type="email" {...common} />;
    case "url":
      return <Input type="url" {...common} />;
    case "json":
      return <Textarea {...common} className="font-mono" />;
    default:
      return <Input {...common} />;
  }
}

export default function FormRunnerPage() {
  const params = useParams<{ key: string; id: string }>();
  const router = useRouter();
  const entityKey = params.key;
  const formId = params.id;

  const [values, setValues] = React.useState<Record<string, any>>({});
  const [submitted, setSubmitted] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["entity-form", entityKey, formId],
    queryFn: async () => {
      const res = await fetch(`/api/tenant/entities/${entityKey}/forms/${formId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tenant/entities/${entityKey}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: (json) => {
      toast.success("Record saved");
      setSubmitted(json.data?.id ?? json.data?._title ?? "saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <BoneyardPage />;

  const form = data?.form;
  const fields: any[] = data?.fields ?? [];
  if (!form) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/entities/${entityKey}`)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <p className="mt-4 text-muted-foreground">Form not found.</p>
      </div>
    );
  }

  const layout = form.layout ?? { sections: [] };
  const fieldMap = new Map(fields.map((f) => [f.key, f]));

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <h2 className="text-xl font-bold">Record submitted</h2>
            <p className="text-sm text-muted-foreground">{form.config?.successMessage ?? "Your record has been saved successfully."}</p>
            <Button
              onClick={() => {
                setValues({});
                setSubmitted(null);
              }}
            >
              Submit another
            </Button>
            <Button variant="outline" onClick={() => router.push(`/entities/${entityKey}`)}>
              View records
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const setField = (key: string, value: any) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Button variant="ghost" size="sm" onClick={() => router.push(`/entities/${entityKey}`)}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to records
      </Button>

      <Card className="mt-3">
        <CardHeader>
          <CardTitle>{form.name}</CardTitle>
          {form.description && <CardDescription>{form.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          {layout.sections.map((section: any, si: number) => (
            <div key={section.id}>
              {si > 0 && <Separator className="my-4" />}
              <h3 className="text-sm font-semibold mb-3">{section.title || `Section ${si + 1}`}</h3>
              <div className="grid gap-4">
                {section.fields.map((placement: any) => {
                  const field = fieldMap.get(placement.key);
                  if (!field) return null;
                  if (!isFieldVisible(placement, values)) return null;
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label>
                        {placement.label ?? field.label}
                        {placement.required === true && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <FieldInput field={field} value={values[field.key]} onChange={(v: any) => setField(field.key, v)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <Button
            className="w-full"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {form.config?.submitLabel ?? "Submit"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}