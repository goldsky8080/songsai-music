import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canAccessAdminPage } from "@/server/auth/guards";
import AdminPageClient from "@/app/admin/AdminPageClient";

export default async function AdminPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdminPage(sessionUser.role)) {
    redirect("/");
  }

  return <AdminPageClient />;
}
