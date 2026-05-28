import { getTenantFromSession } from "@/lib/tenant-context";
import { getTenantFeatures } from "@/lib/feature-gate";
import { apiSuccess, apiErrorFromException } from "@/lib/utils/response";

export async function GET() {
  try {
    const { tenantId } = await getTenantFromSession();
    const featureKeys = await getTenantFeatures(tenantId);
    return apiSuccess({ features: featureKeys });
  } catch (err) {
    return apiErrorFromException(err);
  }
}
