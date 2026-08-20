export const API_SCOPES = [
  "customers:read",
  "customers:write",
  "appointments:read",
  "appointments:write",
  "invoices:read",
  "invoices:write",
  "entities:read",
  "entities:write",
  "webhooks:read",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export function requireScope(scopes: readonly string[], required: string): boolean {
  return scopes.includes(required);
}

export function assertScope(scopes: readonly string[], required: string): void {
  if (!requireScope(scopes, required)) {
    const error = new Error(`Missing scope: ${required}`) as any;
    error.code = "FORBIDDEN";
    throw error;
  }
}