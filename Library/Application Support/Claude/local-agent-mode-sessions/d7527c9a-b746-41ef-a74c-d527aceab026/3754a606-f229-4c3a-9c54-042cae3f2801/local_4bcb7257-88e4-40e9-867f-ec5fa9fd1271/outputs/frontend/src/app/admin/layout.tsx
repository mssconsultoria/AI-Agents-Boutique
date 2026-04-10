import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "../components/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="md:ml-60">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
