import { EventEmitter } from "events";

export const appointmentEventBus = new EventEmitter();
appointmentEventBus.setMaxListeners(200);

export interface AppointmentChangeEvent {
  tenantId: string;
  action: "created" | "updated" | "status_changed" | "deleted";
  appointmentId: string;
  timestamp: string;
}

export function notifyAppointmentChange(data: AppointmentChangeEvent) {
  appointmentEventBus.emit("appointment:changed", data);
}
