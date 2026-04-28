import { Link } from "@/i18n/routing"
import { auth, signOut } from "@/lib/auth/server"
import { Mountain } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const t = await getTranslations("Portal")

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border/50 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-lg">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-foreground flex items-center gap-2 text-xl font-bold">
            <Mountain className="text-primary h-6 w-6" />
            <span>
              Yari<span className="text-primary">po</span>
            </span>
          </Link>
          {session?.user ? (
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">{session.user.name}</span>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <button
                  type="submit"
                  className="border-border hover:bg-secondary text-muted-foreground rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                >
                  {t("signOut")}
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
            >
              {t("enter")}
            </Link>
          )}
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
