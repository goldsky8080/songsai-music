import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canAccessAdminPage } from "@/server/auth/guards";
import AdminDepositsPageClient from "@/app/admin/deposits/AdminDepositsPageClient";

export default async function AdminDepositsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdminPage(sessionUser.role)) {
    redirect("/");
  }

  return <AdminDepositsPageClient />;
}
