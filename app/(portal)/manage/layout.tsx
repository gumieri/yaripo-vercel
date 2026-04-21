import { auth } from "@/lib/auth/server"
import { ManageNav } from "@/components/manage/nav"
import { redirect } from "next/navigation"

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-8">
      <ManageNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
