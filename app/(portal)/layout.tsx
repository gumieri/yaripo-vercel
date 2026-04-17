import Link from "next/link"
import { auth, signOut } from "@/lib/auth/server"
import { Mountain } from "lucide-react"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50 border-b">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Mountain className="h-6 w-6 text-primary" />
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
                  Sair
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
            >
              Entrar
            </Link>
          )}
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
