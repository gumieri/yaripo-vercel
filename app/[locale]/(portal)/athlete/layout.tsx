import { auth } from "@/lib/auth/server"
import { redirect } from "next/navigation"

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return <>{children}</>
}
