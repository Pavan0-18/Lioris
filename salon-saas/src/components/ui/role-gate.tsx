"use client";
import React from "react";
import { useTenant } from "@/hooks/use-tenant";
import { type Role, can } from "@/lib/permissions";

interface RoleGateProps {
  role?: Role | Role[];
  permission?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGate({ role, permission, fallback = null, children }: RoleGateProps) {
  const { role: userRole } = useTenant();

  if (!userRole) return null;

  const hasRole = role
    ? (Array.isArray(role) ? role.includes(userRole as Role) : userRole === role)
    : true;

  const hasPermission = permission
    ? can(userRole as Role, permission as any)
    : true;

  if (!hasRole || !hasPermission) return <>{fallback}</>;

  return <>{children}</>;
}
