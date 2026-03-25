import type { SessionUser } from "@/lib/auth";

export function canAccessAdminPage(role: SessionUser["role"]) {
  return role === "ADMIN" || role === "DEVELOPER";
}

export function isOperator(role: SessionUser["role"]) {
  return role === "ADMIN";
}
