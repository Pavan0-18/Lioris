"use client";
import React from "react";
import { FeatureGate } from "@/components/feature-gate";
import { AppointmentCalendar } from "@/components/appointments/calendar";

export default function AppointmentsPage() {
  return (
    <FeatureGate feature="APPOINTMENTS">
      <AppointmentCalendar />
    </FeatureGate>
  );
}
