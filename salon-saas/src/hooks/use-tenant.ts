import { useSession } from "next-auth/react";

export function useTenant() {
  const { data: session } = useSession();
  const user = session?.user;

  return {
    tenantId: user?.tenantId || null,
    role: user?.role || null,
    tenantSlug: user?.tenantSlug || null,
    userId: user?.id || null,
    name: user?.name || null
  };
}
