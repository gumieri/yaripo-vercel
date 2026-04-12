import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-8">
      <AdminNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
