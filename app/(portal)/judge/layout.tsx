import { auth } from "@/lib/auth/server"
import { redirect } from "next/navigation"

export default async function JudgeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user || session.user.role !== "judge") {
    redirect("/login")
  }

  return <>{children}</>
}
