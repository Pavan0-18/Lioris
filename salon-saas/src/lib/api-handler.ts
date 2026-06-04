import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/utils";
import { assertPermission, verifyUserActive, type AuthContext } from "@/lib/auth-utils";
import { type Role } from "@/lib/permissions";

interface ApiHandlerOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  requiredPermission?: string;
  rateLimit?: boolean;
}

export type ApiHandler<T = any> = (
  req: Request,
  context: ApiHandlerOptions & { auth: AuthContext }
) => Promise<T>;

export function getRouteId(req: Request): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1];
}

export function createApiHandler(
  handler: ApiHandler,
  options: ApiHandlerOptions
) {
  return async (req: Request) => {
    try {
      const { tenantId, userId, role, tenant } = await getTenantFromSession();

      await verifyUserActive(userId, tenantId);

      if (options.rateLimit !== false) {
        const { success } = await apiRateLimit.limit(tenantId);
        if (!success) {
          return apiError("Too many requests", "RATE_LIMITED", 429);
        }
      }

      if (options.requiredPermission) {
        assertPermission(role as Role, options.requiredPermission);
      }

      const result = await handler(req, {
        ...options,
        auth: { tenantId, userId, role: role as Role },
      });

      return result;
    } catch (err: any) {
      if (err.code === "RATE_LIMITED") {
        return apiError(err.message, err.code, 429);
      }
      if (err.code === "FORBIDDEN") {
        return apiError(err.message, err.code, 403);
      }
      if (err.code === "UNAUTHORIZED") {
        return apiError(err.message, err.code, 401);
      }
      if (err.code === "NOT_FOUND") {
        return apiError(err.message, err.code, 404);
      }
      if (err.code === "INVALID_INPUT") {
        return apiError(err.message, err.code, 400);
      }

      console.error("[API Error]", err);
      return apiError("Internal server error", "INTERNAL_ERROR", 500);
    }
  };
}

export function withAuth(handler: ApiHandler) {
  return createApiHandler(handler, { method: "GET" });
}

export function withPermission(
  handler: ApiHandler,
  permission: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "POST"
) {
  return createApiHandler(handler, {
    method,
    requiredPermission: permission,
  });
}
