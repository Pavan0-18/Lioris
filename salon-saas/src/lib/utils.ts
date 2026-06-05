import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toZonedTime, format } from "date-fns-tz";
import { createId } from "@paralleldrive/cuid2";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "INR", locale: string = "en-IN") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatInTimezone(date: Date | string, timezone: string, formatStr: string = "yyyy-MM-dd HH:mm:ss") {
  const d = typeof date === "string" ? new Date(date) : date;
  const zoned = toZonedTime(d, timezone);
  return format(zoned, formatStr, { timeZone: timezone });
}

export function apiError(message: string, code: string, status: number = 400) {
  return Response.json({ error: message, code }, { status });
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return Response.json({ data }, { status });
}

export function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") + "-" + createId().slice(0, 4);
}

export function generateInvoiceNo(slug: string, year: number, seq: number) {
  return `${slug.toUpperCase()}-${year}-${String(seq).padStart(4, "0")}`;
}

export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset } as const;
}


