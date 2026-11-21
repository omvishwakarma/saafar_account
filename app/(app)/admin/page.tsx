import { redirect } from "next/navigation";
import { AdminDesk } from "@/components/AdminDesk";
import { PageHeader } from "@/components/ui";
import { listAudit } from "@/lib/audit";
import { currentUser } from "@/lib/current-user";
import { listUsers } from "@/lib/users";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user || user.role !== "admin") redirect("/");
  const [users, logs] = await Promise.all([listUsers(), listAudit()]);
  return (
    <div>
      <PageHeader
        eyebrow="Saafar admin"
        title="Users and log"
        sub="Create a username and password for each consultant. The log records who signed in and what they changed in the books."
      />
      <AdminDesk users={users} logs={logs} />
    </div>
  );
}
