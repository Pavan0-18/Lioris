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

/**
 * Wraps API handlers with common checks:
 * - Authentication
 * - Rate limiting
 * - Permission checks
 * - User activity validation
 */
export function createApiHandler(
  handler: ApiHandler,
  options: ApiHandlerOptions
) {
  return async (req: Request) => {
    try {
      // 1. Get tenant context (auth check)
      const { tenantId, userId, role, tenant } = await getTenantFromSession();

      // 2. Verify user is active
      await verifyUserActive(userId, tenantId);

      // 3. Rate limiting
      if (options.rateLimit !== false) {
        const { success } = await apiRateLimit.limit(tenantId);
        if (!success) {
          return apiError("Too many requests", "RATE_LIMITED", 429);
        }
      }

      // 4. Permission check
      if (options.requiredPermission) {
        assertPermission(role as Role, options.requiredPermission);
      }

      // 5. Call handler with auth context
      const result = await handler(req, {
        ...options,
        auth: { tenantId, userId, role: role as Role },
      });

      return result;
    } catch (err: any) {
      // Handle known error codes
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

      // Log unexpected errors
      console.error("[API Error]", err);
      return apiError("Internal server error", "INTERNAL_ERROR", 500);
    }
  };
}

/**
 * Create a simple wrapper that just adds auth context
 */
export function withAuth(handler: ApiHandler) {
  return createApiHandler(handler, { method: "GET" });
}

/**
 * Create a wrapper with permission check
 */
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
