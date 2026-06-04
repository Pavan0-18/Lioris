import { db } from "@/lib/db";
import {
  workingHours, branchHolidays, appointments, staffServices, staff,
} from "@/lib/db/schema";
import { eq, and, ne, gte, lte, inArray } from "drizzle-orm";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { addMinutes } from "date-fns";

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  conflictReason?: string;
}

export interface AvailabilityResult {
  slots: TimeSlot[];
  isHoliday: boolean;
  workingHours: { openTime: string; closeTime: string } | null;
}

export async function getAvailableSlots({
  tenantId,
  branchId,
  date,
  durationMins,
  staffId,
  timezone,
}: {
  tenantId: string;
  branchId: string;
  date: string;
  durationMins: number;
  staffId?: string;
  timezone: string;
}): Promise<AvailabilityResult> {
  const dateObj = new Date(`${date}T00:00:00.000Z`);

  const holiday = await db.query.branchHolidays.findFirst({
    where: and(
      eq(branchHolidays.branchId, branchId),
      gte(branchHolidays.date, new Date(dateObj.setHours(0, 0, 0, 0))),
      lte(branchHolidays.date, new Date(dateObj.setHours(23, 59, 59, 999))),
    ),
  });

  if (holiday) {
    return { slots: [], isHoliday: true, workingHours: null };
  }

  const localDate = toZonedTime(new Date(`${date}T00:00:00.000Z`), timezone);
  const dayOfWeek = localDate.getDay();

  const hours = await db.query.workingHours.findFirst({
    where: and(
      eq(workingHours.branchId, branchId),
      eq(workingHours.dayOfWeek, dayOfWeek),
    ),
  });

  if (!hours || hours.isClosed) {
    return { slots: [], isHoliday: false, workingHours: null };
  }

  const [openH, openM] = hours.openTime.split(":").map(Number);
  const [closeH, closeM] = hours.closeTime.split(":").map(Number);

  const localOpen = new Date(localDate);
  localOpen.setHours(openH, openM, 0, 0);
  const localClose = new Date(localDate);
  localClose.setHours(closeH, closeM, 0, 0);

  const openUTC = fromZonedTime(localOpen, timezone);
  const closeUTC = fromZonedTime(localClose, timezone);

  const existing = await db.query.appointments.findMany({
    where: and(
      eq(appointments.tenantId, tenantId),
      eq(appointments.branchId, branchId),
      staffId ? eq(appointments.staffId, staffId) : undefined,
      ne(appointments.status, "cancelled"),
      ne(appointments.status, "no_show"),
      gte(appointments.startTime, openUTC),
      lte(appointments.endTime, addMinutes(closeUTC, 60)),
    ),
  });

  const SLOT_INTERVAL = 30;
  const slots: TimeSlot[] = [];
  let slotStart = new Date(openUTC);

  while (addMinutes(slotStart, durationMins) <= closeUTC) {
    const slotEnd = addMinutes(slotStart, durationMins);

    let conflictReason: string | undefined;
    const hasConflict = existing.some((appt) => {
      const apptStart = new Date(appt.startTime);
      const apptEnd = new Date(appt.endTime);
      return slotStart < apptEnd && slotEnd > apptStart;
    });

    if (hasConflict) {
      conflictReason = "Slot already booked";
    }

    const isPast = slotStart <= new Date();

    slots.push({
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      isAvailable: !hasConflict && !isPast,
      conflictReason: isPast ? "Time has passed" : conflictReason,
    });

    slotStart = addMinutes(slotStart, SLOT_INTERVAL);
  }

  return {
    slots,
    isHoliday: false,
    workingHours: { openTime: hours.openTime, closeTime: hours.closeTime },
  };
}

export async function findAvailableStaff({
  tenantId,
  branchId,
  serviceIds,
  startTime,
  durationMins,
}: {
  tenantId: string;
  branchId: string;
  serviceIds: string[];
  startTime: Date;
  durationMins: number;
}): Promise<string | null> {
  const { sql, count } = await import("drizzle-orm");

  const capable = await db
    .select({ staffId: staffServices.staffId, serviceCount: count() })
    .from(staffServices)
    .innerJoin(staff, eq(staffServices.staffId, staff.id))
    .where(and(
      eq(staff.tenantId, tenantId),
      eq(staff.branchId, branchId),
      eq(staff.isActive, true),
      inArray(staffServices.serviceId, serviceIds),
    ))
    .groupBy(staffServices.staffId)
    .having(({ serviceCount }) => eq(serviceCount, serviceIds.length));

  const endTime = addMinutes(startTime, durationMins);

  for (const { staffId: sid } of capable) {
    const conflict = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.staffId, sid),
        ne(appointments.status, "cancelled"),
        ne(appointments.status, "no_show"),
        lte(appointments.startTime, endTime),
        gte(appointments.endTime, startTime),
      ),
    });
    if (!conflict) return sid;
  }

  return null;
}
