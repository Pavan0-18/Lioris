import { inngest } from "../client";
import { db } from "@/lib/db";
import { products, notifications, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getProductStock } from "@/lib/inventory";

export const lowStockAlertFn = inngest.createFunction(
  {
    id: "low-stock-alert",
    name: "Low Stock Alert - Daily Check",
    retries: 2,
  },
  { cron: "0 8 * * *" },
  async ({ step }) => {
    const allProducts = await step.run("fetch-all-products", async () => {
      return db
        .select({ id: products.id, tenantId: products.tenantId, name: products.name, reorderLevel: products.reorderLevel })
        .from(products)
        .where(eq(products.isActive, true));
    });

    const tenantProductMap = new Map<string, { id: string; name: string; reorderLevel: number }[]>();
    for (const p of allProducts) {
      const list = tenantProductMap.get(p.tenantId) || [];
      list.push(p);
      tenantProductMap.set(p.tenantId, list);
    }

    const tenants = Array.from(tenantProductMap.entries());

    for (const [tenantId, productList] of tenants) {
      await step.run(`check-tenant-${tenantId.slice(0, 8)}`, async () => {
        const alerts: { productId: string; productName: string; stock: number; reorderLevel: number }[] = [];

        for (const product of productList) {
          const stock = await getProductStock(tenantId, product.id);
          if (product.reorderLevel > 0 && stock <= product.reorderLevel) {
            alerts.push({
              productId: product.id,
              productName: product.name,
              stock,
              reorderLevel: product.reorderLevel,
            });
          }
        }

        if (alerts.length === 0) return { tenantId, alertsCreated: 0 };

        const tenantUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));

        for (const user of tenantUsers) {
          for (const alert of alerts) {
            const existingAlerts = await db
              .select({ id: notifications.id })
              .from(notifications)
              .where(
                and(
                  eq(notifications.tenantId, tenantId),
                  eq(notifications.userId, user.id),
                  eq(notifications.type, "low_stock"),
                  eq(notifications.metadata, alert.productId),
                  eq(notifications.isRead, false)
                )
              )
              .limit(1);

            if (existingAlerts.length > 0) continue;

            const stockStatus = alert.stock === 0 ? "Out of stock" : alert.stock <= alert.reorderLevel / 2 ? "Critical" : "Low";

            await db.insert(notifications).values({
              tenantId,
              userId: user.id,
              type: "low_stock",
              title: `${stockStatus}: ${alert.productName}`,
              message: `${alert.productName} has only ${alert.stock} units remaining (reorder level: ${alert.reorderLevel}).`,
              link: "/inventory/products",
              metadata: alert.productId,
            });
          }
        }

        return { tenantId, alertsCreated: alerts.length };
      });
    }

    return { processed: true, tenantCount: tenants.length };
  }
);
