import { appointmentEventBus } from "@/lib/appointment-events";
import { getTenantFromSession } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { tenantId } = await getTenantFromSession();

  const stream = new ReadableStream({
    start(controller) {
      const handler = (data: any) => {
        if (data.tenantId === tenantId) {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        }
      };

      appointmentEventBus.on("appointment:changed", handler);

      const keepAlive = setInterval(() => {
        controller.enqueue(":\n\n");
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        appointmentEventBus.off("appointment:changed", handler);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
