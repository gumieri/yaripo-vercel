import { auth } from "@/lib/auth/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { eventMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export default async function JudgeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const [membership] = await db
    .select()
    .from(eventMembers)
    .where(and(eq(eventMembers.userId, session.user.id), eq(eventMembers.role, "judge")))

  if (!membership) {
    redirect("/manage")
  }

  return <>{children}</>
}
